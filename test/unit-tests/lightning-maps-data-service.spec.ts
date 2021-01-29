import { client, connection } from 'websocket';
jest.mock('websocket');

import { ILogger } from './../../app/contracts/service-interfaces';
import { LightningMapsDataService } from './../../app/services/lightning-maps-data-service';
import { MockedObject } from 'ts-jest/dist/utils/testing';

describe('Lightning Maps Data Service', () => {
  let lightningMapsDataService: LightningMapsDataService;
  let mockedLoggerInstance: MockedObject<ILogger>;
  const mockUrl = 'wss://aaaa';
  let mockedConnect;
  const mockedStrokesOne = {
    time: 1611940493,
    flags: { '2': 0 },
    strokes: [
      {
        time: 1611940490946,
        lat: 30.333237,
        lon: 51.146917,
        src: 2,
        srv: 2,
        id: 7076937,
        del: 1893,
        dev: 7220,
      },
      {
        time: 1611940491083,
        lat: 31.776062,
        lon: 49.447689,
        src: 2,
        srv: 2,
        id: 7076938,
        del: 1897,
        dev: 217,
      },
      {
        time: 1611940491304,
        lat: 34.087176,
        lon: -58.303439,
        src: 2,
        srv: 2,
        id: 7076939,
        del: 1737,
        dev: 919,
      },
    ],
  };

  beforeEach(() => {
    mockedConnect = jest.fn(() => console.log('websocket connection'));
    client.prototype.connect = mockedConnect;
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
});
