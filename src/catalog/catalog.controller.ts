import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { NearbyQuery, PageQuery } from '../common/dto';
import { ActivationDto, IdParam, LineDto, PlaceDto, PlateDto, StopDto } from './catalog.dto';
import { CatalogService } from './catalog.service';
import { BusStopsService } from './bus-stops.service';
@Controller()
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly stops: BusStopsService,
  ) {}
  @Get(['bus-lines', 'bus-line']) lines() {
    return this.catalog.lines();
  }
  @Get(['license-plates', 'license-plate']) plates() {
    return this.catalog.plates();
  }
  @Get(['bus-stops', 'bus-stop']) busStops() {
    return this.stops.list();
  }
  @Get('bus-stops/nearest') nearest(@Query() query: NearbyQuery) {
    return this.stops.nearest(query);
  }
  @Get('campus-places') places(@Query() query: PageQuery) {
    return this.catalog.places(query);
  }
  @Get('campus-places/nearest') nearbyPlaces(@Query() query: NearbyQuery) {
    return this.catalog.nearbyPlaces(query);
  }
  @Post(['bus-lines', 'bus-line'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createLine(@Body() dto: LineDto) {
    return this.catalog.createLine(dto);
  }
  @Put(['bus-lines/:id', 'bus-line/:id'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateLine(@Param() p: IdParam, @Body() dto: LineDto) {
    return this.catalog.updateLine(p.id, dto);
  }
  @Delete(['bus-lines/:id', 'bus-line/:id'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deleteLine(@Param() p: IdParam) {
    return this.catalog.deactivate('bus_lines', p.id);
  }
  @Post(['license-plates', 'license-plate'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createPlate(@Body() dto: PlateDto) {
    return this.catalog.createPlate(dto);
  }
  @Put(['license-plates/:id', 'license-plate/:id'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updatePlate(@Param() p: IdParam, @Body() dto: PlateDto) {
    return this.catalog.updatePlate(p.id, dto);
  }
  @Delete(['license-plates/:id', 'license-plate/:id'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deletePlate(@Param() p: IdParam) {
    return this.catalog.deactivate('license_plates', p.id);
  }
  @Post('bus-stops')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createStop(@Body() dto: StopDto) {
    return this.stops.create(dto);
  }
  @Put('bus-stops/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateStop(@Param() p: IdParam, @Body() dto: StopDto) {
    const result = await this.stops.update(p.id, dto);
    if (!result) throw new NotFoundException();
    return result;
  }
  @Delete('bus-stops/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deleteStop(@Param() p: IdParam) {
    return this.catalog.deactivate('bus_stops', p.id);
  }
  @Post('campus-places')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createPlace(@Body() dto: PlaceDto) {
    return this.catalog.createPlace(dto);
  }
  @Get('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  users(@Query() q: PageQuery) {
    return this.catalog.users(q);
  }
  @Get('admin/bus-stops')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  adminStops(@Query() q: PageQuery) {
    return this.stops.adminList(q);
  }
  @Patch('admin/users/:id/activation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  activate(@Param() p: IdParam, @Body() dto: ActivationDto) {
    return this.catalog.activate(p.id, dto.isActive);
  }
}
