import * as mongo from "../mongo/mongoDbSchemas";
import {Entities} from "../interfaces/entities";


/*
 Egy felhasználót hitelesít.
 */
export module UserAuthentication {
    import IUserSession = Entities.IUserSession;
    import IUser = Entities.IUser;
    export enum State {
        NoUser, Database, OK
    }

    //TODO: Get rid of this.
    export function authUser(userSession: IUserSession, callback: (error: State, userData: IUser) => void) {
        mongo.UserMongoModel.findOne({
            '_id': userSession.uid,
            'logIns': {'$elemMatch': {'_id': userSession.sid}}
        }).exec((userError, userResult) => {
            if (userError) {
                callback(State.Database, null);
            }
            else if (userResult == null) {
                callback(State.NoUser, null);
            } else {
                callback(State.OK, userResult);
            }
        });
    }

    export async function authUserAsync(userSession: IUserSession): Promise<IUser> {
        try {
            let userResult = await mongo.UserMongoModel.findOne({
                '_id': userSession.uid,
                'logIns': {'$elemMatch': {'_id': userSession.sid}}
            });
            if (!userResult) {
                return Promise.reject(State.NoUser);
            }
            return Promise.resolve(userResult);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
}