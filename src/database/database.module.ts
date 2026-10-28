import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';
import dataSource from './data-source';

@Global()
@Module({
  providers: [{ provide: DataSource, useFactory: () => dataSource.initialize() }],
  exports: [DataSource],
})
export class DatabaseModule implements OnApplicationShutdown {
  async onApplicationShutdown() {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}
