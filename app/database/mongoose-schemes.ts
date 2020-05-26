import * as mongoose from 'mongoose';
import { MongooseAutoIncrementID } from 'mongoose-auto-increment-reworked';

import {
   IAllStatDocument,
   ICountryOutlineDocument,
   IDeviceLocationLogDocument,
   IDeviceLocationRecentDocument,
   ILogDocument,
   IMetHuAlertDocument,
   IMinutelyStatDocument,
   ISavedLocation,
   ISettlementDocument,
   IStationDocument,
   IStrokeDocument,
   IUserDocument,
} from '../contracts/entities';
import { MongoDbPrimitives } from './mongoose-primitive-scheme';

const strokeSchema = {
   latLon: [Number],
   locationData: MongoDbPrimitives.GeoAddress,
   time: Date,
   sunData: MongoDbPrimitives.SunData,
   blitzortungId: Number,
};
const locationSchema = {
   num: Number,
   updater: String,
   timeFirst: Date,
   timeLast: Date,
   latLon: { type: [Number], index: '2dsphere' },
   accsum: Number,
   did: String,
   location: MongoDbPrimitives.GeoAddress,
   userData: MongoDbPrimitives.UserData,
   hunData: MongoDbPrimitives.HunData,
   alerts: [strokeSchema],
};

const locationSchemaRecent = {
   num: Number,
   updater: String,
   timeFirst: Date,
   timeLast: Date,
   latLon: { type: [Number], index: '2dsphere' },
   acc: Number,
   did: { type: String, index: { unique: true } },
   location: MongoDbPrimitives.GeoAddress,
   userData: MongoDbPrimitives.UserData,
   hunData: MongoDbPrimitives.HunData,
   lastInAlertZone: Date,
   lastAlert: Object,
   lastLogId: mongoose.Schema.Types.ObjectId,
};

const alertsSchema = {
   areaName: String,
   areaType: String,
   timeFirst: Date,
   timeLast: Date,
   alertType: String,
   level: Number,
   desc: String,
};
const mongoAlertsSchema = new mongoose.Schema(alertsSchema);

const savedLocationsSchema = new mongoose.Schema({
   uid: mongoose.Schema.Types.ObjectId,
   latLon: { type: [Number], index: '2dsphere' },
   location: MongoDbPrimitives.GeoAddress,
   hunData: MongoDbPrimitives.HunData,
   alerts: [strokeSchema],
   meteoAlerts: [mongoAlertsSchema],
   name: String,
   lastInAlertZone: Date,
   lastAlert: Object,
   added: { type: Date, default: Date.now },
});

const mongoSettlementSchema = new mongoose.Schema({
   type: String,
   properties: Object,
   geometry: {
      coordinates: { type: [Number], index: '2dsphere' },
      type: String,
   },
});

const mongoCountryOutlinesSchema = new mongoose.Schema({
   type: String,
   properties: Object,
   geometry: { type: Object, index: '2dsphere' },
});

export const mongoUserLogIns = new mongoose.Schema({
   time: { type: Date, dafault: Date.now },
   userAgent: String,
   ip: String,
});

export const mongoUser = new mongoose.Schema({
   userName: { type: String, index: { unique: true } },
   email: { type: String, index: { unique: true } },
   fullName: String,
   password: String,
   logIns: [mongoUserLogIns],
});

const mongoLocation = new mongoose.Schema(locationSchema);
const mongoLocationRecent = new mongoose.Schema(locationSchemaRecent);
const mongoStrokeSchemaTtlTenMin = new mongoose.Schema({
   latLon: { type: [Number], index: '2dsphere' },
   locationData: MongoDbPrimitives.GeoAddress,
   time: { type: Date },
   sunData: MongoDbPrimitives.SunData,
   blitzortungId: { type: Number, index: true },
});
mongoStrokeSchemaTtlTenMin.index({ time: 1 }, { expireAfterSeconds: 600 });
mongoStrokeSchemaTtlTenMin.plugin(MongooseAutoIncrementID.plugin, { modelName: 'ttlTenMinStrokes' });

