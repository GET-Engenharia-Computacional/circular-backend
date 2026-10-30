import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusLocationController } from './bus-location.controller';
import { BusLocationGateway } from './bus-location.gateway';
import { TelemetryService } from './telemetry.service';
import { TelemetryEvents } from './telemetry.events';

@Module({
  imports: [AuthModule],
  controllers: [BusLocationController],
  providers: [TelemetryService, TelemetryEvents, BusLocationGateway],
  exports: [TelemetryEvents],
})
export class TelemetryModule {}
