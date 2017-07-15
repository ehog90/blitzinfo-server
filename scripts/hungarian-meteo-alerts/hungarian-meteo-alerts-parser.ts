import * as fs from "fs";
import * as fcmUtils from "../utils/firebase";
import {customHttpRequestAsync, getHttpRequestAsync} from "../utils/httpQueries";
import * as mongo from "../mongo/mongoDbSchemas";
import {logger} from "../logger/logger";
import {Entities} from "../interfaces/entities";
import {Modules} from "../interfaces/modules";
import IMetHuData = Entities.IMetHuData;
import ILogger = Modules.ILogger;
import IDeviceLocationRecent = Entities.IDeviceLocationRecent;
import IAlertArea = Entities.IAlertArea;
import IFcmBase = Entities.IFcmBase;
import IMeteoAlert = Entities.IMeteoAlert;
import IMetHuEntityWithData = Entities.IMetHuEntityWithData;
import HungarianAlertTypes = Entities.HungarianAlertTypes;
import {Observable} from "rxjs/Observable";
import {TimeInterval} from "rxjs/Rx";
const htmlparser2 = require("htmlparser2");
/*
 Az OMSZ meteorológiai figyelmeztetéseit érkeztető, és kezelő osztály.  Bizonyos időközönként ellenőrzi a riasztásokat, amint a met.hu oldalról tölt le, majd kezeli azokat.
 Elküldi a Socket.IO osztálynak is, hohy az esetleges kliensek fogadhassák azokat. Szükség esetén figyelmezteti az eszközöket is.
 */
class HungarianMeteoAlertsParser {

    private timer: Observable<TimeInterval<number>>;
    private metHuData: IMetHuData;
    private countyHtmlParser: any;
    private regionalUnitHtmlParser: any;

