﻿import {IUserAuthenticationData, IUserDocument, IUserSession} from "../interfaces/entities";
import * as mongo from "../mongo/mongoDbSchemas";
const mongoose = require('mongoose');
/*
 Egy felhasználót hitelesít.
 */
export module UserAuthentication {

    export enum State {
        NoUser, OK
    }
    export async function authUserAsync(userSession: IUserSession | IUserAuthenticationData): Promise<IUserDocument> {
        try {
            const userResult = <IUserDocument[]>await mongo.UserMongoModel.aggregate([
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
        } catch (error) {
            return Promise.reject(error);
        }
    }
}
