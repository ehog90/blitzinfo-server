import {loggerInstance} from "../logger/loggerInstance";

import {toPairs} from 'lodash';
import {from, of as observableOf, timer, Observable, TimeInterval} from "rxjs";
import {catchError, filter, flatMap, map, merge, reduce, timeInterval} from "rxjs/operators";
import {IStationsFromWeb} from "../interfaces/entities";
import {IStationResolver} from "../interfaces/modules";
import {lightningMapsWebSocketInstance} from "../lightningMaps/lightningMaps";
import {StationsMongoModel} from "../mongo/mongoDbSchemas";
import {remoteMongoReverseGeocoderAsync} from "../reverseGeocoderAndSun/remote-mongo-reverse-geocoder";
import * as json from "../utils/httpQueries";

class StationResolver implements IStationResolver {
    private static tick = 1000 * 60 * 60 * 2;
    private static jsonUrls = [
        "http://www.lightningmaps.org/blitzortung/europe/index.php?stations_json",
        "http://www.lightningmaps.org/blitzortung/america/index.php?stations_json",
        "http://www.lightningmaps.org/blitzortung/oceania/index.php?stations_json"];

    private timer: Observable<TimeInterval<number>>;

    public start(): void {
        this.timer = timer(5000, StationResolver.tick)
            .pipe(timeInterval());
        this.timer.subscribe(() => this.stationUpdateRequested());
        lightningMapsWebSocketInstance.lastReceived.pipe(filter(stroke => !!stroke.sta)).subscribe(stroke => {
            const stations: number[] =
                toPairs(stroke.sta).map(x => Number(x[0]));

            const bulk = StationsMongoModel.collection.initializeUnorderedBulkOp();
            for (const station of stations) {
                bulk.find({sId: station}).upsert().update({$inc: {detCnt: 1}, $set: {lastSeen: new Date(stroke.time)}});
            }
            bulk.execute();
        });
    }

    private async stationUpdateRequested() {
        const stationsFromWeb: IStationsFromWeb[] = await from(StationResolver.jsonUrls).pipe(
            flatMap(url =>
                json.getHttpRequestAsync<any>(`${url}&${Math.random() % 420}`, 1500).pipe(
                    catchError(x => observableOf<any>({}))),
            ),
            map(x => toPairs(x).map((y: any) => {
                return {
                    latLon: [y[1][1], y[1][0]],
                    name: y[1].c,
                    sId: Number(y[0])
                };
            })),
            merge(1),
            reduce((acc: IStationsFromWeb[], value: IStationsFromWeb[]) => acc.concat(value), [])
        ).toPromise() as IStationsFromWeb[];

        loggerInstance.sendNormalMessage(0, 0,
            "Stations", `${stationsFromWeb.length} station data downloaded, updating station metadata for all stations`, false);

        for (const stationData of stationsFromWeb) {
            const stationGeoInformation = await remoteMongoReverseGeocoderAsync.getGeoInformation(stationData.latLon);
            await StationsMongoModel.update({sId: stationData.sId}, {
                latLon: stationData.latLon,
                name: stationData.name,
                location: stationGeoInformation
            }, {upsert: true}).exec();
        }

        loggerInstance.sendNormalMessage(0, 0, `Stations`, `Station metadata updated.`, false);
    }
}

export const stationResolver: IStationResolver = new StationResolver();
