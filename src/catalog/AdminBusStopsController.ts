import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { IdParam, StopDto } from './catalog.dto';
import { PatchStopDto } from './admin.dto';
import { BusStopsService } from './bus-stops.service';
import { AdminRoutesService } from './admin-routes.service';
import { AdminPasswordGuard } from '../auth/admin-password.guard';
import { AdminDeletionService } from './admin-deletion.service';

@Controller('admin/bus-stops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminBusStopsController {
  constructor(
    private readonly stops: BusStopsService,
    private readonly routes: AdminRoutesService,
    private readonly deletion: AdminDeletionService,
  ) {}
  @Post() create(@Body() dto: StopDto) {
    return this.stops.create(dto);
  }
  @Patch(':id') patch(@Param() p: IdParam, @Body() dto: PatchStopDto) {
    return this.routes.patchStop(p.id, dto);
  }
  @Delete(':id') @UseGuards(AdminPasswordGuard) remove(@Param() p: IdParam) {
    return this.deletion.remove('bus_stops', p.id);
  }
}
