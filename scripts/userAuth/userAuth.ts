import * as mongo from "../mongo/mongoDbSchemas";
import {Entities} from "../interfaces/entities";
const mongoose = require('mongoose');
/*
 Egy felhasználót hitelesít.
 */
export module UserAuthentication {
    import IUserSession = Entities.IUserSession;
    import IUser = Entities.IUser;
    import IUserAuthenticationData = Entities.IUserAuthenticationData;
    import IUserDocument = Entities.IUserDocument;

    export enum State {
        NoUser, OK
    }
    export async function authUserAsync(userSession: IUserSession | IUserAuthenticationData): Promise<IUserDocument> {
        try {
            let userResult = <IUserDocument[]>await mongo.UserMongoModel.aggregate([
                {
                    $match: {
                        '_id': new mongoose.mongo.ObjectId(userSession.uid),
                        'logIns': {'$elemMatch': {'_id': new mongoose.mongo.ObjectId(userSession.sid)}}
                    }
                },
                {
                    $limit: 1
                },
                {
                    $project: {
                        "password": 0,
                    }
                }
            ]);
            if (userResult.length === 0) {
                return Promise.reject(State.NoUser);
            }
            return Promise.resolve(userResult[0]);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
}