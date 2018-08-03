import * as express from 'express';
import {IFlagsRequest} from "../contracts/entities";

/*
REST API-k hibakezelése.
*/
export function errorHandler(error: any, req: IFlagsRequest, res: express.Response) {
    res.status(error.status || 500);
    res.end(JSON.stringify({ error: 'EXPRESS_ERROR' }));
}
