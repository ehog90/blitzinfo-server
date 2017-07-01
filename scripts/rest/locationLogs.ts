import * as express from 'express';
import {JsonUtils} from '../utils/jsonUtils';
import * as mongo from "../mongo/mongoDbSchemas";
import {Entities} from "../interfaces/entities";
import ILocationLogsRequest = Entities.ILocationLogsRequest;
import * as _ from "lodash";



export async function locationLogsForUser(req: ILocationLogsRequest, res: express.Response) {
    const request = req.body;
    if (request.se.did != undefined) {
        let results = await mongo.LocationLogMongoModel.find({ 'did': request.se.did, 'timeLast': { '$gt': new Date().getTime() - (7 * 24 * (60 * 60 * 1000)) } });
        results = _.orderBy(results,['timeLast'],['desc']).map(x => JsonUtils.toLogsJson(x));
        res.json(results);
    } else {
        res.json([]);
    }
}