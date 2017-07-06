import * as geoUtils from "../utils/geo";
import * as mongo from "../mongo/mongoDbSchemas";
import {logger} from "../logger/logger";
import {huRegReverseGeocoder} from "../reverseGeocoderAndSun/hungarianReverseGeocoderAsync";
import * as grg from "../reverseGeocoderAndSun/googleReverseGeocoderAsync";
import * as _ from "lodash";
import {Modules} from "../interfaces/modules";
import {Entities} from "../interfaces/entities";
import {Subject} from "rxjs/Subject";
import {Observable} from "rxjs/Observable";
import ILocationUpdater = Modules.ILocationUpdater;
import ILocationUpdateRequest = Entities.ILocationUpdateRequest;
import ILogger = Modules.ILogger;
import IReverseGeocoderAsync = Modules.IReverseGeoCoderAsync;
import IHungarianRegionalReverseGeocoder = Modules.IHungarianRegionalReverseGeoCoder;
import IGeocodingResult = Entities.IGeoCodingResult;
import IHungarianRegionalInformation = Entities.IHungarianRegionalInformation;
import IDeviceUpdateRequestBody = Entities.IDeviceUpdateRequestBody;
import IDeviceLocationLog = Entities.IDeviceLocationLog;
import ILocationLogResult = Entities.ILocationLogResult;
import IDeviceLocationRecent = Entities.IDeviceLocationRecent;
import LocationUpdateSource = Entities.LocationUpdateSource;

/* A felhasználói helyzeteket kezelő osztály.
 A megadott felhasználói adatok szerint frissíti az eszköz helyzetét a történeti, és legutolsó helyadatok között.
 */

export class LocationUpdater implements ILocationUpdater {

    public insertLastLocationSubject: Subject<ILocationUpdateRequest>;

    constructor(private logger: ILogger,
                private reverseGeoCoder: IReverseGeocoderAsync,
                private hungarianRegionalReverseGeocoder: IHungarianRegionalReverseGeocoder) {
        this.insertLastLocationSubject = new Subject<ILocationUpdateRequest>();
        this.insertLastLocationSubject
            .buffer(Observable.interval(5000))
            .subscribe(x => this.processLocationBuffer(x));

    }


    public async reverseGeocodeWithCountryAsync(latLon: number[]): Promise<IGeocodingResult> {
        try {
            const currentLocation = await this.reverseGeoCoder.getGeoInformation(latLon);
            const hungarianData = await this.hungarianRegionalReverseGeocoder.getRegionalInformation(latLon);
            return Promise.resolve({
                locationData: currentLocation,
                hungarianData: hungarianData
            })
        }
        catch (error) {
            return Promise.reject(error);
        }

    }


    public getHungarianData(latLon: number[]): Promise<IHungarianRegionalInformation> {
        return this.hungarianRegionalReverseGeocoder.getRegionalInformation(latLon);
    }


    private async processLocationBuffer(items: ILocationUpdateRequest[]): Promise<any> {
        if (items.length > 0) {
            _.reverse(items);
            let processed: string[] = [];

            for (let item of items) {
                if (processed.indexOf(item.deviceData.se.did) === -1) {
                    processed.push(item.deviceData.se.did);
                    try {
                        let logResult = await this.insertLastLocationToDatabaseAndUpdate(item.updater, item.deviceData);
                        this.logger
                            .sendNormalMessage(87,
                                57,
                                "Location updater",
                                `${JSON.stringify(item)} ${JSON.stringify(logResult)}`,
                                false);
                    }
                    catch (error) {
                        this.logger.sendErrorMessage(0, 0, "Location updater", error.toString(), false);
                    }

                } else {
                    this.logger.sendWarningMessage(0,
                        0,
                        "Location updater",
                        'Dupe location message: ' + JSON.stringify(item),
                        false);
                }
            }
        }

    }

