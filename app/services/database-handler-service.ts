﻿import {timer, Observable, Subject, Subscription, TimeInterval} from "rxjs";
import {filter, take, timeInterval} from "rxjs/operators";
import {config} from "../config";
import {IStroke} from "../contracts/entities";
import {IDatabaseSaver, ILogger, IReverseGeoCoderService} from "../contracts/service-interfaces";
import {logMongoErrors} from "../database";
import * as mongo from "../database/mongoose-schemes";
import {reverseGeocoderService} from "../reverse-geocoding";
import {loggerInstance} from "./logger-service";


/* Adatbázisba mentő osztály.
 A bemeneti adatok aszinkron módon érkeznek a geokódoló osztályból (reverseGeocoder.lastGeocodedStroke)
 */
class DatabaseHandlerService implements IDatabaseSaver {
    public lastSavedStroke: Subject<IStroke>;
    public isDupeChecking: boolean;
    private serverEventChannel: Subject<any>;
    private dupeCheckerTimeoutTimer: Observable<TimeInterval<number>>;
    private timerSubscription: Subscription;

    constructor(private logger: ILogger,
                private reverseGeoCoder: IReverseGeoCoderService) {
        this.setUpGeocoder(reverseGeoCoder);
        this.lastSavedStroke = new Subject<IStroke>();
    }

    private setUpGeocoder(reverseGeoCoder: IReverseGeoCoderService) {
        this.serverEventChannel = reverseGeoCoder.serverEventChannel;
        this.serverEventChannel.pipe(
            filter(x => x === 0)
        ).subscribe(() => this.onEventReceived());
        this.lastSavedStroke = reverseGeoCoder.lastGeocodedStroke;
        this.reverseGeoCoder.lastGeocodedStroke.subscribe(x => this.strokeGeoCoded(x));
    }

    private strokeGeoCoded(stroke: IStroke) {
        if (this.isDupeChecking) {
            mongo.TtlTenMinStrokeMongoModel.findOne({'blitzortungId': stroke.blitzortungId}).then(result => {
                if (!result) {
                    this.saveStroke(stroke);
                }
                this.logger.sendWarningMessage(0,
                    0,
                    'Database Saver',
                    `Stroke is dupe: ${stroke.blitzortungId}`,
                    true);
            });
        } else {
            this.saveStroke(stroke);
        }
    }

    private saveStroke(stroke: IStroke) {
        const strokeToInsert = new mongo.AllStrokeMongoModel(stroke);
        const strokeToInsertTtlTenMin = new mongo.TtlTenMinStrokeMongoModel(stroke);
        const strokeToInsertTtlOneHour = new mongo.TtlOneHourStrokeMongoModel(stroke);
        strokeToInsert.save().then(savedStroke => {
            this.updateStatistics(<IStroke>savedStroke);
            strokeToInsertTtlTenMin.save(error => logMongoErrors(error));
            strokeToInsertTtlOneHour.save(error => logMongoErrors(error));
        });
    }

    private updateStatistics(savedStroke: IStroke) {
        const tenminTime: number = savedStroke.time.getTime() - (savedStroke.time.getTime() % (600000));
        const minTime: number = savedStroke.time.getTime() - (savedStroke.time.getTime() % (60000));
        const update: any = {};
        const inc: any = {};
        inc[`data.${savedStroke.locationData.cc}.c`] = 1;
        inc['all'] = 1;
        const incAlone: any = {};
        incAlone[`data.${savedStroke.locationData.cc}`] = 1;
        incAlone['all'] = 1;
        update['$inc'] = inc;
        update[`data.${savedStroke.locationData.cc}.l`] = savedStroke.time.getTime();
        this.lastSavedStroke.next(savedStroke);

        mongo.TenminStatMongoModel.update({timeStart: tenminTime}, {$inc: incAlone}, {upsert: true}).lean().exec();
        mongo.MinStatMongoModel.update({timeStart: minTime}, update, {upsert: true}).lean().exec();
        mongo.AllStatMongoModel.update({
            period: "all",
            isYear: false
        }, update, {upsert: true}).lean().exec();
        mongo.AllStatMongoModel.update({
            period: savedStroke.time.getUTCFullYear().toString(),
            isYear: true
        }, update, {upsert: true}).lean().exec();

    }

    private initializeTimer(): void {
        this.dupeCheckerTimeoutTimer = timer(config.dbDupeCheckingTimeout * 1000,
            config.dbDupeCheckingTimeout * 1000).pipe(
            timeInterval()
        );
        this.timerSubscription = this.dupeCheckerTimeoutTimer.pipe(
            take(1)
        ).subscribe(x => this.unlockDupeChecker());
    }

    private unlockDupeChecker() {
        this.isDupeChecking = false;
        this.logger.sendWarningMessage(0, 0, 'Database saver', 'Dupe checking ended.', false);
    }

    private enableDupeChecking(): void {
        this.isDupeChecking = true;
        this.logger.sendWarningMessage(0, 0, 'Database saver', 'Dupe checking enforced.', false);
        this.initializeTimer();
    }

    private onEventReceived(): void {
        this.enableDupeChecking();
    }
}

export const databaseSaverInstance: IDatabaseSaver = new DatabaseHandlerService(loggerInstance, reverseGeocoderService);
