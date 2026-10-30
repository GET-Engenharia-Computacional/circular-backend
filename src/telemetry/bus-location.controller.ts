import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../auth/auth.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { BatchLocationDto, RestLocationDto, StartSessionDto, VehicleDto } from './telemetry.dto';
import { TelemetryService } from './telemetry.service';
import { IdParam } from '../catalog/catalog.dto';

@Controller('bus-location')
export class BusLocationController {
  constructor(private readonly telemetry: TelemetryService) {}
  @Get('arrivals/:id') arrivals(@Param() p: IdParam) {
    return this.telemetry.arrivals(p.id);
  }
  @Get() current() {
    return this.telemetry.current();
  }
  @Post('sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver', 'admin')
  start(@Req() req: Request & { user: AuthUser }, @Body() dto: StartSessionDto) {
    return this.telemetry.start(req.user, dto);
  }
  @Post('batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver', 'admin')
  syncBatch(@Req() req: Request & { user: AuthUser }, @Body() dto: BatchLocationDto) {
    return this.telemetry.syncBatch(req.user, dto);
  }
  @Post(':licensePlate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver', 'admin')
  ingest(
    @Req() req: Request & { user: AuthUser },
    @Param() params: VehicleDto,
    @Body() body: RestLocationDto,
  ) {
    return this.telemetry.ingest(req.user, { ...body, licensePlate: params.licensePlate });
  }
  @Post(':licensePlate/heartbeat')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver', 'admin')
  heartbeat(@Req() req: Request & { user: AuthUser }, @Param() params: VehicleDto) {
    return this.telemetry.heartbeat(req.user, params.licensePlate);
  }
  @Post(':licensePlate/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver', 'admin')
  close(@Req() req: Request & { user: AuthUser }, @Param() params: VehicleDto) {
    return this.telemetry.close(req.user, params.licensePlate);
  }
}
