import { Controller, Get, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { ForumModule } from './forum/forum.module';
@Controller('health')
class HealthController {
  constructor(private readonly db: DataSource) {}
  @Get() async health() {
    await this.db.query('SELECT 1');
    return { status: 'ok' };
  }
}
@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(),
    AuthModule,
    CatalogModule,
    TelemetryModule,
    ForumModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
