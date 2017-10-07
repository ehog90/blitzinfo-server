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
import * as _ from "lodash";
import IStationResolver = Modules.IStationResolver;
import {Entities} from "../interfaces/entities";
import StationData = Entities.StationData;
import IStationDocument = Entities.IStationDocument;
import {remoteMongoReverseGeocoderAsync} from "../reverseGeocoderAndSun/remote-mongo-reverse-geocoder";
import {toPairs} from 'lodash'

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
        const arrayResults: StationData[] = await Observable.from(StationResolver.jsonUrls).flatMap(url =>
            json.getHttpRequestAsync<any>(`${url}&${Math.random() % 420}`, 1500)
                .catch(x => Observable.of<any>({})))
            .map(x => toPairs(x).map((y: any) => {return {
                latLon: [y[1][1], y[1][0]],
                name: y[1].c,
                sId: Number(y[0])
            }}))
            .merge(1).reduce((acc, value) => acc.concat(value), []).toPromise();

        logger.sendNormalMessage(0, 0, "Stations", `Stations are downloaded`, false);

        const alteredResults = await Observable.from(arrayResults).map(x =>
            StationsMongoModel.findOne({
                sId: x.sId,
                latLon: {"$ne": x.latLon}
            }).toObservable().filter(y => !!y).map(result => StationsMongoModel.update({
                sId: x.sId,
            }, {"$unset": {location: true}, latLon: x.latLon}).toObservable())
        ).merge(4).reduce((acc, value) => {
            acc.push(value);
            return acc;
        }, []).toPromise();

        logger.sendNormalMessage(0, 0, `Stations`, `Altered stations: ${_.compact(alteredResults).length}`, false);

        await Observable.from(arrayResults).map(x =>
            StationsMongoModel.update({sId: x.sId}, x, {upsert: true}).toObservable()
        ).merge(4).reduce((acc, value) => {
            acc.push(value);
            return acc;
        }, []).toPromise();

        const untouched = await StationsMongoModel.find({
            "$and": [
                {latLon: {"$size": 2}},
                {location: {"$exists": false}}]
        });


        const geoResultsWithData : IStationDocument[]= await Observable.from(untouched).flatMap(x =>
            Observable.fromPromise(remoteMongoReverseGeocoderAsync.getGeoInformation(x.latLon)).map(locRes => {
                x.location = locRes;
                return x;
            })
        ).merge(4).reduce((acc, value) => {
            acc.push(value);
            return acc;
        }, []).toPromise();


        const updatedStations = await Observable.from(geoResultsWithData)
            .flatMap(station =>
                StationsMongoModel.update({sId: station.sId}, {location: station.location})
                    .toObservable()).merge(4).reduce((acc, value) => {
                acc.push(value);
                return acc;
            }, []).toPromise();

        logger.sendNormalMessage(0, 0, `Stations`, `Updated stations: ${updatedStations.length}`, false);
    }
}

export const stationResolver: Modules.IStationResolver = new StationResolver();