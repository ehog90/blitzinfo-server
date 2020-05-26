import * as express from 'express';
import { IDeviceUpdateRequest, LocationUpdateSource } from '../contracts/entities';
import { locationUpdaterInstance } from '../services';

export function periodicUpdate(req: IDeviceUpdateRequest, res: express.Response) {
   locationUpdaterInstance.insertLastLocationSubject.next({
      updater: LocationUpdateSource.PeriodicQuery,
      deviceData: req.body,
   });
   res.json({ state: 'PERIODIC_UPDATE_TRIGGERED: ' + JSON.stringify(req.body) });
}
