import * as geoUtils from "../utils/geo";
import * as mongo from "../mongo/mongoDbSchemas";
import {databaseSaver} from "../databaseSaver/databaseSaver";
import {logger} from "../logger/logger";
import {customHttpRequestAsync} from "../utils/httpQueries";
import {firebaseSettings} from "../utils/firebase";
import {Entities} from "../interfaces/entities";
import {Modules} from "../interfaces/modules";
import IStroke = Entities.IStroke;
import ISavedLocation = Entities.ISavedLocation;
import IStrokeWithSavedLocation = Entities.IStrokeWithSavedLocation;
import IFcmStrokeSavedLocation = Entities.IFcmStrokeSavedLocation;
import IDeviceLocationRecent = Entities.IDeviceLocationRecent;
import IStrokeWithDistance = Entities.IStrokeWithDistance;
import IFcmStrokeLastLocation = Entities.IFcmStrokeLastLocation;
import ILogger = Modules.ILogger;
import IDatabaseSaver = Modules.IDatabaseSaver;
import IFirebaseService = Modules.IFirebaseService;
import {Subject} from "rxjs/Subject";

class FirebaseService implements IFirebaseService {
    private lastDataFromDatabase: Subject<IStroke>;
    private static NOTIF_TIMEOUT: number = 1000 * 60 * 60;
    private static DEVICE_TIMEOUT: number = 1000 * 60 * 60;


    constructor(private logger: ILogger, databaseSaver: IDatabaseSaver) {
        this.lastDataFromDatabase = databaseSaver.lastSavedStroke;
        this.lastDataFromDatabase.subscribe(stroke => this.strokeReceived(stroke));
    }

    /* ha a távolság nagyobb, mint 51, akkor az értéke 999 lesz, ha 20 és 50 között, 20, ha annál kisebb, 0.*/
    private static getNotificationClass(distance: number): number {
        if (distance > 50) {
            return 999;
        } else if (distance <= 50 && distance > 20) {
            return 20;
        }
        return 0;
    }

    private static getTrimmedStroke(stroke: IStroke): IStroke {
        return {
            blitzortungId: stroke.blitzortungId,
            latLon: stroke.latLon,
            sunData: stroke.sunData,
            time: stroke.time,
            locationData: stroke.locationData
        };

    }


    private async updateDatabaseAndNotifyForSavedLocations(savedLocation: ISavedLocation,
                                                           strokeWithDistance: IStrokeWithSavedLocation) {
        const strokeToInsert = FirebaseService.getTrimmedStroke(strokeWithDistance.s);
        try {
            await mongo.SavedLocationMongoModel.update(
                {
                    '_id': savedLocation._id
                },
                {
                    'lastInAlertZone': strokeWithDistance.s.time,
                    'lastAlert': strokeWithDistance,
                    '$push': {'alerts': strokeToInsert}
                });

            const devices = await mongo.LocationRecentMongoModel.find({
                'userData.uid': savedLocation.uid,
                'timeLast': {'$gt': new Date(new Date().getTime() - FirebaseService.DEVICE_TIMEOUT)}
            });

            devices.forEach(async device => {
                const fcmMessage: IFcmStrokeSavedLocation = {
                    time_to_live: 300,
                    registration_ids: [device.did],
                    data: {
                        message: {
                            mtype: "STROKE_SAVEDLOC",
                            data: strokeWithDistance
                        }
                    }
                };
                await customHttpRequestAsync(firebaseSettings, fcmMessage).toPromise()
            });


        }
        catch (error) {

        }
    }

    private static async updateDatabaseAndNotifyForCurrentLocations(device: IDeviceLocationRecent,
                                                                    strokeWithDistance: IStrokeWithDistance) {

        const trimmedStroke = FirebaseService.getTrimmedStroke(strokeWithDistance.s);
        await mongo.LocationRecentMongoModel.update(
            {
                'did': device.did
            },
            {
                'lastInAlertZone': trimmedStroke.time,
                'lastAlert': strokeWithDistance
            });
        await mongo.LocationLogMongoModel.update({'_id': device.lastLogId},
            {'$push': {alerts: trimmedStroke}});

        const fcmMessage: IFcmStrokeLastLocation = {
            time_to_live: 300,
            registration_ids: [device.did],
            data: {
                message: {
                    mtype: "STROKE",
                    data: strokeWithDistance,
                }
            }
        };
        await customHttpRequestAsync(firebaseSettings, fcmMessage).toPromise()
    }

    private static async updateDatabaseForRecentLocation(device: IDeviceLocationRecent,
                                                         strokeWithDistance: IStrokeWithDistance) {
        await mongo.LocationRecentMongoModel.update(
            {
                'did': device.did
            },
            {
                'lastInAlertZone': strokeWithDistance.s.time
            },
            () => {

            });
    }

