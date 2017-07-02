import {Entities} from "../interfaces/entities";
import * as _ from "lodash";
export module StatUtils {
    import IMinutelyStatDocument = Entities.IMinutelyStatDocument;
    export function getFlatTenMinStatistics(result): any[] {
        return result.map(elem => {
            let countryStat = _(elem.data).toPairs().orderBy([x => x[1], x => x[0]], ['desc', 'asc']).value();
            return [elem.timeStart.getTime(), elem.all, countryStat];
        });
    }

    export function getFlatAllStatistics(results: any): any[][] {
        const allCountryData: any = {};
        results.forEach(statElem => {
            for (let country in statElem.data) {
                if (statElem.data.hasOwnProperty(country)) {
                    if (!allCountryData[country]) {
                        allCountryData[country] = statElem.data[country];
                    } else {
                        allCountryData[country].c += statElem.data[country].c;
                        if (allCountryData[country].l < statElem.data[country].l) {
                            allCountryData[country].l = statElem.data[country].l;
                        }
                    }
                }
            }
        });
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