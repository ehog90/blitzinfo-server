import { combinedReverseGeocooder } from './../reverse-geocoding/combined-reverse-geocoder';
import { toPairs } from 'lodash';
import { merge, Observable, of, TimeInterval, timer } from 'rxjs';
import {
  catchError,
  filter,
  map,
  mergeMap,
  timeInterval,
} from 'rxjs/operators';

import { IStationResolver } from '../contracts/service-interfaces';
import { StationsMongoModel } from '../database';
import * as json from '../helpers/http-queries';
import {
  ILightningmapsStationData,
  IStationsFromWeb,
} from './../contracts/entities';
import { lightningMapsDataService } from './lightning-maps-data-service';
import { loggerInstance } from './logger-service';

class StationResolver implements IStationResolver {
  // #region Properties (3)

  private readonly jsonUrls = [
    'http://www.lightningmaps.org/blitzortung/europe/index.php?stations_json',
    'http://www.lightningmaps.org/blitzortung/america/index.php?stations_json',
    'http://www.lightningmaps.org/blitzortung/oceania/index.php?stations_json',
  ];
  private readonly tick = 1000 * 60 * 60 * 2;

  private timer: Observable<TimeInterval<number>>;

  // #endregion Properties (3)

  // #region Public Methods (1)

  public start(): void {
    this.timer = timer(5000, this.tick).pipe(timeInterval());
    this.timer.subscribe(() => this.stationUpdateRequested());
    lightningMapsDataService.lastReceived
      .pipe(filter((stroke) => !!stroke.sta))
      .subscribe((stroke) => {
        const stations: number[] = toPairs(stroke.sta).map((x) => Number(x[0]));

        const bulk = StationsMongoModel.collection.initializeUnorderedBulkOp();
        for (const station of stations) {
          bulk
            .find({ sId: station })
            .upsert()
            .update({
              $inc: { detCnt: 1 },
              $set: { lastSeen: new Date(stroke.time) },
            });
        }
        bulk.execute();
      });
  }

  // #endregion Public Methods (1)

  // #region Private Methods (2)

  private async stationDataReceived(stationsData: IStationsFromWeb[]) {
    loggerInstance.sendNormalMessage(
      0,
      0,
      'Stations',
      `${stationsData.length} station data downloaded, updating station metadata for stations`,
      false,
    );

    for (const stationData of stationsData) {
      const stationGeoInformation = await combinedReverseGeocooder.getGeoInformation(
        stationData.latLon,
      );
      await StationsMongoModel.updateOne(
        { sId: stationData.sId },
        {
          $set: {
            latLon: stationData.latLon,
            name: stationData.name,
            location: stationGeoInformation,
          },
        },
        { upsert: true },
      ).exec();
    }

    loggerInstance.sendNormalMessage(
      0,
      0,
      `Stations`,
      `Station metadata updated.`,
      false,
    );
  }

  private stationUpdateRequested() {
    merge(this.jsonUrls, 1)
      .pipe(
        mergeMap((url) =>
          json
            .getHttpRequestAsync<ILightningmapsStationData>(
              `${url}&${Math.random() % 420}`,
              1500,
            )
            .pipe(
              catchError((x) =>
                of<ILightningmapsStationData>({ user: '', stations: {} }),
              ),
            ),
        ),
        map((x) =>
          toPairs(x.stations).map(
            ([id, station]) =>
              ({
                latLon: [station[1], station[0]],
                name: station.c,
                sId: Number(id),
              } as IStationsFromWeb),
          ),
        ),
      )
      .subscribe(this.stationDataReceived);
  }

  // #endregion Private Methods (2)
}

export const stationResolverService: IStationResolver = new StationResolver();
