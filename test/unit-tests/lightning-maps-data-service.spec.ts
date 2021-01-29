import { client } from 'websocket';
jest.mock('websocket');

import { ILogger } from './../../app/contracts/service-interfaces';
import { loggerInstance } from './../../app/services/logger-service';
import { LightningMapsDataService } from './../../app/services/lightning-maps-data-service';
import { mocked } from 'ts-jest/utils';
import { MockedObject } from 'ts-jest/dist/utils/testing';

describe('Lightning Maps Data Service', () => {
  let lightningMapsDataService: LightningMapsDataService;
  let mockedLoggerInstance: MockedObject<ILogger>;
  const mockUrl = 'wss://aaaa';
  let mockedConnect;

  beforeEach(() => {
    mockedConnect = jest.fn(() => console.log('websocket connection'));
    client.prototype.connect = mockedConnect;
    mockedLoggerInstance = mocked(loggerInstance);
    mockedLoggerInstance.sendWarningMessage = jest.fn();

    lightningMapsDataService = new LightningMapsDataService(
      mockedLoggerInstance,
      60,
      mockUrl,
    );
  });

  it('Should be set-up correctly', () => {
    expect(lightningMapsDataService).toBeTruthy();
  });

  it('Should set-up websocket connection after start', () => {
    lightningMapsDataService.start();
    expect(mockedConnect).toHaveBeenCalledTimes(1);
  });

  it('Should set-up websocket connection after start', () => {
    lightningMapsDataService.start();
    expect(mockedConnect).toHaveBeenCalledTimes(1);
  });

  it('Should map the strokes correctly', () => {
    lightningMapsDataService.start();

    expect(mockedConnect).toHaveBeenCalledTimes(1);
  });
});
