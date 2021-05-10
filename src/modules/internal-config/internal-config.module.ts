import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from 'src/config/configuration';
import { InternalConfigService } from './services/internal-config/internal-config.service';

@Module({
  providers: [InternalConfigService],
  exports: [InternalConfigService],
  imports: [ConfigModule.forRoot({ load: [configuration] })],
})
export class InternalConfigModule {}
