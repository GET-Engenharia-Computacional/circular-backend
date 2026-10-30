import { Module } from '@nestjs/common';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { AuthModule } from '../auth/auth.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { BusStopsService } from './bus-stops.service';
import { AdminRoutesService } from './admin-routes.service';
import { AdminBusStopsController } from './AdminBusStopsController';
import { AdminBusLinesController } from './AdminBusLinesController';
import { CampusPlacesService } from './campus-places.service';
import { AdminDeletionService } from './admin-deletion.service';
@Module({
  imports: [AuthModule, TelemetryModule],
  controllers: [CatalogController, AdminBusStopsController, AdminBusLinesController],
  providers: [
    CatalogService,
    BusStopsService,
    AdminRoutesService,
    CampusPlacesService,
    AdminDeletionService,
  ],
})
export class CatalogModule {}