    private static async saveNewLogToDatabase(updater: LocationUpdateSource,
                                              deviceData: IDeviceUpdateRequestBody,
                                              geocodingResult: IGeocodingResult) {
        let dataToSaveLog: IDeviceLocationLog = {
            num: 1,
            updater: updater,
            accsum: deviceData.acc,
            timeFirst: new Date(),
            timeLast: new Date(),
            latLon: deviceData.latLon,
            location: geocodingResult.locationData,
            did: deviceData.se.did,
            userData: {
                uid: deviceData.se.uid,
                dt: deviceData.dt
            },
            hunData: geocodingResult.hungarianData,
            alerts: []
        };
        try {
            let logLocationToInsert = new mongo.LocationLogMongoModel(dataToSaveLog);
            let savedStroke = await logLocationToInsert.save();
            return Promise.resolve(savedStroke);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }

    private static async saveRecentToDatabase(updater: LocationUpdateSource,
                                              deviceData: IDeviceUpdateRequestBody,
                                              logResult: ILocationLogResult): Promise<IDeviceLocationRecent> {

        let dataToSaveRecent: IDeviceLocationRecent = {
            num: 1,
            updater: updater,
            acc: deviceData.acc,
            timeFirst: new Date(),
            timeLast: new Date(),
            latLon: deviceData.latLon,
            location: logResult.geocodingResult.locationData,
            did: deviceData.se.did,
            userData: {
                uid: deviceData.se.uid,
                dt: deviceData.dt
            },
            hunData: logResult.geocodingResult.hungarianData,
            lastAlert: null,
            lastLogId: logResult.id,
            lastInAlertZone: null
        };
        let recentLocationToInsert = new mongo.LocationRecentMongoModel(dataToSaveRecent);
        try {
            let savedStroke = await recentLocationToInsert.save();
            return Promise.resolve(savedStroke);
        }
        catch (error) {
            return Promise.reject(error);
        }

    }

    private async insertLastLocationToDatabaseAndUpdate(updater: LocationUpdateSource,
                                                        deviceData: IDeviceUpdateRequestBody): Promise<IDeviceLocationRecent> {
        try {

            let logResult = await this.insertLastLocationToDatabase(updater, deviceData);
            let existingData = await mongo.LocationRecentMongoModel.findOne({'did': {'$eq': deviceData.se.did}});
            if (!existingData) {
                let locationRecent = LocationUpdater.saveRecentToDatabase(updater, deviceData, logResult);
                return Promise.resolve(locationRecent);
            }
            else {
                await mongo.LocationRecentMongoModel.update(
                    {'did': {'$eq': deviceData.se.did}},
                    {
                        '$inc': {
                            num: 1
                        },
                        'acc': deviceData.acc,
                        'timeLast': new Date().getTime(),
                        'hunData': logResult.geocodingResult.hungarianData,
                        'location': logResult,
                        'latLon': deviceData.latLon,
                        'updater': updater,
                        'lastLogId': logResult.id
                    });
                return Promise.resolve(null);
            }
        }
        catch (error) {
            return Promise.reject(error);
        }

    }

    private async insertLastLocationToDatabase(updater: LocationUpdateSource, deviceData: IDeviceUpdateRequestBody): Promise<ILocationLogResult> {
        try {
            let existingData = await mongo.LocationLogMongoModel.findOne({'did': {'$eq': deviceData.se.did}}).sort({'timeLast': -1});
            if (!existingData) {
                let locationData = await this.reverseGeocodeWithCountryAsync(deviceData.latLon);
                let saved = await LocationUpdater.saveNewLogToDatabase(updater, deviceData, locationData);
                return Promise.resolve({geocodingResult: locationData, id: saved._id.toString()});
            }
            else if (geoUtils.getDistance(deviceData.latLon, existingData.latLon) < 0.1) {
                await mongo.LocationLogMongoModel.update({_id: existingData._id},
                    {
                        '$inc': {num: 1, accsum: deviceData.acc},
                        'timeLast': new Date().getTime(),
                        'updater': updater
                    });
                let updated = await mongo.LocationLogMongoModel.findOne({_id: existingData._id});
                return Promise.resolve({
                    geocodingResult: {locationData: updated.location, hungarianData: updated.hunData},
                    id: updated._id.toString()
                });
            }
            else {
                let locationData = await this.reverseGeocodeWithCountryAsync(deviceData.latLon);
                let saved = await LocationUpdater.saveNewLogToDatabase(updater, deviceData, locationData);
                return Promise.resolve({geocodingResult: locationData, id: saved._id.toString()});
            }

        } catch (error) {
            return Promise.reject(error);
        }


    }
}
export const locationUpdater: ILocationUpdater = new
LocationUpdater(logger, grg.googleReverseGeoCoder, huRegReverseGeocoder);
