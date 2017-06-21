import {Enumerable} from 'ix';
import {Entities} from "../interfaces/entities";
/*
    Statisztikákat készíti elő a küldésre, megfelelő formátumúra alakítva azokat.
*/

export module StatUtils {
    import IMinutelyStatDocument = Entities.IMinutelyStatDocument;
    export function getFlatTenMinStatistics(result: Array<IMinutelyStatDocument>): any[] {
        const arrayResult = [];
        result.forEach(elem => {
            let row: any = [elem.timeStart.getTime(), elem.all, []];
            for (let country in elem.data) {
                if (elem.data.hasOwnProperty(country)) {
                    row[2].push([country, parseInt(elem.data[country])]);
                }
            }
            row[2] = Enumerable.fromArray(row[2]).orderByDescending(x => x[1]).toArray();
            arrayResult.push(row);
        });
        return arrayResult;
    }

    export function getFlatAllStatistics(results: any[]): any[][] {
        const allCountryData: any = {};
        results.forEach(statElem => {
            for (let country in statElem.data) {
                if (statElem.data.hasOwnProperty(country)) {
                    if (allCountryData[country] == null) {
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
        let arrayResult = [];
        for (let country in result) {
            if (result.hasOwnProperty(country)) {
                arrayResult.push([
                    country,
                    parseInt(result[country].c),
                    parseInt(result[country].l),
                    0
                ]);
            }
        }
        let allCount = Enumerable.fromArray(arrayResult).sum(x => x[1]);
        arrayResult = Enumerable.fromArray(arrayResult).orderByDescending(x => x[1]).toArray();
        arrayResult.forEach((elem, index) => {
            elem[3] = parseFloat(((elem[1] / allCount) * 100).toFixed(7));
        });
        return arrayResult;
    }
}