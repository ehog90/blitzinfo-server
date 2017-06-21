/**
 * Created by ehog on 2016. 11. 06..
 */

import {logger} from "../logger/logger";

export function logMongoErrors(error: any): void {
    if (!error) {

    }
    else {
        logger.sendErrorMessage(0, 0, "MongoDB", `Database error: ${error.toString()}`, false);
    }
}