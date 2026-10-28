import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { BusStopsService } from './bus-stops.service';
@Module({
  imports: [AuthModule],
  controllers: [CatalogController],
  providers: [CatalogService, BusStopsService],
})
export class CatalogModule {}
