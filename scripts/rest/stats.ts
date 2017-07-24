import * as express from 'express';
import * as mongo from "../mongo/mongoDbSchemas";
import {StatUtils} from "../utils/statUtils"
import {Entities} from "../interfaces/entities";
import IMinutelyStatDocument = Entities.IMinutelyStatDocument;
import IAllStatDocument = Entities.IAllStatDocument;

/*
    REST: 10 perces statisztikák bizonyos órára visszamenőleg.
*/
export function tenminStats(req: express.Request, res: express.Response): any {

    let time: number = 24;
    if (!isNaN(Number(req.params.hours))) {
        time = Number(req.params.hours);
    }
    mongo.TenminStatMongoModel.find({}).sort({ timeStart: -1 }).limit(time * 6).lean().exec((error, result) => {
        res.end(JSON.stringify(StatUtils.getFlatTenMinStatistics(result)));
    });
}
/*
    REST: A jelenlegi év statisztikája.
*/
export function currentUTCYearStats(req: express.Request, res: express.Response) {

    let year = new Date().getUTCFullYear();
    mongo.AllStatMongoModel.findOne({ isYear: true, period: year.toString() }).lean().exec((error, result: IAllStatDocument) => {
        res.end(JSON.stringify(StatUtils.processStatResult(result.data)));
    });
}
/*
    REST: Összesített statisztika.
*/
export function overallStats(req: express.Request, res: express.Response) {
    mongo.AllStatMongoModel.findOne({ isYear: false, period: 'all' }).lean().exec((error, result: IAllStatDocument) => {
        res.end(JSON.stringify(StatUtils.processStatResult(result.data)));
    });
}

/*
    REST: Az utolsó N perc statisztikája.
*/
export async function lastMinutesStatistics(req: express.Request, res: express.Response) {
    let minutes: number = 60;
    if (!isNaN(Number(req.params.hours))) {
        minutes = Number(req.params.hours);
    }
    if (minutes > 2880) {
        minutes = 2880;
    }
    let results = await mongo.MinStatMongoModel.find({ 'timeStart': { '$gt': new Date().getTime() - ((minutes + 1) * 60 * 1000) } }).lean();
    res.json(StatUtils.getFlatAllStatistics(results))
}