/**
 * Created by ehog on 2016. 11. 11..
 */
import {Observable, TimeInterval} from "rx";
import * as json from "../utils/httpQueries";
import {logger} from "../logger/logger";
import {StationsMongoModel} from "../mongo/mongoDbSchemas";
import {lightningMapsWebSocket} from "../lightningMaps/lightningMaps";
import {mongoReverseGeocoderAsync} from "../reverseGeocoderAndSun/mongoReverseGeocoderAsync";
import * as _ from "lodash";
import {Modules} from "../interfaces/modules";
import IStationResolver = Modules.IStationResolver;


class StationResolver implements IStationResolver {
    start(): void {
        this.timer = Observable.timer(0, StationResolver.tick)
            .timeInterval();
        this.timer.subscribe(() => this.stationUpdateRequested());
        lightningMapsWebSocket.lastReceived.subscribe(stroke => {
            if (stroke.sta) {
                for (const key in stroke.sta) {
                    if (stroke.sta.hasOwnProperty(key)) {
                        const stationId: number = Number(key);
                        const date = new Date(stroke.time);
                        StationResolver.updateStationDetection(stationId, date);
                    }
                }
            }
        })
    }

    private static updateStationDetection(station: number, date: Date) {
        StationsMongoModel.update({sId: station}, {
            "$inc": {detCnt: 1},
            lastSeen: date
        }, {upsert: true}).exec(() => {

        });
    }


    private timer: Observable<TimeInterval<number>>;
    private static tick = 1000 * 60 * 60 * 2;
    private static jsonUrls = [
        "http://www.lightningmaps.org/blitzortung/europe/index.php?stations_json",
        "http://www.lightningmaps.org/blitzortung/america/index.php?stations_json",
        "http://www.lightningmaps.org/blitzortung/oceania/index.php?stations_json"];

    private async stationUpdateRequested() {
        const stationQueryResult = await Observable.fromArray(StationResolver.jsonUrls).map(url =>
            Observable.defer(() => {
                return Observable.fromPromise(json.getJsonAsync(`${url}&${Math.random() % 420}`,1500))
                    .catch(() => Observable.return(null))
                    .do(val => Observable.return(val))
            })
        ).merge(1).reduce((acc,value) => {
            if (value != null) {
                acc.push(value.result);
            }
            return acc;
        },[]).toPromise();

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



        const alteredResults = await Observable.fromArray(arrayResults).map(x => Observable.defer(() => {
                return Observable.fromPromise(StationsMongoModel.findOne({
                    sId: x.sId,
                    latLon: {"$ne": [x[1], x[0]]}
                }, (err, result) => {
                    if (result) {
                        StationsMongoModel.update({
                            sId: x.sId,
                        }, {"$unset": {location: true}}).exec(updateResult => {
                            return Observable.return(result);
                        });
                    } else {
                        return Observable.return(null);
                    }
                }));
            })
        ).merge(4).reduce((acc,value) => {
            acc.push(value);
            return acc;
        },[]).toPromise();

        logger.sendNormalMessage(0, 0, `Stations`, `Altered stations: ${_.compact(alteredResults).length}`, false);

        const insertedStations = await Observable.fromArray(arrayResults).map(x =>
            Observable.defer(() => {
            return Observable.fromPromise(StationsMongoModel.update({sId: x.sId}, {
                sId: x.sId,
                name: x.c,
                latLon: [x[1], x[0]]
            }, {upsert: true}).exec((err, result) => {
                return Observable.return(result);
            }));
        })).merge(4).reduce((acc,value) => {
            acc.push(value);
            return acc;
        },[]).toPromise();


        const untouched = await StationsMongoModel.find({
            "$and": [
                {latLon: {"$size": 2}},
                {location: {"$exists": false}}]
        });

        const geoResultsWithData = await Observable.fromArray(untouched).flatMap(x => Observable.defer(() => {
            return Observable.fromPromise(mongoReverseGeocoderAsync.getGeoInformation(x.latLon).then((location) => {
                x.location = location;
                return Observable.return(x);
            }));
        })).merge(4).reduce((acc,value) => {
            acc.push(value);
            return acc;
        },[]).toPromise();
        const updatedStations = await Observable.fromArray(geoResultsWithData).map(station => Observable.defer(() => {
            return Observable.fromPromise(StationsMongoModel.update({sId: station.sId}, {location: station.location}))
        })).merge(4).reduce((acc,value) => {
            acc.push(value);
            return acc;
        },[]).toPromise();

        logger.sendNormalMessage(0, 0, `Stations`, `Updated stations: ${updatedStations.length}`, false);
    }
}

export const stationResolver: Modules.IStationResolver = new StationResolver();