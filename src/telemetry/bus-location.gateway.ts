import { HttpException, Logger, OnModuleDestroy, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Subscription } from 'rxjs';
import { AuthService, AuthUser } from '../auth/auth.service';
import { corsOrigins } from '../config';
import { TelemetryService } from './telemetry.service';
import { TelemetryEvents } from './telemetry.events';
import { LocationDto, StartSessionDto, SubscribeDto, VehicleDto } from './telemetry.dto';

@WebSocketGateway({ cors: { origin: corsOrigins() }, maxHttpBufferSize: 16384 })
export class BusLocationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer() server!: Server;
  private subscription?: Subscription;
  private readonly logger = new Logger(BusLocationGateway.name);
  private readonly pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  private readonly budgets = new Map<string, { window: number; count: number }>();
  constructor(
    private readonly telemetry: TelemetryService,
    private readonly auth: AuthService,
    private readonly events: TelemetryEvents,
  ) {}
  afterInit() {
    this.subscription = this.events.stream.subscribe((event) => {
      // Socket.io unions rooms, so a socket in both receives a single event.
      this.server.to('all_busses').to(`line_${event.data.busLineId}`).emit(event.name, event.data);
    });
  }
  handleConnection(socket: Socket) {
    // Passengers may connect anonymously. Driver tokens are checked on every message.
    this.budgets.set(socket.id, { window: Date.now(), count: 0 });
  }
  handleDisconnect(socket: Socket) {
    this.budgets.delete(socket.id);
    // Retain the session until its durable 30s lease expires, allowing transient network loss.
  }
  onModuleDestroy() {
    this.subscription?.unsubscribe();
  }
  private async driver(socket: Socket): Promise<AuthUser> {
    const raw: unknown = socket.handshake.auth?.token ?? socket.handshake.headers.authorization;
    if (typeof raw !== 'string')
      throw new HttpException('JWT required in handshake.auth.token', 401);
    const user = await this.auth.verifyToken(raw.replace(/^Bearer /, ''));
    if (!['driver', 'admin'].includes(user.userType))
      throw new HttpException('Driver/admin required', 403);
    return user;
  }
  private async run<T extends object>(
    socket: Socket,
    payload: unknown,
    cls: new () => T,
    action: (dto: T) => Promise<unknown>,
  ) {
    try {
      const now = Date.now();
      let budget = this.budgets.get(socket.id);
      if (!budget || now - budget.window >= 1000) {
        budget = { window: now, count: 0 };
        this.budgets.set(socket.id, budget);
      }
      if (++budget.count > 20) throw new HttpException('Message rate exceeded', 429);
      const dto = (await this.pipe.transform(payload, { type: 'body', metatype: cls })) as T;
      const data = await action(dto);
      return { ok: true, data };
    } catch (error) {
      if (!(error instanceof HttpException))
        this.logger.error(
          'WebSocket operation failed',
          error instanceof Error ? error.stack : undefined,
        );
      const detail = error instanceof HttpException ? error.getResponse() : 'Internal server error';
      const result = {
        ok: false,
        error: { status: error instanceof HttpException ? error.getStatus() : 500, detail },
      };
      socket.emit('operation:error', result.error);
      return result;
    }
  }
  @SubscribeMessage('driver:start-session')
  start(@ConnectedSocket() socket: Socket, @MessageBody() payload: unknown) {
    return this.run(socket, payload, StartSessionDto, async (dto) =>
      this.telemetry.start(await this.driver(socket), dto, socket.id),
    );
  }
  @SubscribeMessage('driver:send-location')
  location(@ConnectedSocket() socket: Socket, @MessageBody() payload: unknown) {
    return this.run(socket, payload, LocationDto, async (dto) =>
      this.telemetry.ingest(await this.driver(socket), dto, socket.id),
    );
  }
  @SubscribeMessage('driver:heartbeat')
  heartbeat(@ConnectedSocket() socket: Socket, @MessageBody() payload: unknown) {
    return this.run(socket, payload, VehicleDto, async (dto) =>
      this.telemetry.heartbeat(await this.driver(socket), dto.licensePlate, socket.id),
    );
  }
  @SubscribeMessage('driver:close-session')
  close(@ConnectedSocket() socket: Socket, @MessageBody() payload: unknown) {
    return this.run(socket, payload, VehicleDto, async (dto) =>
      this.telemetry.close(await this.driver(socket), dto.licensePlate, socket.id),
    );
  }
  @SubscribeMessage('passenger:subscribe')
  subscribe(@ConnectedSocket() socket: Socket, @MessageBody() payload: unknown) {
    return this.run(socket, payload, SubscribeDto, async (dto) => {
      for (const room of socket.rooms)
        if (room === 'all_busses' || room.startsWith('line_')) await socket.leave(room);
      const room = dto.busLineId ? `line_${dto.busLineId}` : 'all_busses';
      await socket.join(room);
      return { room, buses: await this.telemetry.current(dto.busLineId) };
    });
  }
}
