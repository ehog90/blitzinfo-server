/**
 * Created by ehog on 2016. 11. 11..
 */
import * as json from "../utils/httpQueries";
import {logger} from "../logger/logger";
import {StationsMongoModel} from "../mongo/mongoDbSchemas";
import {lightningMapsWebSocket} from "../lightningMaps/lightningMaps";
import {Modules} from "../interfaces/modules";
import {Observable} from "rxjs/Observable";
import {TimeInterval} from "rxjs/Rx";
import IStationResolver = Modules.IStationResolver;
import {Entities} from "../interfaces/entities";
import {remoteMongoReverseGeocoderAsync} from "../reverseGeocoderAndSun/remote-mongo-reverse-geocoder";
import {toPairs} from 'lodash'
import IStationsFromWeb = Entities.IStationsFromWeb;

class StationResolver implements IStationResolver {
    start(): void {
        this.timer = Observable.timer(5000, StationResolver.tick)
            .timeInterval();
        this.timer.subscribe(() => this.stationUpdateRequested());
        lightningMapsWebSocket.lastReceived.filter(stroke => !!stroke.sta).subscribe(stroke => {
            const stations: number[] =
                toPairs(stroke.sta).map(x => Number(x[0]));

            const bulk = StationsMongoModel.collection.initializeUnorderedBulkOp();
            for (const station of stations) {
                bulk.find({sId: station}).upsert().update({$inc: {detCnt: 1}, $set: {lastSeen: new Date(stroke.time)}});
            }
            bulk.execute();
        })
    }

    private timer: Observable<TimeInterval<number>>;
    private static tick = 1000 * 60 * 60 * 2;
    private static jsonUrls = [
        "http://www.lightningmaps.org/blitzortung/europe/index.php?stations_json",
        "http://www.lightningmaps.org/blitzortung/america/index.php?stations_json",
        "http://www.lightningmaps.org/blitzortung/oceania/index.php?stations_json"];

    private async stationUpdateRequested() {
        const stationsFromWeb: IStationsFromWeb[] = await Observable.from(StationResolver.jsonUrls).flatMap(url =>
            json.getHttpRequestAsync<any>(`${url}&${Math.random() % 420}`, 1500)
                .catch(x => Observable.of<any>({})))
            .map(x => toPairs(x).map((y: any) => {
                return {
                    latLon: [y[1][1], y[1][0]],
                    name: y[1].c,
                    sId: Number(y[0])
                }
            }))
            .merge(1).reduce((acc: IStationsFromWeb[], value: IStationsFromWeb[]) => acc.concat(value), []).toPromise();

        logger.sendNormalMessage(0, 0, "Stations", `${stationsFromWeb.length} station data downloaded, updating station metadata for all stations`, false);

        for (const stationData of stationsFromWeb) {
            let stationGeoInformation = await remoteMongoReverseGeocoderAsync.getGeoInformation(stationData.latLon);
            await StationsMongoModel.update({sId: stationData.sId}, {
                latLon: stationData.latLon,
                name: stationData.name,
                location: stationGeoInformation
            }, {upsert: true}).exec();
        }

        logger.sendNormalMessage(0, 0, `Stations`, `Station metadata updated.`, false);
    }
}

export const stationResolver: Modules.IStationResolver = new StationResolver();