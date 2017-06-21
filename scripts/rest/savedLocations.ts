import * as express from 'express';
import * as mongo from "../mongo/mongoDbSchemas";
import {UserAuthentication}  from "../userAuth/userAuth";
import {Modules} from "../interfaces/modules";
import ILocationUpdater = Modules.ILocationUpdater;
import {Entities} from "../interfaces/entities";
import IUserDataRequest = Entities.IUserDataRequest;
import INewSavedLocationInstance = Entities.INewSavedLocationInstance;
import IRemoveSavedLocationInstance = Entities.IRemoveSavedLocationInstance;

let locationUpdater: ILocationUpdater;

export function setLocationUpdater(locationUpdaterToUpdate: ILocationUpdater) {
    locationUpdater = locationUpdaterToUpdate;
}
/*
    REST: Egy felhasználó mentett helyeit adja vissza.
*/
export async function getLocationsForUser(req: IUserDataRequest, res: express.Response) {
    try {
        let user = await UserAuthentication.authUserAsync(req.body);
        let locResult = await mongo.SavedLocationMongoModel.find({ 'uid': req.body.uid });
        res.json(locResult);
    }
    catch (error) {
        res.statusCode = 501;
        res.end();
    }
}
/*
    REST: Egy felhasználó új helyet menthet el.
*/
export async function newLocationInstance(req: INewSavedLocationInstance, res: express.Response) {
    try {
        let user = await UserAuthentication.authUserAsync(req.body.se);
        let existingResult = await mongo.SavedLocationMongoModel.findOne({ 'uid': req.body.se.uid, 'name': { '$regex': new RegExp(["^" + req.body.name.toLowerCase() + "$"].join(""), "i") } });
        if (!existingResult)
        {
            let result = await locationUpdater.reverseGeocodeWithCountryAsync(req.body.latLon);
            let toInsert = new mongo.SavedLocationMongoModel({
                uid: req.body.se.uid,
                latLon: req.body.latLon,
                location: result.locationData,
                hunData: result.hungarianData,
                name: req.body.name,
                type: req.body.type,
                alerts: [],
                meteoAlerts: [],
                lastAlert: null,
                lastInAlertZone: null,
            });
            let insertionResult = toInsert.save();
            res.json({ state: "OK" });
        }
        else {
            res.statusCode = 501;
            res.json({ state: "ERROR", error: "NAME_EXISTS" });
        }
    } catch (exc) {
        res.statusCode = 501;
        res.json({  state: "ERROR", error: "OTHER_ERROR" });
    }
}

/*
    REST: Egy felhasználó eltávolíthat egy helyet.
*/
export function removeLocationInstance(req: IRemoveSavedLocationInstance, res: express.Response) {
    try {
        UserAuthentication.authUser(req.body.se, (state: UserAuthentication.State, user: Entities.IUser) => {
            if (state === UserAuthentication.State.OK) {
                mongo.SavedLocationMongoModel.remove({ '_id': req.body.savedLocationId, 'uid': req.body.se.uid }).exec((error, status) => {
                    if (error) {
                        res.statusCode = 501;
                        res.json({ state: "DB_ERROR" });
                    } else {
                        res.json({ state: "OK" });
                    }
                });
            } else {
                res.statusCode = 501;
                res.json({state: "AUTH_ERROR" });
            }
        });
    } catch (exc) {
        res.statusCode = 501;
        res.json({ state: "OTHER_ERROR" });
    }

        
} 