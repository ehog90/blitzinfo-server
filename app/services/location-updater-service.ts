import { combinedReverseGeocooder } from './../reverse-geocoding/combined-reverse-geocoder';
import { ICombinedReverseGeocoderService } from './../contracts/service-interfaces';
import * as _ from 'lodash';
import { interval, Subject } from 'rxjs';
import { buffer } from 'rxjs/operators';

import {
  IDeviceLocationLog,
  IDeviceLocationRecent,
  IDeviceUpdateRequestBody,
  IGeoCodingResult,
  IHungarianRegionalInformation,
  ILocationLogResult,
  ILocationUpdateRequest,
  LocationUpdateSource,
} from '../contracts/entities';
import {
  ILocationUpdater,
  ILogger,
  IReverseGeoCoderAsync,
} from '../contracts/service-interfaces';
import * as mongo from '../database/mongoose-schemes';
import * as geoUtils from '../helpers/geospatial-helper';
import * as grg from '../reverse-geocoding/google-reverse-geocoder';
import { loggerInstance } from './logger-service';

export class LocationUpdaterService implements ILocationUpdater {
  // #region Properties (1)

  public insertLastLocationSubject: Subject<ILocationUpdateRequest>;

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(
    private logger: ILogger,
    private combinedReverseGeocoder: ICombinedReverseGeocoderService,
    private reverseGeoCoder: IReverseGeoCoderAsync,
  ) {
    this.insertLastLocationSubject = new Subject<ILocationUpdateRequest>();
    this.insertLastLocationSubject
      .pipe(buffer(interval(5000)))
      .subscribe((x) => this.processLocationBuffer(x));
  }

  // #endregion Constructors (1)

  // #region Public Methods (2)

  public getHungarianData(
    latLon: number[],
  ): Promise<IHungarianRegionalInformation> {
    return this.combinedReverseGeocoder.getHungarianGeoInformation(latLon);
  }

