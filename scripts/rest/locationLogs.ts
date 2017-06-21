import * as express from 'express';
import {JsonUtils} from '../utils/jsonUtils';
import * as mongo from "../mongo/mongoDbSchemas";
import {UserAuthentication}  from "../userAuth/userAuth";
import {Enumerable} from 'ix';
import {Entities} from "../interfaces/entities";
import ILocationLogsRequest = Entities.ILocationLogsRequest;
/*
REST: A felhasználó eszközének történelmi helyzeteit adja vissza, hitelesítéssel.
*/
export function locationLogsForUser(req: ILocationLogsRequest, res: express.Response) {
    try {
        UserAuthentication.authUser(req.body.se, (state: UserAuthentication.State) => {
            if (state === UserAuthentication.State.OK) {
                const request = req.body;
                if (request.se.did != undefined) {
                    mongo.LocationLogMongoModel.find({ 'did': request.se.did, 'timeLast': { '$gt': new Date().getTime() - (7 * 24 * (60 * 60 * 1000)) } }).exec((error, results: Array<Entities.IDeviceLocationLog>) => {
                        if (!error) {
                            results = Enumerable.fromArray(results).orderBy(x => x.timeLast).toArray();
                            const resultData: any[] = [];
                            results.forEach((elem) => {
                                resultData.push(JsonUtils.toLogsJson(elem));
                            });
                            res.json(Enumerable.fromArray(resultData).orderByDescending(x => x[2]).toArray());
                        } else {
                            res.json({ state: 'DB_ERROR' });
                        }

                    });
                } else {
                    res.json([]);
                }
            } else {
                res.json({ state: 'AUTH_ERROR' });
            }
        });
    } catch (exc) {
        res.json({ state: 'OTHER_ERROR' });
    }

}