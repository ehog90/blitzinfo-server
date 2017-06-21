/**
 * Created by ehog on 2016. 11. 12..
 */
import * as express from "express";
import {UserAuthentication} from "../userAuth/userAuth";

export async function baseMiddleware (req: express.Request, res: express.Response, next) {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'application/json');
    if (req.url.startsWith('/auth')) {
        try {
            const authResults = await UserAuthentication.authUserAsync(req.body.se);
            next()
        }
        catch (exc) {
            if (exc == UserAuthentication.State.NoUser) {
                res.statusCode = 401;
                res.json({error: "Unauthorized access"});
            }
            else {
                res.statusCode = 500;
                res.json({error: "Server error"});
            }
        }
    }
    else {
        next();
    }
}

export function authTest(req: express.Request, res: express.Response) {
    res.json({status: 'OK'});
}