  public async reverseGeocodeWithCountryAsync(
    latLon: number[],
  ): Promise<IGeoCodingResult> {
    try {
      const currentLocation = await this.reverseGeoCoder.getGeoInformation(
        latLon,
      );
      const hungarianData = await this.combinedReverseGeocoder.getHungarianGeoInformation(
        latLon,
      );
      return Promise.resolve({
        locationData: currentLocation,
        hungarianData,
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // #endregion Public Methods (2)

  // #region Private Static Methods (2)

  private static async saveNewLogToDatabase(
    updater: LocationUpdateSource,
    deviceData: IDeviceUpdateRequestBody,
    geocodingResult: IGeoCodingResult,
  ) {
    const logResult: ILocationLogResult = {
      geocodingResult,
      id: null,
    };

    const dataToSaveLog: IDeviceLocationLog = {
      num: 1,
      updater,
      accsum: deviceData.acc,
      timeFirst: new Date(),
      timeLast: new Date(),
      latLon: deviceData.latLon,
      location: logResult,
      did: deviceData.se.did,
      userData: {
        uid: deviceData.se.uid,
        dt: deviceData.dt,
      },
      hunData: geocodingResult.hungarianData,
      alerts: [],
    };
    try {
      const logLocationToInsert = new mongo.LocationLogMongoModel(
        dataToSaveLog,
      );
      const savedStroke = await logLocationToInsert.save();
      return Promise.resolve(savedStroke);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private static async saveRecentToDatabase(
    updater: LocationUpdateSource,
    deviceData: IDeviceUpdateRequestBody,
    logResult: ILocationLogResult,
  ): Promise<IDeviceLocationRecent> {
    const dataToSaveRecent: IDeviceLocationRecent = {
      num: 1,
      updater,
      acc: deviceData.acc,
      timeFirst: new Date(),
      timeLast: new Date(),
      latLon: deviceData.latLon,
      location: logResult,
      did: deviceData.se.did,
      userData: {
        uid: deviceData.se.uid,
        dt: deviceData.dt,
      },
      hunData: logResult.geocodingResult.hungarianData,
      lastAlert: null,
      lastLogId: logResult.id,
      lastInAlertZone: null,
    };
    const recentLocationToInsert = new mongo.LocationRecentMongoModel(
      dataToSaveRecent,
    );
    try {
      const savedStroke = await recentLocationToInsert.save();
      return Promise.resolve(savedStroke);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // #endregion Private Static Methods (2)

  // #region Private Methods (3)

  private async insertLastLocationToDatabase(
    updater: LocationUpdateSource,
    deviceData: IDeviceUpdateRequestBody,
  ): Promise<ILocationLogResult> {
    const existingData = await mongo.LocationLogMongoModel.findOne({
      did: { $eq: deviceData.se.did },
    }).sort({ timeLast: -1 });
    if (!existingData) {
      const locationData = await this.reverseGeocodeWithCountryAsync(
        deviceData.latLon,
      );
      const saved = await LocationUpdaterService.saveNewLogToDatabase(
        updater,
        deviceData,
        locationData,
      );
      return Promise.resolve({
        geocodingResult: locationData,
        id: saved._id.toString(),
      });
    } else if (
      geoUtils.getDistance(deviceData.latLon, existingData.latLon) < 0.1
    ) {
      await mongo.LocationLogMongoModel.updateOne(
        { _id: existingData._id },
        {
          $inc: { num: 1, accsum: deviceData.acc },
          $set: {
            timeLast: new Date(),
            updater,
          },
        },
      );
      const updated = await mongo.LocationLogMongoModel.findOne({
        _id: existingData._id,
      });
      return Promise.resolve({
        geocodingResult: {
          locationData: updated.location as any,
          hungarianData: updated.hunData,
        },
        id: updated._id.toString(),
      });
    } else {
      const locationData = await this.reverseGeocodeWithCountryAsync(
        deviceData.latLon,
      );
      const saved = await LocationUpdaterService.saveNewLogToDatabase(
        updater,
        deviceData,
        locationData,
      );
      return Promise.resolve({
        geocodingResult: locationData,
        id: saved._id.toString(),
      });
    }
  }

  private async insertLastLocationToDatabaseAndUpdate(
    updater: LocationUpdateSource,
    deviceData: IDeviceUpdateRequestBody,
  ): Promise<IDeviceLocationRecent> {
    try {
      const logResult = await this.insertLastLocationToDatabase(
        updater,
        deviceData,
      );
      const existingData = await mongo.LocationRecentMongoModel.findOne({
        did: { $eq: deviceData.se.did },
      });
      if (!existingData) {
        return Promise.resolve(
          LocationUpdaterService.saveRecentToDatabase(
            updater,
            deviceData,
            logResult,
          ),
        );
      } else {
        await mongo.LocationRecentMongoModel.updateOne(
          { did: { $eq: deviceData.se.did } },
          {
            $inc: {
              num: 1,
            },
            $set: {
              acc: deviceData.acc,
              timeLast: new Date(),
              hunData: logResult.geocodingResult.hungarianData,
              location: logResult,
              latLon: deviceData.latLon,
              updater,
              lastLogId: logResult.id,
            },
          },
        );
        return Promise.resolve(null);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private async processLocationBuffer(
    items: ILocationUpdateRequest[],
  ): Promise<any> {
    if (items.length > 0) {
      _.reverse(items);
      const processed: string[] = [];

      for (const item of items) {
        if (processed.indexOf(item.deviceData.se.did) === -1) {
          processed.push(item.deviceData.se.did);
          try {
            const logResult = await this.insertLastLocationToDatabaseAndUpdate(
              item.updater,
              item.deviceData,
            );
            this.logger.sendNormalMessage(
              87,
              57,
              'Location updater',
              `${JSON.stringify(item)} ${JSON.stringify(logResult)}`,
              false,
            );
          } catch (error) {
            this.logger.sendErrorMessage(
              0,
              0,
              'Location updater',
              error.toString(),
              false,
            );
          }
        } else {
          this.logger.sendWarningMessage(
            0,
            0,
            'Location updater',
            'Dupe location message: ' + JSON.stringify(item),
            false,
          );
        }
      }
    }
  }

  // #endregion Private Methods (3)
}

export const locationUpdaterInstance: ILocationUpdater = new LocationUpdaterService(
  loggerInstance,
  combinedReverseGeocooder,
  grg.googleReverseGeoCoder,
);
