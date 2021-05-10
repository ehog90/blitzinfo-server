import { Module } from '@nestjs/common';
import { MeteoAlertsModule } from './modules/meteo-alerts/meteo-alerts.module';
import { DbModule } from './modules/db/db.module';
import { LiveDataModule } from './modules/live-data/live-data.module';
import { LoggerModule } from './modules/logger/logger.module';
import { InternalConfigModule as InternalConfigModule } from './modules/internal-config/internal-config.module';

@Module({
  imports: [
    MeteoAlertsModule,
    DbModule,
    LiveDataModule,
    LoggerModule,
    InternalConfigModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