const mongoStrokeSchemaTtlOneHour = new mongoose.Schema({
   latLon: { type: [Number], index: '2dsphere' },
   locationData: MongoDbPrimitives.GeoAddress,
   time: { type: Date },
   sunData: MongoDbPrimitives.SunData,
   blitzortungId: Number,
});
mongoStrokeSchemaTtlOneHour.plugin(MongooseAutoIncrementID.plugin, { modelName: 'ttlOneHourStrokes' });
mongoStrokeSchemaTtlOneHour.index({ time: 1 }, { expireAfterSeconds: 3600 });

const mongoStrokeSchema = new mongoose.Schema(strokeSchema);
mongoStrokeSchema.plugin(MongooseAutoIncrementID.plugin, { modelName: 'allStrokes' });

const mongoAlertsSchemaTtl = new mongoose.Schema(alertsSchema);
mongoAlertsSchemaTtl.index({ timeLast: 1 }, { expireAfterSeconds: 1209600 });

const mongoLogsSchema = new mongoose.Schema({
   time: { type: Date, default: Date.now },
   isError: Boolean,
   colors: {
      bg: Number,
      fg: Number,
   },
   messageParts: {
      tag: String,
      msgType: String,
      msg: String,
   },
});
mongoLogsSchema.index({ time: 1 }, { expireAfterSeconds: 432000 }); // 5 nap

export const mongoTenminSchema = new mongoose.Schema({
   timeStart: { type: Date, index: { unique: true } },
   all: Number,
   data: {},
});
export const mongoMinSchema = new mongoose.Schema({
   timeStart: { type: Date, index: { unique: true } },
   all: Number,
   data: {},
});
mongoMinSchema.index({ timeStart: 1 }, { expireAfterSeconds: 86400 });

export const mongoAllSchema = new mongoose.Schema({
   period: String,
   all: Number,
   isYear: Boolean,
   data: {},
});

const mongoStationsSchema = new mongoose.Schema({
   latLon: { type: [Number], index: '2dsphere' },
   sId: { type: Number, index: { unique: true } },
   name: String,
   usedCnt: Number,
   detCnt: Number,
   lastSeen: Date,
   location: MongoDbPrimitives.GeoAddress,
});

export const SettlementsModel = mongoose.model<ISettlementDocument>('settlements', mongoSettlementSchema);
export const CountryOutlineModel = mongoose.model<ICountryOutlineDocument>(
   'countryoutlines',
   mongoCountryOutlinesSchema
);
export const UserMongoModel = mongoose.model<IUserDocument>('user', mongoUser);
export const AllStrokeMongoModel = mongoose.model<IStrokeDocument>('allStrokes', mongoStrokeSchema);
export const TtlTenMinStrokeMongoModel = mongoose.model<IStrokeDocument>(
   'ttlTenMinStrokes',
   mongoStrokeSchemaTtlTenMin
);
export const TtlOneHourStrokeMongoModel = mongoose.model<IStrokeDocument>(
   'ttlOneHourStrokes',
   mongoStrokeSchemaTtlOneHour
);
export const TenminStatMongoModel = mongoose.model<IMinutelyStatDocument>('tenMinStat2', mongoTenminSchema);
export const MinStatMongoModel = mongoose.model<IMinutelyStatDocument>('minStat2', mongoMinSchema);
export const AllStatMongoModel = mongoose.model<IAllStatDocument>('allStat', mongoAllSchema);
export const LocationLogMongoModel = mongoose.model<IDeviceLocationLogDocument>(
   'locationData',
   mongoLocation
);
export const LocationRecentMongoModel = mongoose.model<IDeviceLocationRecentDocument>(
   'locationDataRecent',
   mongoLocationRecent
);
export const SavedLocationMongoModel = mongoose.model<ISavedLocation>('savedLocation', savedLocationsSchema);
export const AlertsMongoModel = mongoose.model<IMetHuAlertDocument>('methuAlerts', mongoAlertsSchemaTtl);
export const LogsMongoModel = mongoose.model<ILogDocument>('log', mongoLogsSchema);
export const StationsMongoModel = mongoose.model<IStationDocument>('stations', mongoStationsSchema);