    private static async updateDatabaseForSavedLocation(savedLocation: ISavedLocation,
                                                        strokeWithDistance: IStrokeWithSavedLocation) {
        await mongo.SavedLocationMongoModel.update(
            {
                '_id': savedLocation._id
            },
            {
                'lastInAlertZone': strokeWithDistance.s.time
            },
            () => {

            });
    }

    private async checkRecentLocations(stroke: IStroke) {
        const now = new Date();
        const devices = <IDeviceLocationRecent[]>await mongo.LocationRecentMongoModel.aggregate(
            [
                {
                    '$geoNear': {
                        limit: 1500,
                        near: {type: "Point", coordinates: stroke.latLon},
                        distanceField: "dist",
                        includeLocs: "latLon",
                        spherical: true,
                        maxDistance: 50000.0
                    }
                },
                {
                    '$addFields': {
                        dist: {
                            '$divide': ['$dist', 1000]
                        }
                    }
                },
                {
                    '$match': {
                        'timeLast': {
                            '$gt': new Date(new Date().getTime() - FirebaseService.DEVICE_TIMEOUT)
                        }
                    }
                },
            ]);

        await devices.forEach(async device => {
            const strokeWithDistance: IStrokeWithDistance =
                {
                    s: stroke,
                    dist: device.dist,
                    nc: FirebaseService.getNotificationClass(device.dist),
                    dLatLon: device.latLon
                };
            if (device.lastAlert == null) {
                await FirebaseService.updateDatabaseAndNotifyForCurrentLocations(device, strokeWithDistance);
            } else {
                const distanceFromPrevious: number = geoUtils
                    .getDistance(device.lastAlert.s.latLon, device.lastAlert.dLatLon);
                if (device.lastInAlertZone.getTime() < now.getTime() - FirebaseService.NOTIF_TIMEOUT) {
                    await FirebaseService.updateDatabaseAndNotifyForCurrentLocations(device, strokeWithDistance);
                } else {
                    if (FirebaseService.getNotificationClass(distanceFromPrevious) >
                        FirebaseService.getNotificationClass(strokeWithDistance.dist)) {
                        await FirebaseService.updateDatabaseAndNotifyForCurrentLocations(device, strokeWithDistance);
                    } else if (FirebaseService.getNotificationClass(distanceFromPrevious) ===
                        FirebaseService.getNotificationClass(strokeWithDistance.dist)) {
                        await FirebaseService.updateDatabaseForRecentLocation(device, strokeWithDistance);
                    }
                }
            }

        });
    }

    private async checkSavedLocations(stroke: IStroke) {
        const now = new Date();
        const savedLocations = <ISavedLocation[]>await mongo.SavedLocationMongoModel.aggregate([
            {
                '$geoNear': {
                    limit: 1500,
                    near: {type: "Point", coordinates: stroke.latLon},
                    distanceField: "dist",
                    includeLocs: "latLon",
                    spherical: true,
                    maxDistance: 50000.0
                },
            },
            {
                '$addFields': {
                    dist: {
                        '$divide': ['$dist', 1000]
                    }
                }
            }
        ]);


        savedLocations.forEach(async savedLocation => {
            const strokeWithSavedLocation: IStrokeWithSavedLocation =
                {
                    s: stroke,
                    dist: savedLocation.dist,
                    nc: FirebaseService.getNotificationClass(savedLocation.dist),
                    savedLoc: {latLon: savedLocation.latLon, name: savedLocation.name}
                };
            if (!savedLocation.lastAlert) {
                await this.updateDatabaseAndNotifyForSavedLocations(savedLocation, strokeWithSavedLocation);
            } else {
                const distanceFromPrevious: number = geoUtils
                    .getDistance(savedLocation.lastAlert.s.latLon, savedLocation.latLon);
                if (savedLocation.lastInAlertZone.getTime() < now.getTime() - FirebaseService.NOTIF_TIMEOUT) {
                    await this.updateDatabaseAndNotifyForSavedLocations(savedLocation, strokeWithSavedLocation);
                } else {
                    if (FirebaseService.getNotificationClass(distanceFromPrevious) >
                        FirebaseService.getNotificationClass(strokeWithSavedLocation.dist)) {
                        await this
                            .updateDatabaseAndNotifyForSavedLocations(savedLocation,
                                strokeWithSavedLocation);
                    } else if (FirebaseService.getNotificationClass(distanceFromPrevious) ===
                        FirebaseService.getNotificationClass(strokeWithSavedLocation.dist)) {
                        await FirebaseService.updateDatabaseForSavedLocation(savedLocation, strokeWithSavedLocation);
                    }
                }
            }

        });
    }

    public invoke(): void {

    }

    private async strokeReceived(stroke: IStroke) {
        await this.checkRecentLocations(stroke);
        await this.checkSavedLocations(stroke);
    }
}

export const firebaseService: IFirebaseService = new FirebaseService(logger, databaseSaver);