    constructor(private logger: ILogger, ticktime: number) {
        this.metHuData = <IMetHuData>(JSON.parse(fs.readFileSync('./static-json-data/metHuData.json', 'utf8')));
        this.timer = Observable.timer(0, ticktime * 1000).timeInterval();
        this.timer.subscribe(x => this.onTimerTick());

        const countyHtmlHandler = new htmlparser2.DefaultHandler((error, dom: any) => {
            if (!error) {
                const data = this.domToAlertArea(dom, HungarianAlertTypes.County);
                this.save(data);
            }
            else {
                this.logger.sendErrorMessage(0, 0, "met.hu parser", `Parse county handler error: ${error}`, false);
            }
        });

        const regionalUnitHtmlHandler = new htmlparser2.DefaultHandler((error, dom: any) => {
            if (!error) {
                let data = this.domToAlertArea(dom, HungarianAlertTypes.RegionalUnit);
                this.save(data);
            }
            else {
                this.logger.sendErrorMessage(0, 0, "met.hu parser", `Parse regional unit handler error: ${error}`, false);
            }
        });

        this.countyHtmlParser = new htmlparser2.Parser(countyHtmlHandler);
        this.regionalUnitHtmlParser = new htmlparser2.Parser(regionalUnitHtmlHandler);
    }


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
                    if (alertArea.type === HungarianAlertTypes.County ) {
                        const results = await mongo.LocationRecentMongoModel.find({'hunData.regionalData.countyName': alertArea.name});
                        await HungarianMeteoAlertsParser.notify(results, alertArea);
                    } else {
                        const results = await mongo.LocationRecentMongoModel.find({'hunData.regionalData.regionalUnitName': alertArea.name});
                        await HungarianMeteoAlertsParser.notify(results, alertArea);
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
                    let alert: IMeteoAlert = {level: null, type: null};
                    let has = false;
                    tablechild.children.forEach(td => {
                        if (td.type === 'tag' && td.name === "td") {
                            if (td.attribs.class === "row1" || td.attribs.class === "row0") {
                                if (td.children != undefined) {
                                    td.children.forEach(alertElem => {
                                        if (alertElem.type === "tag" && alertElem.name === "img") {
                                            if (alertElem.attribs.src === "/images/warningb/w1.gif") {
                                                alert.level = 1;
                                                has = true;
                                            }
                                            else if (alertElem.attribs.src === "/images/warningb/w2.gif") {
                                                alert.level = 2;
                                                has = true;
                                            }
                                            else if (alertElem.attribs.src === "/images/warningb/w3.gif") {
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

    private static getDataFromMetDotHu(code: number, type: HungarianAlertTypes): Observable<IMetHuEntityWithData> {
        const linkType = type === HungarianAlertTypes.County ? "wbhx" : "wahx";
        return getHttpRequestAsync(`http://met.hu/idojaras/veszelyjelzes/hover.php?id=${linkType}&kod=${code}&_=${new Date().getTime()}`, 15000)
            .map(rawData => {return {type: type, code: code, data: rawData}})
            .catch(() => Observable.of(null));
    }

    private async parseData(parser: any, entity: IMetHuEntityWithData): Promise<any> {
        return new Promise((resolve) => {
            parser.parseComplete(entity.data, result => {
                resolve(result);
            });
        })
    }
    private static getAlertCode(event: string) {
        if (event === "Heves zivatar") return "H_THUNDER";
        else if (event === "Széllökés") return "WIND";
        else if (event === "Ónos eső") return "SLEET";
        else if (event === "Hófúvás") return "SNOWDRIFT";
        else if (event === "Eső") return "RAIN";
        else if (event === "Havazás") return "SNOW";
        else if (event === "Tartós, sűrű köd") return "FOG";
        else if (event === "Talajmenti fagy") return "SURF_FROST";
        else if (event === "Hőség (25 fokos középh.)") return "XTR_HOT25";
        else if (event === "Hőség (27 fokos középh.)") return "XTR_HOT27";
        else if (event === "Hőség") return "XTR_HOT";
        else if (event === "Extrém hideg") return "XTR_COLD";
        else if (event === "Felhőszakadás") return "RAINFALL";
        return "OTHER";
    }

    public invoke(): void {

    }

    private async onTimerTick() {

        this.logger.sendNormalMessage(227, 16, "met.hu parser", `Downloading county data`, false);
        let countyResponses = await Observable.from(this.metHuData.counties).flatMap(county => HungarianMeteoAlertsParser.getDataFromMetDotHu(county, HungarianAlertTypes.County)).merge(4).reduce((acc, value) => {
            acc.push(value);
            return acc;
        }, []).toPromise();
        this.logger.sendNormalMessage(227, 16, "met.hu parser", `All county data downloaded: ${countyResponses.length}`, false);
        this.logger.sendNormalMessage(227, 16, "met.hu parser", `Downloading regional unit data`, false);
        let ruResponses = await Observable.from(this.metHuData.regionalUnits).flatMap(ru => HungarianMeteoAlertsParser.getDataFromMetDotHu(ru, HungarianAlertTypes.RegionalUnit)).merge(4).reduce((acc, value) => {
            acc.push(value);
            return acc;
        }, []).toPromise();
        this.logger.sendNormalMessage(227, 16, "met.hu parser", `All regional unit data downloaded: ${ruResponses.length}`, false);

        countyResponses = countyResponses.filter(x => x != null);
        ruResponses = ruResponses.filter(x => x != null);

        await Observable.from(countyResponses).map(x => Observable.fromPromise(this.parseData(this.countyHtmlParser, x))).last().toPromise();
        this.logger.sendNormalMessage(227, 16, "met.hu parser", `Counties parsed.`, false);
        await Observable.from(ruResponses).map(x => Observable.fromPromise(this.parseData(this.regionalUnitHtmlParser, x))).last().toPromise();
        this.logger.sendNormalMessage(227, 16, "met.hu parser", `Regional units parsed.`, false);
    }
}

export const metHuParser: Modules.IMetHuParser = new HungarianMeteoAlertsParser(logger, 90);