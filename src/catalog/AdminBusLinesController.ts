import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminPasswordGuard } from '../auth/admin-password.guard';
import { AdminDeletionService } from './admin-deletion.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { IdParam } from './catalog.dto';
import { AdminLineDto, RouteEntryDto } from './admin.dto';
import { CatalogService } from './catalog.service';
import { AdminRoutesService } from './admin-routes.service';

@Controller('admin/bus-lines')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminBusLinesController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly routes: AdminRoutesService,
    private readonly deletion: AdminDeletionService,
  ) {}
  @Get() list() {
    return this.routes.lines();
  }
  @Delete(':id') @UseGuards(AdminPasswordGuard) remove(@Param() p: IdParam) {
    return this.deletion.remove('bus_lines', p.id);
  }
  @Post() save(@Body() dto: AdminLineDto) {
    const { id, ...line } = dto;
    return id ? this.catalog.updateLine(id, line) : this.catalog.createLine(line);
  }
  @Get(':id/stops') route(@Param() p: IdParam) {
    return this.routes.route(p.id);
  }
  @Post(':id/stops') reorder(
    @Param() p: IdParam,
    @Body(new ParseArrayPipe({ items: RouteEntryDto, whitelist: true, forbidNonWhitelisted: true }))
    entries: RouteEntryDto[],
  ) {
    return this.routes.saveRoute(p.id, entries);
  }
}
