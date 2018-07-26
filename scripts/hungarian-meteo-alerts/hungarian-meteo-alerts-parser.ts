import {loggerInstance as loggerInstance} from "../logger/logger";

import * as fs from "fs";
import {from, of as observableOf, timer, Observable, TimeInterval} from "rxjs";
import {catchError, flatMap, map, merge, reduce, timeInterval} from "rxjs/operators";
import {ILogger, IMetHuParser} from "../interfaces/modules";
import * as mongo from "../mongo/mongoDbSchemas";
import * as fcmUtils from "../utils/firebase";
import {customHttpRequestAsync, getHttpRequestAsync} from "../utils/httpQueries";
import {
    HungarianAlertTypes,
    IAlertArea,
    IDeviceLocationRecent,
    IFcmBase, IMeteoAlert,
    IMetHuData,
    IMetHuEntityWithData, MeteoEvents
} from "../interfaces/entities";

const htmlparser2 = require("htmlparser2");

class HungarianMeteoAlertsParser {

    constructor(private logger: ILogger, ticktime: number) {
        this.metHuData = <IMetHuData>(JSON.parse(fs.readFileSync('./static-json-data/metHuData.json', 'utf8')));
        this.timer = timer(0, ticktime * 1000).pipe(timeInterval());
        this.timer.subscribe(x => this.onTimerTick());

        const countyHtmlHandler = new htmlparser2.DefaultHandler((error, dom: any) => {
            if (!error) {
                const data = this.domToAlertArea(dom, HungarianAlertTypes.County);
                this.save(data);
            } else {
                this.logger.sendErrorMessage(0, 0, "met.hu parser", `Parse county handler error: ${error}`, false);
            }
        });

        const regionalUnitHtmlHandler = new htmlparser2.DefaultHandler((error, dom: any) => {
            if (!error) {
                const data = this.domToAlertArea(dom, HungarianAlertTypes.RegionalUnit);
                this.save(data);
            } else {
                this.logger.sendErrorMessage(0, 0, "met.hu parser", `Parse regional unit handler error: ${error}`, false);
            }
        });

        this.countyHtmlParser = new htmlparser2.Parser(countyHtmlHandler);
        this.regionalUnitHtmlParser = new htmlparser2.Parser(regionalUnitHtmlHandler);
    }

    private timer: Observable<TimeInterval<number>>;
    private metHuData: IMetHuData;
    private countyHtmlParser: any;
    private regionalUnitHtmlParser: any;


    private static async notify(locations: Array<IDeviceLocationRecent>, alertArea: IAlertArea) {
        if (locations.length !== 0) {
            const fcmBase: IFcmBase = {
                registration_ids: locations.map(x => x.did),
                time_to_live: 1800,
                data: {
                    message: {
                        mtype: 'ALERT',
                        data: alertArea
                    }
                }
            };
            await customHttpRequestAsync(fcmUtils.firebaseSettings, fcmBase).toPromise();
        }
    }

    private static getDataFromMetDotHu(code: number, type: HungarianAlertTypes): Observable<IMetHuEntityWithData> {
        const linkType = type === HungarianAlertTypes.County ? "wbhx" : "wahx";
        return getHttpRequestAsync(`http://met.hu/idojaras/veszelyjelzes/hover.php?id=${linkType}&kod=${code}&_=${new Date().getTime()}`,
            15000).pipe(
            map(rawData => {
                return {type: type, code: code, data: rawData};
            }),
            catchError(() => observableOf(null))
        );
    }

    private static getAlertCode(event: string): MeteoEvents {
        if (event === "Heves zivatar") {
            return MeteoEvents.Thunder;
        } else if (event === "Széllökés") {
            return MeteoEvents.Wind;
        } else if (event === "Ónos eső") {
            return MeteoEvents.Sleet;
        } else if (event === "Hófúvás") {
            return MeteoEvents.SnowDrift;
        } else if (event === "Eső") {
            return MeteoEvents.Rain;
        } else if (event === "Havazás") {
            return MeteoEvents.Snow;
        } else if (event === "Tartós, sűrű köd") {
            return MeteoEvents.Fog;
        } else if (event === "Talajmenti fagy") {
            return MeteoEvents.SurfaceFrost;
        } else if (event === "Hőség (25 fokos középh.)") {
            return MeteoEvents.ExtremeHot25;
        } else if (event === "Hőség (27 fokos középh.)") {
            return MeteoEvents.ExtremeHot27;
        } else if (event === "Hőség") {
            return MeteoEvents.ExtremeHot;
        } else if (event === "Extrém hideg") {
            return MeteoEvents.ExtremeCold;
        } else if (event === "Felhőszakadás") {
            return MeteoEvents.Rainfall;
        }
        return MeteoEvents.Other;
    }

