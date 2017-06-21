import * as express from 'express';
import { UserAuthentication } from "../userAuth/userAuth";
import {Modules} from "../interfaces/modules";
import ILocationUpdater = Modules.ILocationUpdater;
import {Entities} from "../interfaces/entities";
import IUser = Entities.IUser;
import IDeviceUpdateRequest = Entities.IDeviceUpdateRequest;



let locationUpdater: ILocationUpdater;
/*
REST: Egy eszköz periódikus helyzetfrissítését valósítja meg.
*/

export function setLocationUpdater(locationUpdaterToUpdate: Modules.ILocationUpdater) {
    locationUpdater = locationUpdaterToUpdate;
}

export function periodicUpdate(req: IDeviceUpdateRequest, res: express.Response) {
    try {
        UserAuthentication.authUser(req.body.se, (state: UserAuthentication.State, user: IUser) => {
            if (state === UserAuthentication.State.OK) {

                locationUpdater.insertLastLocationSubject.onNext({ updater: "PERIODIC", deviceData: req.body });
                res.json({ state: 'PERIODIC_UPDATE_TRIGGERED: '+JSON.stringify(req.body) });
            } else {
                res.json({ state: `AUTH_ERROR` });
            }
        });
    } catch (exc) {
        res.json({ state: 'OTHER_ERROR' });
    }
}