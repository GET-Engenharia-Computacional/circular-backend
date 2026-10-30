import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { BusLocationGateway } from '../src/telemetry/bus-location.gateway';
import { TelemetryService } from '../src/telemetry/telemetry.service';
import { TelemetryEvents } from '../src/telemetry/telemetry.events';
import { AuthController } from '../src/auth/auth.controller';

interface Ack {
  ok: boolean;
  data?: { room?: string; buses?: unknown };
  error?: { status: number };
}
function emit(socket: Socket, event: string, payload: unknown): Promise<Ack> {
  return new Promise((resolve, reject) =>
    socket
      .timeout(3000)
      .emit(event, payload, (error: Error | null, ack: Ack) =>
        error ? reject(error) : resolve(ack),
      ),
  );
}
describe('Socket.io transport and room isolation', () => {
  let app: INestApplication;
  let url: string;
  const events = new TelemetryEvents();
  const telemetry = {
    current: jest.fn().mockResolvedValue({}),
    start: jest.fn().mockResolvedValue({ sessionId: 'session' }),
    ingest: jest.fn(),
    syncBatch: jest.fn().mockResolvedValue({ accepted: 1 }),
    heartbeat: jest.fn().mockResolvedValue({}),
    close: jest.fn(),
  };
  const user = { id: 'driver', registrationNumber: '123', userType: 'driver' };
  let clients: Socket[] = [];
  async function connect(token?: string) {
    const socket = io(url, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      auth: token ? { token } : {},
    });
    clients.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
    });
    return socket;
  }
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BusLocationGateway,
        { provide: TelemetryService, useValue: telemetry },
        { provide: TelemetryEvents, useValue: events },
        {
          provide: AuthService,
          useValue: {
            verifyToken: jest.fn(async (token: string) => {
              if (token !== 'valid') throw new UnauthorizedException();
              return user;
            }),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });
  afterEach(() => {
    clients.forEach((socket) => socket.close());
    clients = [];
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await app?.close();
  });
  it('sync batch validates nested records and requires authenticated driver ownership', async () => {
    const payload = {
      licensePlate: 'ABC-1D23',
      records: [
        {
          position: [-43.37, -21.77],
          speed: 20,
          headingTowards: 90,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    const driver = await connect('valid');
    expect((await emit(driver, 'driver:sync-batch', payload)).ok).toBe(true);
    expect(telemetry.syncBatch).toHaveBeenCalledWith(
      user,
      expect.objectContaining(payload),
      expect.any(String),
    );
    expect(
      (
        await emit(driver, 'driver:sync-batch', {
          ...payload,
          records: [{ ...payload.records[0], speed: 90 }],
        })
      ).error?.status,
    ).toBe(400);
    const anonymous = await connect();
    expect((await emit(anonymous, 'driver:sync-batch', payload)).error?.status).toBe(401);
    expect(telemetry.syncBatch).toHaveBeenCalledTimes(1);
  });
  it('validates before invoking the driver operation and passes socket ownership', async () => {
    const driver = await connect('valid');
    const line = '74da64c4-b72a-42f9-a762-51c4fa61e253';
    expect(
      (await emit(driver, 'driver:start-session', { licensePlate: 'ABC-1234', busLineId: line }))
        .ok,
    ).toBe(true);
    expect(telemetry.start).toHaveBeenCalledWith(
      user,
      { licensePlate: 'ABC-1234', busLineId: line },
      expect.any(String),
    );
    expect(
      (
        await emit(driver, 'driver:send-location', {
          licensePlate: 'ABC-1234',
          busLineId: line,
          position: [-43.37, -21.77],
          speed: 81,
          headingTowards: 0,
          timestamp: new Date().toISOString(),
        })
      ).error?.status,
    ).toBe(400);
    expect(telemetry.ingest).not.toHaveBeenCalled();
    const anonymous = await connect();
    expect(
      (await emit(anonymous, 'driver:heartbeat', { licensePlate: 'ABC-1234' })).error?.status,
    ).toBe(401);
    const expired = await connect('expired');
    expect(
      (await emit(expired, 'driver:heartbeat', { licensePlate: 'ABC-1234' })).error?.status,
    ).toBe(401);
    expect(telemetry.heartbeat).not.toHaveBeenCalled();
  });
  it('broadcasts to general and matching line only, and replaces subscriptions', async () => {
    const general = await connect();
    const line = await connect();
    const other = await connect();
    const lineId = '74da64c4-b72a-42f9-a762-51c4fa61e253';
    expect((await emit(general, 'passenger:subscribe', {})).data).toEqual({
      room: 'all_busses',
      buses: {},
    });
    await emit(line, 'passenger:subscribe', { busLineId: lineId });
    await emit(other, 'passenger:subscribe', { busLineId: '74da64c4-b72a-42f9-a762-51c4fa61e254' });
    const mismatched = jest.fn();
    other.on('passenger:location-update', mismatched);
    const generalEvent = new Promise((resolve) =>
      general.once('passenger:location-update', resolve),
    );
    const lineEvent = new Promise((resolve) => line.once('passenger:location-update', resolve));
    const update = {
      licensePlate: 'ABC-1234',
      busLineId: lineId,
      busStatus: 'circulating' as const,
      position: [-43.37, -21.77] as [number, number],
      speed: 20,
      headingTowards: 0,
      timestamp: new Date().toISOString(),
    };
    events.emit({ name: 'passenger:location-update', data: update });
    expect(await generalEvent).toEqual(update);
    expect(await lineEvent).toEqual(update);
    expect(mismatched).not.toHaveBeenCalled();
    const wrongRoute = jest.fn();
    other.on('passenger:route-updated', wrongRoute);
    const generalRoute = new Promise((resolve) => general.once('passenger:route-updated', resolve));
    const lineRoute = new Promise((resolve) => line.once('passenger:route-updated', resolve));
    events.emit({ name: 'passenger:route-updated', data: { busLineId: lineId } });
    expect(await generalRoute).toEqual({ busLineId: lineId });
    expect(await lineRoute).toEqual({ busLineId: lineId });
    expect(wrongRoute).not.toHaveBeenCalled();
    await emit(general, 'passenger:subscribe', {
      busLineId: '74da64c4-b72a-42f9-a762-51c4fa61e254',
    });
    const previous = jest.fn();
    general.on('passenger:bus-offline', previous);
    const offline = new Promise((resolve) => line.once('passenger:bus-offline', resolve));
    events.emit({
      name: 'passenger:bus-offline',
      data: {
        licensePlate: 'ABC-1234',
        busLineId: lineId,
        busStatus: 'notCirculating',
        reason: 'timeout',
      },
    });
    await offline;
    expect(previous).not.toHaveBeenCalled();
  });
  it('bounds message rate without invoking additional handlers', async () => {
    const socket = await connect();
    for (let i = 0; i < 20; i++)
      expect((await emit(socket, 'passenger:subscribe', {})).ok).toBe(true);
    expect((await emit(socket, 'passenger:subscribe', {})).error?.status).toBe(429);
    expect(telemetry.current).toHaveBeenCalledTimes(20);
  });
});

describe('Basic/JSON authentication compatibility', () => {
  const login = jest.fn().mockResolvedValue({ token: 'jwt' });
  const controller = new AuthController({ login } as unknown as AuthService);
  beforeEach(() => login.mockClear());
  it('decodes Basic credentials without trimming the password', async () => {
    await controller.login(`Basic ${Buffer.from('123: secret123 ').toString('base64')}`, undefined);
    expect(login).toHaveBeenCalledWith({ registrationNumber: '123', password: ' secret123 ' });
  });
  it('accepts JSON and rejects spoofed role fields', async () => {
    await controller.login(undefined, { registrationNumber: '123', password: 'secret123' });
    expect(login).toHaveBeenCalledWith({ registrationNumber: '123', password: 'secret123' });
    await expect(
      controller.login(undefined, {
        registrationNumber: '123',
        password: 'secret123',
        userType: 'admin',
      }),
    ).rejects.toThrow();
  });
});
