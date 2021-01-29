import { readFileSync } from 'fs';
import {
  from,
  merge,
  Observable,
  of as observableOf,
  TimeInterval,
  timer,
} from 'rxjs';
import {
  catchError,
  map,
  mergeMap,
  timeInterval,
  toArray,
} from 'rxjs/operators';

import {
  HungarianAlertTypes,
  IAlertArea,
  IDeviceLocationRecent,
  IFcmBase,
  IMeteoAlert,
  IMetHuData,
  IMetHuEntityWithData,
  MeteoEvents,
} from '../contracts/entities';
import { ILogger, IMetHuParser } from '../contracts/service-interfaces';
import * as mongo from '../database/mongoose-schemes';
import { customHttpRequestAsync, getHttpRequestAsync } from '../helpers';
import * as fcmUtils from '../helpers/firebase-helper';
import { loggerInstance } from './logger-service';

const htmlparser2 = require('htmlparser2');

class HungarianOmszAlertsParserService {
  // #region Properties (4)

  private countyHtmlParser: any;
  private metHuData: IMetHuData;
  private regionalUnitHtmlParser: any;
  private timer: Observable<TimeInterval<number>>;

  // #endregion Properties (4)

  // #region Constructors (1)

  constructor(private logger: ILogger, ticktime: number) {
    this.metHuData = JSON.parse(
      readFileSync('./static-json-data/metHuData.json', 'utf8'),
    ) as IMetHuData;
    this.timer = timer(0, ticktime * 1000).pipe(timeInterval());
    this.timer.subscribe((x) => this.onTimerTick());

    const countyHtmlHandler = new htmlparser2.DefaultHandler(
      (error, dom: any) => {
        if (!error) {
          const data = this.domToAlertArea(dom, HungarianAlertTypes.County);
          this.save(data);
        } else {
          this.logger.sendErrorMessage(
            0,
            0,
            'met.hu parser',
            `Parse county handler error: ${error}`,
            false,
          );
        }
      },
    );

    const regionalUnitHtmlHandler = new htmlparser2.DefaultHandler(
      (error, dom: any) => {
        if (!error) {
          const data = this.domToAlertArea(
            dom,
            HungarianAlertTypes.RegionalUnit,
          );
          this.save(data);
        } else {
          this.logger.sendErrorMessage(
            0,
            0,
            'met.hu parser',
            `Parse regional unit handler error: ${error}`,
            false,
          );
        }
      },
    );

    this.countyHtmlParser = new htmlparser2.Parser(countyHtmlHandler);
    this.regionalUnitHtmlParser = new htmlparser2.Parser(
      regionalUnitHtmlHandler,
    );
  }

  // #endregion Constructors (1)

  // #region Public Methods (1)

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public invoke(): void {}

  // #endregion Public Methods (1)

  // #region Private Static Methods (3)

  private static getAlertCode(event: string): MeteoEvents {
    if (event === 'Heves zivatar') {
      return MeteoEvents.Thunder;
    } else if (event === 'Széllökés') {
      return MeteoEvents.Wind;
    } else if (event === 'Ónos eső') {
      return MeteoEvents.Sleet;
    } else if (event === 'Hófúvás') {
      return MeteoEvents.SnowDrift;
    } else if (event === 'Eső') {
      return MeteoEvents.Rain;
    } else if (event === 'Havazás') {
      return MeteoEvents.Snow;
    } else if (event === 'Tartós, sűrű köd') {
      return MeteoEvents.Fog;
    } else if (event === 'Talajmenti fagy') {
      return MeteoEvents.SurfaceFrost;
    } else if (event === 'Hőség (25 fokos középh.)') {
      return MeteoEvents.ExtremeHot25;
    } else if (event === 'Hőség (27 fokos középh.)') {
      return MeteoEvents.ExtremeHot27;
    } else if (event === 'Hőség') {
      return MeteoEvents.ExtremeHot;
    } else if (event === 'Extrém hideg') {
      return MeteoEvents.ExtremeCold;
    } else if (event === 'Felhőszakadás') {
      return MeteoEvents.Rainfall;
    }
    return MeteoEvents.Other;
  }

  private static getDataFromMetDotHu(
    code: number,
    type: HungarianAlertTypes,
  ): Observable<IMetHuEntityWithData> {
    const linkType = type === HungarianAlertTypes.County ? 'wbhx' : 'wahx';
    return getHttpRequestAsync(
      // tslint:disable-next-line: max-line-length
      `http://met.hu/idojaras/veszelyjelzes/hover.php?id=${linkType}&kod=${code}&_=${new Date().getTime()}`,
      15000,
    ).pipe(
      map((rawData) => ({ type, code, data: rawData })),
      catchError(() => observableOf(null)),
    );
  }

  private static async notify(
    locations: Array<IDeviceLocationRecent>,
    alertArea: IAlertArea,
  ) {
    if (locations.length !== 0) {
      const fcmBase: IFcmBase = {
        registration_ids: locations.map((x) => x.did),
        time_to_live: 1800,
        data: {
          message: {
            mtype: 'ALERT',
            data: alertArea,
          },
        },
      };
      await customHttpRequestAsync(
        fcmUtils.firebaseSettings,
        fcmBase,
      ).toPromise();
    }
  }

  // #endregion Private Static Methods (3)

  // #region Private Methods (5)

