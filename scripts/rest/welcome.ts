import * as express from 'express';
/*
    REST: Üdvözlő konténer.
*/
export function welcome(req: express.Request, res: express.Response): any {
    res.render("main.jade", {});
}