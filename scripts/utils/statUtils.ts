﻿import {Entities} from "../interfaces/entities";
const _ : any = require("lodash");

export module StatUtils {
    import IMinutelyStatDocument = Entities.IMinutelyStatDocument;
    export function getFlatTenMinStatistics(result): any[] {
        return result.map(elem => {
            let countryStat = _(elem.data).toPairs().orderBy([x => x[1], x => x[0]], ['desc', 'asc']).value();
            return [elem.timeStart.getTime(), elem.all, countryStat];
        });
    }

    export function getFlatAllStatistics(results: any): any[][] {
        const allCountryData = _(results).flatMap(x => x.data).reduce((acc, curr) => {
            return _.mergeWith(acc, curr, (obj, src) => {
                if (!obj) {
                    return src;
                }
                obj.c += src.c;
                if (src.l > obj.l) {
                    obj.l = src.l;
                }
                return obj;
            })
        }, {});
        return processStatResult(allCountryData);
    }

    export function processStatResult(result: any): any[][] {
        const arrayResult = _(result).toPairs().map(x => [x[0], x[1]['c'], x[1]['l'], 0]).orderBy([x => x[1], x => x[0]], ['asc', 'asc']).value();
        const allCount = _.sumBy(arrayResult, x => x[1]);
        arrayResult.forEach(elem => {
            elem[3] = parseFloat(((elem[1] / allCount) * 100).toFixed(7));
        });
        return arrayResult;
    }
}