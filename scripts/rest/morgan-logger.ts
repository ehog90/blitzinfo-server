import * as express from 'express'
import {logger} from "../logger/logger";

export function customMorganLogger (req: express.Request, res: express.Response, arg?: string | number | boolean): string {
    if (res.statusCode === 500) {
        logger.sendErrorMessage(0, 0, "Morgan HTTP Logging", `${req.method} Reguest on: ${req.url}, params: ${JSON.stringify(req.params)}, status code: ${res.statusCode}`, false);;
    }
    else if (res.statusCode >= 400) {
        logger.sendWarningMessage(0, 0, "Morgan HTTP Logging", `${req.method} Reguest on: ${req.url}, params: ${JSON.stringify(req.params)}, status code: ${res.statusCode}`, false);
    } else {
        logger.sendNormalMessage(22, 255, "Morgan HTTP Logging", `${req.method} Reguest on: ${req.url}, params: ${JSON.stringify(req.params)}, status code: ${res.statusCode}`, false);
    }
    return "";
}