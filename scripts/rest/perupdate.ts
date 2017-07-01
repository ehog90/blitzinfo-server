import * as express from 'express';
import {Modules} from "../interfaces/modules";
import ILocationUpdater = Modules.ILocationUpdater;
import {Entities} from "../interfaces/entities";
import IUser = Entities.IUser;
import IDeviceUpdateRequest = Entities.IDeviceUpdateRequest;
import LocationUpdateSource = Entities.LocationUpdateSource;
import {locationUpdater} from "../databaseSaver/locationUpdater";


export function periodicUpdate(req: IDeviceUpdateRequest, res: express.Response) {
    locationUpdater.insertLastLocationSubject.onNext({ updater: LocationUpdateSource.PeriodicQuery, deviceData: req.body });
    res.json({ state: 'PERIODIC_UPDATE_TRIGGERED: '+JSON.stringify(req.body) });
}