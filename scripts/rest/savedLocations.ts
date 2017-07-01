import * as express from 'express';
import * as mongo from "../mongo/mongoDbSchemas";
import {UserAuthentication}  from "../userAuth/userAuth";
import {Modules} from "../interfaces/modules";
import ILocationUpdater = Modules.ILocationUpdater;
import {Entities} from "../interfaces/entities";
import IUserDataRequest = Entities.IUserDataRequest;
import INewSavedLocationInstance = Entities.INewSavedLocationInstance;
import IRemoveSavedLocationInstance = Entities.IRemoveSavedLocationInstance;
import {locationUpdater} from "../databaseSaver/locationUpdater";

export async function getLocationsForUser(req: IUserDataRequest, res: express.Response) {
    let locResult = await mongo.SavedLocationMongoModel.find({ 'uid': req.authContext._id });
    res.json(locResult);
}
export async function newLocationInstance(req: INewSavedLocationInstance, res: express.Response) {
    let existingResult = await mongo.SavedLocationMongoModel.findOne({ 'uid': req.authContext._id, 'name': { '$regex': new RegExp(["^" + req.body.name.toLowerCase() + "$"].join(""), "i") } });
    if (!existingResult)
    {
        let result = await locationUpdater.reverseGeocodeWithCountryAsync(req.body.latLon);
        let toInsert = new mongo.SavedLocationMongoModel({
            uid: req.authContext._id,
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
        await toInsert.save();
        res.json({ state: "OK" });
    }
    else {
        res.statusCode = 501;
        res.json({ state: "ERROR", error: "NAME_EXISTS" });
    }
}

export async function removeLocationInstance(req: IRemoveSavedLocationInstance, res: express.Response) {
    const locationId = req.params['locationId'];
    let deletionResult = await mongo.SavedLocationMongoModel.remove({ '_id': locationId, 'uid': req.authContext._id });
    res.json({ state: "OK", deleteResult: deletionResult });
} 