import * as express from 'express';
import { IAllStatDocument } from '../contracts/entities';
import * as mongo from '../database/mongoose-schemes';
import { StatHelper } from '../helpers';

/*
    REST: 10 perces statisztikák bizonyos órára visszamenőleg.
*/
export function tenminStats(req: express.Request, res: express.Response): any {
   let time = 24;
   if (!isNaN(Number(req.params.hours))) {
      time = Number(req.params.hours);
   }
   mongo.TenminStatMongoModel.find({})
      .sort({ timeStart: -1 })
      .limit(time * 6)
      .lean()
      .exec((error, result) => {
         res.end(JSON.stringify(StatHelper.getFlatTenMinStatistics(result)));
      });
}
/*
    REST: A jelenlegi év statisztikája.
*/
export function currentUTCYearStats(req: express.Request, res: express.Response) {
   const year = new Date().getUTCFullYear();
   mongo.AllStatMongoModel.findOne({ isYear: true, period: year.toString() })
      .lean()
      .exec((error, result: IAllStatDocument) => {
         res.end(JSON.stringify(StatHelper.processStatResult(result.data)));
      });
}
/*
    REST: Összesített statisztika.
*/
export function overallStats(req: express.Request, res: express.Response) {
   mongo.AllStatMongoModel.findOne({ isYear: false, period: 'all' })
      .lean()
      .exec((error, result: IAllStatDocument) => {
         res.end(JSON.stringify(StatHelper.processStatResult(result.data)));
      });
}

/*
    REST: Az utolsó N perc statisztikája.
*/
export async function lastMinutesStatistics(req: express.Request, res: express.Response) {
   let minutes = 60;
   if (!isNaN(Number(req.params.hours))) {
      minutes = Number(req.params.hours);
   }
   if (minutes > 2880) {
      minutes = 2880;
   }
   const results = await mongo.MinStatMongoModel.find({
      timeStart: { $gt: new Date().getTime() - (minutes + 1) * 60 * 1000 },
   }).lean();
   res.json(StatHelper.getFlatAllStatistics(results));
}
