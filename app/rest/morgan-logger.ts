import * as express from 'express';
import {loggerInstance} from "../services";

export function customMorganLogger(req: express.Request, res: express.Response, arg?: string | number | boolean): string {
    if (res.statusCode === 500) {
        loggerInstance.sendErrorMessage(0, 0, "Morgan HTTP Logging",
            `${req.method} Reguest on: ${req.url}, params: ${JSON.stringify(req.params)}, status code: ${res.statusCode}`, false);
    } else if (res.statusCode >= 400) {
        loggerInstance.sendWarningMessage(0, 0, "Morgan HTTP Logging",
            `${req.method} Reguest on: ${req.url}, params: ${JSON.stringify(req.params)}, status code: ${res.statusCode}`, false);
    } else {
        loggerInstance.sendNormalMessage(22, 255, "Morgan HTTP Logging",
            `${req.method} Reguest on: ${req.url}, params: ${JSON.stringify(req.params)}, status code: ${res.statusCode}`, false);
    }
    return "";
}
