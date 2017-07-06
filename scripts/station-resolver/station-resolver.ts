/**
 * Created by ehog on 2016. 11. 11..
 */
import * as json from "../utils/httpQueries";
import {logger} from "../logger/logger";
import {StationsMongoModel} from "../mongo/mongoDbSchemas";
import {lightningMapsWebSocket} from "../lightningMaps/lightningMaps";
import {mongoReverseGeocoderAsync} from "../reverseGeocoderAndSun/mongoReverseGeocoderAsync";
import * as _ from "lodash";
import {Modules} from "../interfaces/modules";
import IStationResolver = Modules.IStationResolver;
import {Observable} from "rxjs/Observable";
import {TimeInterval} from "rxjs/Rx";


class StationResolver implements IStationResolver {
    start(): void {
        this.timer = Observable.timer(0, StationResolver.tick)
            .timeInterval();
        this.timer.subscribe(() => this.stationUpdateRequested());
        lightningMapsWebSocket.lastReceived.filter(stroke => !!stroke.sta).subscribe(stroke => {
            for (const key in stroke.sta) {
                if (stroke.sta.hasOwnProperty(key)) {
                    const stationId: number = Number(key);
                    const date = new Date(stroke.time);
                    StationResolver.updateStationDetection(stationId, date);
                }
            }
        })
    }

    private static async updateStationDetection(station: number, date: Date): Promise<any> {
        return StationsMongoModel.update({sId: station}, {
            "$inc": {detCnt: 1},
            lastSeen: date
        }, {upsert: true}).toPromise();
    }

    private timer: Observable<TimeInterval<number>>;
    private static tick = 1000 * 60 * 60 * 2;
    private static jsonUrls = [
        "http://www.lightningmaps.org/blitzortung/europe/index.php?stations_json",
        "http://www.lightningmaps.org/blitzortung/america/index.php?stations_json",
        "http://www.lightningmaps.org/blitzortung/oceania/index.php?stations_json"];

    private async stationUpdateRequested() {
        const stationQueryResult = await Observable.from(StationResolver.jsonUrls).flatMap(url =>
            Observable.fromPromise(json.getJsonAsync(`${url}&${Math.random() % 420}`, 1500))
                .catch(() => Observable.of(null)))
            .merge(1).filter(result => !!result).reduce((acc, value) => {
                acc.push(value.result);
                return acc;
            }, []).toPromise();

        logger.sendNormalMessage(0, 0, "Stations", `Stations are downloaded`, false);
        const arrayResults: any[] = [];
        stationQueryResult.forEach(result => {
            for (const key in result) {
                if (result.hasOwnProperty(key)) {
                    result[key].sId = key;
                    arrayResults.push(result[key]);
                }
            }
        });


        const alteredResults = await Observable.from(arrayResults).map(x =>
            StationsMongoModel.findOne({
                sId: x.sId,
                latLon: {"$ne": [x[1], x[0]]}
            }).toObservable().filter(y => !!y).map(result => StationsMongoModel.update({
                sId: x.sId,
            }, {"$unset": {location: true}}).toObservable())
        ).merge(4).reduce((acc, value) => {
            acc.push(value);
            return acc;
        }, []).toPromise();

        logger.sendNormalMessage(0, 0, `Stations`, `Altered stations: ${_.compact(alteredResults).length}`, false);

        await Observable.from(arrayResults).map(x =>
            StationsMongoModel.update({sId: x.sId}, {
                sId: x.sId,
                name: x.c,
                latLon: [x[1], x[0]]
            }, {upsert: true}).toObservable()
        ).merge(4).reduce((acc, value) => {
            acc.push(value);
            return acc;
        }, []).toPromise();

        const untouched = await StationsMongoModel.find({
            "$and": [
                {latLon: {"$size": 2}},
                {location: {"$exists": false}}]
        });

        const geoResultsWithData = await Observable.from(untouched).map(x =>
            Observable.fromPromise(mongoReverseGeocoderAsync.getGeoInformation(x.latLon)).do(location => x.location = location)
        ).merge(4).reduce((acc, value) => {
            acc.push(value);
            return acc;
        }, []).toPromise();


        const updatedStations = await Observable.from(geoResultsWithData)
            .flatMap((station: any) =>
                StationsMongoModel.update({sId: station.sId}, {location: station.location})
                    .toObservable()).merge(4).reduce((acc, value) => {
                acc.push(value);
                return acc;
            }, []).toPromise();

        logger.sendNormalMessage(0, 0, `Stations`, `Updated stations: ${updatedStations.length}`, false);
    }
}

export const stationResolver: Modules.IStationResolver = new StationResolver();