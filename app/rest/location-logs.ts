import * as express from 'express';
import * as _ from 'lodash';

import { ILocationLogsRequest } from '../contracts/entities';
import * as mongo from '../database/mongoose-schemes';
import { toLogsJson } from '../helpers';

export async function locationLogsForUser(req: ILocationLogsRequest, res: express.Response) {
   const request = req.body;
   if (request.se.did !== undefined) {
      let results = await mongo.LocationLogMongoModel.find({
         did: request.se.did,
         timeLast: { $gt: new Date().getTime() - 7 * 24 * (60 * 60 * 1000) },
      });
      results = _.orderBy(results, ['timeLast'], ['desc']).map((x) => toLogsJson(x));
      res.json(results);
   } else {
      res.json([]);
   }
}
