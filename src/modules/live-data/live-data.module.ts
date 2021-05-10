import { Module } from '@nestjs/common';
import { InternalConfigModule } from '../internal-config/internal-config.module';
import { LoggerModule } from '../logger/logger.module';
import { LightningMapsService } from './services/lightning-maps/lightning-maps.service';

@Module({
  providers: [LightningMapsService],
  exports: [LightningMapsService],
  imports: [LoggerModule, InternalConfigModule],
})
export class LiveDataModule {}
