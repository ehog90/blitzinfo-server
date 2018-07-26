import * as express from 'express';
export function welcome(req: express.Request, res: express.Response): any {
    res.render("main.jade", {});
}
