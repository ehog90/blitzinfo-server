import { combinedReverseGeocooder } from './combined-reverse-geocoder';
import {
  ICombinedReverseGeocoderService,
  IReverseGeoCoderService,
} from './../contracts/service-interfaces';
import { Subject } from 'rxjs';

import { ILightningMapsStroke, IStroke } from '../contracts/entities';
import { ILightningMapsWebSocket } from '../contracts/service-interfaces';
import * as geo from '../helpers/geospatial-helper';
import { loggerInstance } from '../services';
import { lightningMapsDataService } from '../services/lightning-maps-data-service';

const sunCalc: any = require('../js-modules/suncalc');

class ReverseGeocoderService implements IReverseGeoCoderService {
  // #region Properties (3)

  private lightningMapsWebSocket: ILightningMapsWebSocket;

  public lastGeocodedStroke: Subject<IStroke>;
  public serverEventChannel: Subject<any>;

  // #endregion Properties (3)

  // #region Constructors (1)

  constructor(
    private combinedReverseGeocoder: ICombinedReverseGeocoderService,
  ) {}

  // #endregion Constructors (1)

  // #region Public Methods (2)

  public assignWebSocket(lightningMapsWebSocket: ILightningMapsWebSocket) {
    this.lightningMapsWebSocket = lightningMapsWebSocket;
    this.lastGeocodedStroke = new Subject<IStroke>();
    this.serverEventChannel = lightningMapsWebSocket.strokeEventChannel;
    lightningMapsWebSocket.lastReceived.subscribe((stroke) =>
      this.geoCode(stroke),
    );
  }

  public async geoCode(stroke: ILightningMapsStroke) {
    const sunData = sunCalc.getPosition(
      new Date(stroke.time),
      stroke.lat,
      stroke.lon,
    );
    const sunElevation: number = (sunData.altitude * 180) / Math.PI;
    const azimuth: number = (sunData.azimuth * 180) / Math.PI;
    const geoCodedStroke: IStroke = {
      latLon: [stroke.lon, stroke.lat],
      locationData: {
        cc: 'xx',
        regDef: null,
        sRegDef: null,
        smDef: null,
        strDef: null,
        suburbDef: null,
      },
      time: new Date(stroke.time),
      sunData: {
        sunElev: sunElevation,
        azimuth,
        sunState: geo.getSunState(sunElevation, azimuth),
      },
      blitzortungId: stroke.id,
      _id: null,
    } as IStroke;
    try {
      geoCodedStroke.locationData = await this.combinedReverseGeocoder.getGeoInformation(
        [stroke.lon, stroke.lat],
      );
      this.lastGeocodedStroke.next(geoCodedStroke);
    } catch (error) {
      loggerInstance.sendErrorMessage(
        0,
        0,
        'Geocoder',
        'Geocoder error',
        false,
      );
    }
  }

  // #endregion Public Methods (2)
}

export const reverseGeocoderService: IReverseGeoCoderService = new ReverseGeocoderService(
  combinedReverseGeocooder,
);
console.log(lightningMapsDataService);

reverseGeocoderService.assignWebSocket(lightningMapsDataService);
