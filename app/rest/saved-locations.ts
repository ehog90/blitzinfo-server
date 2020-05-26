import * as express from 'express';
import {
   INewSavedLocationInstance,
   IRemoveSavedLocationInstance,
   IUserDataRequest,
} from '../contracts/entities';
import * as mongo from '../database/mongoose-schemes';
import { locationUpdaterInstance } from '../services';

export async function getLocationsForUser(req: IUserDataRequest, res: express.Response) {
   const locResult = await mongo.SavedLocationMongoModel.find({ uid: req.authContext._id });
   res.json(locResult);
}

export async function newLocationInstance(req: INewSavedLocationInstance, res: express.Response) {
   const existingResult = await mongo.SavedLocationMongoModel.findOne({
      uid: req.authContext._id,
      name: { $regex: new RegExp(['^' + req.body.name.toLowerCase() + '$'].join(''), 'i') },
   });
   if (!existingResult) {
      const result = await locationUpdaterInstance.reverseGeocodeWithCountryAsync(req.body.latLon);
      const toInsert = new mongo.SavedLocationMongoModel({
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
      res.json({ state: 'OK' });
   } else {
      res.statusCode = 501;
      res.json({ state: 'ERROR', error: 'NAME_EXISTS' });
   }
}

export async function removeLocationInstance(req: IRemoveSavedLocationInstance, res: express.Response) {
   const locationId = req.params.locationId;
   const deletionResult = await mongo.SavedLocationMongoModel.remove({
      _id: locationId,
      uid: req.authContext._id,
   });
   res.json({ state: 'OK', deleteResult: deletionResult });
}
