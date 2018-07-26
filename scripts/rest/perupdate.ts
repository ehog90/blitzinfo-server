import * as express from 'express';
import {locationUpdaterInstance} from "../databaseSaver/locationUpdater";
import {IDeviceUpdateRequest, LocationUpdateSource} from "../interfaces/entities";


export function periodicUpdate(req: IDeviceUpdateRequest, res: express.Response) {
    locationUpdaterInstance.insertLastLocationSubject.next({ updater: LocationUpdateSource.PeriodicQuery, deviceData: req.body });
    res.json({ state: 'PERIODIC_UPDATE_TRIGGERED: ' + JSON.stringify(req.body) });
}