  private domToAlertArea(dom: any, areaType: HungarianAlertTypes): IAlertArea {
    try {
      const data: IAlertArea = {
        name: dom[1].children[1].children[0].children[0].data,
        type: areaType,
        alerts: [],
      };

      dom[1].children.forEach((tablechild) => {
        if (tablechild.type === 'tag') {
          const alert: IMeteoAlert = { level: null, type: null };
          let has = false;
          tablechild.children.forEach((td) => {
            if (td.type === 'tag' && td.name === 'td') {
              if (td.attribs.class === 'row1' || td.attribs.class === 'row0') {
                if (td.children !== undefined) {
                  td.children.forEach((alertElem) => {
                    if (alertElem.type === 'tag' && alertElem.name === 'img') {
                      if (alertElem.attribs.src === '/images/warningb/w1.gif') {
                        alert.level = 1;
                        has = true;
                      } else if (
                        alertElem.attribs.src === '/images/warningb/w2.gif'
                      ) {
                        alert.level = 2;
                        has = true;
                      } else if (
                        alertElem.attribs.src === '/images/warningb/w3.gif'
                      ) {
                        alert.level = 3;
                        has = true;
                      }
                    }
                    if (alertElem.type === 'text') {
                      alert.type = HungarianOmszAlertsParserService.getAlertCode(
                        alertElem.data,
                      );
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
      this.logger.sendErrorMessage(
        0,
        0,
        'met.hu parser',
        'Error during parse: ' + exc.toString(),
        false,
      );
      return null;
    }
  }

  private log(
    message: string,
    bgColor = 227,
    fgColor = 16,
    canBeHidden = false,
  ) {
    this.logger.sendErrorMessage(
      bgColor,
      fgColor,
      'met.hu parser',
      message,
      canBeHidden,
    );
  }

  private async onTimerTick() {
    this.logger.sendNormalMessage(
      227,
      16,
      'met.hu parser',
      `Downloading county data`,
      false,
    );

    const countyQuery = from(this.metHuData.counties).pipe(
      mergeMap((county) =>
        HungarianOmszAlertsParserService.getDataFromMetDotHu(
          county,
          HungarianAlertTypes.County,
        ),
      ),
    );
    const countyResponsesAll = await merge(countyQuery, 4)
      .pipe(toArray())
      .toPromise();
    this.log(`All county data downloaded: ${countyResponsesAll.length}`);

    this.logger.sendNormalMessage(
      227,
      16,
      'met.hu parser',
      `Downloading regional unit data`,
      false,
    );

    const regionalUnitQuery = from(this.metHuData.regionalUnits).pipe(
      mergeMap((regionalUnit) =>
        HungarianOmszAlertsParserService.getDataFromMetDotHu(
          regionalUnit,
          HungarianAlertTypes.RegionalUnit,
        ),
      ),
    );
    const regionalUnitResponsesAll = await merge(regionalUnitQuery, 4)
      .pipe(toArray())
      .toPromise();
    this.log(
      `All regional unit downloaded: ${regionalUnitResponsesAll.length}`,
    );
    const countyResponses = countyResponsesAll.filter((x) => x != null);
    const regionalUnitResponses = regionalUnitResponsesAll.filter(
      (x) => x != null,
    );
    countyResponses.map((x) => this.parseData(this.countyHtmlParser, x));
    this.logger.sendNormalMessage(
      227,
      16,
      'met.hu parser',
      `Counties parsed.`,
      false,
    );
    regionalUnitResponses.map((x) =>
      this.parseData(this.regionalUnitHtmlParser, x),
    );
    this.logger.sendNormalMessage(
      227,
      16,
      'met.hu parser',
      `Regional units parsed.`,
      false,
    );
  }

  private parseData(parser: any, entity: IMetHuEntityWithData) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    parser.parseComplete(entity.data, (result) => {});
  }

  private async save(alertArea: IAlertArea) {
    if (alertArea != null) {
      alertArea.alerts.forEach(async (x) => {
        const result = await mongo.AlertsMongoModel.findOne({
          areaName: alertArea.name,
          areaType: alertArea.type,
          level: x.level,
          alertType: x.type,
          timeLast: { $eq: null },
        });

        if (result == null) {
          const strokeToInsert = new mongo.AlertsMongoModel({
            areaName: alertArea.name,
            areaType: alertArea.type,
            timeFirst: new Date(),
            timeLast: null,
            alertType: x.type,
            level: x.level,
            desc: null,
          });

          await strokeToInsert.save();
          if (alertArea.type === HungarianAlertTypes.County) {
            const countyResults = await mongo.LocationRecentMongoModel.find({
              'hunData.regionalData.countyName': alertArea.name,
            });
            await HungarianOmszAlertsParserService.notify(
              countyResults,
              alertArea,
            );
          } else {
            const ruResults = await mongo.LocationRecentMongoModel.find({
              'hunData.regionalData.regionalUnitName': alertArea.name,
            });
            await HungarianOmszAlertsParserService.notify(ruResults, alertArea);
          }
        }
      });

      const results = await mongo.AlertsMongoModel.find({
        areaName: alertArea.name,
        areaType: alertArea.type,
        timeLast: { $eq: null },
      });

      results.forEach(async (result) => {
        const hasInRecent =
          alertArea.alerts.filter(
            (x) => x.type === result.alertType && x.level === result.level,
          ).length === 0;
        if (hasInRecent) {
          await mongo.AlertsMongoModel.updateOne(
            {
              _id: result._id,
            },
            { timeLast: new Date() },
          );
        }
      });
    } else {
    }
  }

  // #endregion Private Methods (5)
}

export const metHuParser: IMetHuParser = new HungarianOmszAlertsParserService(
  loggerInstance,
  90,
);
