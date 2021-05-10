import { Injectable, Logger } from '@nestjs/common';
import { ISocketInitialization } from 'src/modules/live-data/live-data.interfaces';
import * as configReader from 'yml-config-reader';
import { init } from 'src/init';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalConfigService {
  private logger = new Logger(InternalConfigService.name);
  private config = configReader.getByFiles('./config.yml');
  private _initObject = init;

  constructor(private readonly configService: ConfigService) {}

  public get lightningMapsBaseUrl() {
    return this.configService.get('lightningMaps')?.baseUrl;
  }
  public get initObject(): ISocketInitialization {
    return this._initObject as any;
  }
}
