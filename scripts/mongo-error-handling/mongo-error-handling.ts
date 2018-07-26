/**
 * Created by ehog on 2016. 11. 06..
 */

import {loggerInstance} from "../logger/loggerInstance";

export function logMongoErrors(error: any): void {
    if (!error) {

    } else {
        loggerInstance.sendErrorMessage(0, 0, "MongoDB", `Database error: ${error.toString()}`, false);
    }
}