    private async save(alertArea: IAlertArea) {
        if (alertArea != null) {
            alertArea.alerts.forEach(async x => {
                const result = await mongo.AlertsMongoModel.findOne({
                    'areaName': alertArea.name,
                    'areaType': alertArea.type,
                    'level': x.level,
                    'alertType': x.type,
                    'timeLast': {'$eq': null}
                });

                if (result == null) {
                    const strokeToInsert = new mongo.AlertsMongoModel({
                        areaName: alertArea.name,
                        areaType: alertArea.type,
                        timeFirst: new Date(),
                        timeLast: null,
                        alertType: x.type,
                        level: x.level,
                        desc: null
                    });

                    await strokeToInsert.save();
                    if (alertArea.type === HungarianAlertTypes.County) {
                        const countyResults = await mongo.LocationRecentMongoModel
                            .find({'hunData.regionalData.countyName': alertArea.name});
                        await HungarianMeteoAlertsParser.notify(countyResults, alertArea);
                    } else {
                        const ruResults = await mongo.LocationRecentMongoModel
                            .find({'hunData.regionalData.regionalUnitName': alertArea.name});
                        await HungarianMeteoAlertsParser.notify(ruResults, alertArea);
                    }
                }
            });

            const results = await mongo.AlertsMongoModel.find({
                'areaName': alertArea.name,
                'areaType': alertArea.type,
                'timeLast': {'$eq': null}
            });

            results.forEach(async result => {
                const hasInRecent = alertArea.alerts.filter(x => x.type === result.alertType && x.level === result.level).length === 0;
                if (hasInRecent) {
                    await mongo.AlertsMongoModel.update({
                        '_id': result._id
                    }, {'timeLast': new Date()});
                }
            });
        } else {
        }
    }

    private domToAlertArea(dom: any, areaType: HungarianAlertTypes): IAlertArea {
        try {
            const data: IAlertArea = {
                name: dom[1].children[1].children[0].children[0].data,
                type: areaType,
                alerts: []
            };


            dom[1].children.forEach(tablechild => {
                if (tablechild.type === 'tag') {
                    const alert: IMeteoAlert = {level: null, type: null};
                    let has = false;
                    tablechild.children.forEach(td => {
                        if (td.type === 'tag' && td.name === "td") {
                            if (td.attribs.class === "row1" || td.attribs.class === "row0") {
                                if (td.children !== undefined) {
                                    td.children.forEach(alertElem => {
                                        if (alertElem.type === "tag" && alertElem.name === "img") {
                                            if (alertElem.attribs.src === "/images/warningb/w1.gif") {
                                                alert.level = 1;
                                                has = true;
                                            } else if (alertElem.attribs.src === "/images/warningb/w2.gif") {
                                                alert.level = 2;
                                                has = true;
                                            } else if (alertElem.attribs.src === "/images/warningb/w3.gif") {
                                                alert.level = 3;
                                                has = true;
                                            }
                                        }
                                        if (alertElem.type === "text") {
                                            alert.type = HungarianMeteoAlertsParser.getAlertCode(alertElem.data);
                                            has = true;
                                        }
                                    });
                                }
                            }
                        }
                    });
                    if (has) {
                        data.alerts.push(alert);
                    }
                }
            });

            return data;
        } catch (exc) {
            this.logger.sendErrorMessage(0, 0, "met.hu parser", "Error during parse: " + exc.toString(), false);
            return null;
        }
    }

    private parseData(parser: any, entity: IMetHuEntityWithData) {
        parser.parseComplete(entity.data, result => {
        });
    }

    public invoke(): void {

    }

    private async onTimerTick() {

        this.logger.sendNormalMessage(227, 16, "met.hu parser", `Downloading county data`, false);
        let countyResponses = await from(this.metHuData.counties).pipe(
            flatMap(county => HungarianMeteoAlertsParser.getDataFromMetDotHu(county, HungarianAlertTypes.County)),
            merge(4),
            reduce((acc, value) => {
                acc.push(value);
                return acc;
            }, [])
        ).toPromise() as any[];
        /* let countyResponses = await Observable.from(this.metHuData.counties)
        .flatMap(county => HungarianMeteoAlertsParser.getDataFromMetDotHu(county, HungarianAlertTypes.County))
        .merge(4).reduce((acc, value) => {
             acc.push(value);
             return acc;
         }, []).toPromise();*/

        this.logger.sendNormalMessage(227, 16, "met.hu parser", `All county data downloaded: ${countyResponses.length}`, false);
        this.logger.sendNormalMessage(227, 16, "met.hu parser", `Downloading regional unit data`, false);

        let ruResponses = await from(this.metHuData.regionalUnits).pipe(
            flatMap(ru => HungarianMeteoAlertsParser.getDataFromMetDotHu(ru, HungarianAlertTypes.RegionalUnit)),
            merge(4),
            reduce((acc, value) => {
                acc.push(value);
                return acc;
            }, []),
        ).toPromise() as any[];


        /* let ruResponses = await Observable.from(this.metHuData.regionalUnits).flatMap(ru =>
        HungarianMeteoAlertsParser.getDataFromMetDotHu(ru, HungarianAlertTypes.RegionalUnit))
        .merge(4).reduce((acc, value) => {
             acc.push(value);
             return acc;
         }, []).toPromise();
         this.logger.sendNormalMessage(227, 16, "met.hu parser", `All regional unit data downloaded: ${ruResponses.length}`, false);*/

        countyResponses = countyResponses.filter(x => x != null);
        ruResponses = ruResponses.filter(x => x != null);
        countyResponses.map(x => this.parseData(this.countyHtmlParser, x));
        this.logger.sendNormalMessage(227, 16, "met.hu parser", `Counties parsed.`, false);
        ruResponses.map(x => this.parseData(this.regionalUnitHtmlParser, x));
        this.logger.sendNormalMessage(227, 16, "met.hu parser", `Regional units parsed.`, false);
    }
}

export const metHuParser: IMetHuParser = new HungarianMeteoAlertsParser(loggerInstance, 90);
