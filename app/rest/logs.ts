import * as express from 'express';
import { IErrorRequest } from '../contracts/entities';
import * as mongo from '../database/mongoose-schemes';

/*
REST: A rendszernapló egy bizonyos részét adja vissza, több szűrési feltétellel.
*/
export function errors(req: IErrorRequest, res: express.Response) {
   req.params.type = req.params.type.toUpperCase();
   if (isNaN(req.params.time)) {
      req.params.time = 60;
   }
   const query: any = {};
   if (req.params.type !== 'ALL') {
      query['messageParts.msgType'] = req.params.type;
   }
   query.time = {};
   query.time.$gt = new Date(new Date().getTime() - req.params.time * 60 * 1000);

   mongo.LogsMongoModel.where(query)
      .sort({ time: -1 })
      .exec((error, results) => {
         if (error) {
            res.json([]);
         } else {
            res.json(results);
         }
      });
}
