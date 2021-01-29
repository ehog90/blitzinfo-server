import { FilterQuery } from 'mongoose';
import { Observable, Subject, TimeInterval, timer } from 'rxjs';
import { filter, take, timeInterval } from 'rxjs/operators';

import { config } from '../config';
import { IStroke } from '../contracts/entities';
import { IDatabaseSaver, ILogger, IReverseGeoCoderService } from '../contracts/service-interfaces';
import { logMongoErrors } from '../database';
import * as mongo from '../database/mongoose-schemes';
import { reverseGeocoderService } from '../reverse-geocoding';
import { loggerInstance } from './logger-service';

class DatabaseHandlerService implements IDatabaseSaver {
   // #region Properties (4)

   private dupeCheckerTimeoutTimer: Observable<TimeInterval<number>>;
   private serverEventChannel: Subject<any>;

   public isDupeChecking: boolean;
   public lastSavedStroke: Subject<IStroke>;

   // #endregion Properties (4)

   // #region Constructors (1)

   constructor(private logger: ILogger, private reverseGeoCoder: IReverseGeoCoderService) {
      this.setUpGeocoder(reverseGeoCoder);
      this.lastSavedStroke = new Subject<IStroke>();
   }

   // #endregion Constructors (1)

   // #region Private Methods (8)

   private enableDupeChecking(): void {
      this.isDupeChecking = true;
      this.logger.sendWarningMessage(0, 0, 'Database saver', 'Dupe checking enforced.', false);
      this.initializeTimer();
   }

   private initializeTimer(): void {
      const timerInterval = config.dbDupeCheckingTimeout * 1000;
      this.dupeCheckerTimeoutTimer = timer(timerInterval, timerInterval).pipe(timeInterval());
      this.dupeCheckerTimeoutTimer.pipe(take(1)).subscribe((x) => this.unlockDupeChecker());
   }

   private onEventReceived(): void {
      this.enableDupeChecking();
   }

   private saveStroke(stroke: IStroke) {
      const strokeToInsert = new mongo.AllStrokeMongoModel(stroke);
      const strokeToInsertTtlTenMin = new mongo.TtlTenMinStrokeMongoModel(stroke);
      const strokeToInsertTtlOneHour = new mongo.TtlOneHourStrokeMongoModel(stroke);
      strokeToInsert.save().then((savedStroke) => {
         this.updateStatistics(savedStroke as IStroke);
         strokeToInsertTtlTenMin.save((error) => logMongoErrors(error));
         strokeToInsertTtlOneHour.save((error) => logMongoErrors(error));
      });
   }

   private setUpGeocoder(reverseGeoCoder: IReverseGeoCoderService) {
      this.serverEventChannel = reverseGeoCoder.serverEventChannel;
      this.serverEventChannel.pipe(filter((x) => x === 0)).subscribe(() => this.onEventReceived());
      this.lastSavedStroke = reverseGeoCoder.lastGeocodedStroke;
      this.reverseGeoCoder.lastGeocodedStroke.subscribe((x) => this.strokeGeoCoded(x));
   }

   private strokeGeoCoded(stroke: IStroke) {
      if (this.isDupeChecking) {
         mongo.TtlTenMinStrokeMongoModel.findOne({ blitzortungId: stroke.blitzortungId }).then((result) => {
            if (!result) {
               this.saveStroke(stroke);
            }
            this.logger.sendWarningMessage(
               0,
               0,
               'Database Saver',
               `Stroke is dupe: ${stroke.blitzortungId}`,
               true
            );
         });
      } else {
         this.saveStroke(stroke);
      }
   }

   private unlockDupeChecker() {
      this.isDupeChecking = false;
      this.logger.sendWarningMessage(0, 0, 'Database saver', 'Dupe checking ended.', false);
   }

   private async updateStatistics(savedStroke: IStroke) {
      const tenminTime = new Date(savedStroke.time.getTime() - (savedStroke.time.getTime() % 600000));
      const minTime = new Date(savedStroke.time.getTime() - (savedStroke.time.getTime() % 60000));
      const update: FilterQuery<IStroke> = {};
      const inc: FilterQuery<any> = {};
      inc[`data.${savedStroke.locationData.cc}.c`] = 1;
      inc.all = 1;
      const incAlone: any = {};
      incAlone[`data.${savedStroke.locationData.cc}`] = 1;
      incAlone.all = 1;
      update.$inc = inc;
      update[`data.${savedStroke.locationData.cc}.l`] = savedStroke.time.getTime();
      this.lastSavedStroke.next(savedStroke);

      await mongo.TenminStatMongoModel.updateOne(
         { timeStart: tenminTime },
         { $inc: incAlone },
         { upsert: true }
      );
      await mongo.MinStatMongoModel.updateOne({ timeStart: minTime }, update, { upsert: true });
      await mongo.AllStatMongoModel.updateOne(
         {
            period: 'all',
            isYear: false,
         },
         update,
         { upsert: true }
      );
      await mongo.AllStatMongoModel.updateOne(
         {
            period: savedStroke.time.getUTCFullYear().toString(),
            isYear: true,
         },
         update,
         { upsert: true }
      );
   }

   // #endregion Private Methods (8)
}

export const databaseSaverInstance: IDatabaseSaver = new DatabaseHandlerService(
   loggerInstance,
   reverseGeocoderService
);
