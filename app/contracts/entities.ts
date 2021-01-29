import * as express from 'express';
import * as mongoose from 'mongoose';
import { Socket } from 'socket.io';

import GeocoderResult = google.maps.GeocoderResult;
import GeocoderStatus = google.maps.GeocoderStatus;

export interface IGeoCodingResult {
   locationData: IGeoAddress;
   hungarianData: IHungarianRegionalInformation;
}

export interface ILocationLogResult {
   geocodingResult: IGeoCodingResult;
   id: string;
}

export enum Environment {
   DevUsingRealDB = 'DEVREAL',
   Development = 'DEV',
   Production = 'PROD',
}

export enum SocketIoConnectionTypes {
   Log = 1,
   Stat = 2,
   Strokes = 3,
}

export enum SocketIoRooms {
   Strokes = 'strokes',
   Alerts = 'alerts',
   StrokesInit = 'strokesInit',
   Control = 'control',
   Logging = 'log',
   LoggingInit = 'logInit',
   Stats = 'stats',
   StatsInit = 'statsInit',
}

export enum MeteoEvents {
   Thunder = 'H_THUNDER',
   Wind = 'WIND',
   Sleet = 'SLEET',
   SnowDrift = 'SNOWDRIFT',
   Rain = 'RAIN',
   Snow = 'SNOW',
   Fog = 'FOG',
   SurfaceFrost = 'SURF_FROST',
   ExtremeHot25 = 'XTR_HOT25',
   ExtremeHot27 = 'XTR_HOT27',
   ExtremeHot = 'XTR_HOT',
   ExtremeCold = 'XTR_COLD',
   Rainfall = 'RAINFALL',
   Other = 'OTHER',
}

export enum SunState {
   Daytime = 'DAYTIME',
   Sunset = 'SUNSET',
   Sunrise = 'SUNRISE',
   CivilTwilight = 'CIVIL_TWILIGHT',
   NauticalTwilight = 'NAUTICAL_TWILIGHT',
   AstronomicalTwilight = 'ASTRONOMICAL_TWILIGHT',
   Night = 'NIGHT',
}

export interface IConfig {
   restPort: number;
   socketIOPort: number;
   environment: Environment;
   mongoLink: string;
   lightningMapsUrl: string;
   geoCodingDistanceThreshold: number;
   dbDupeCheckingTimeout: number;
}

export interface IServerError {
   code: string;
   errno: string;
   syscall: string;
   address: string;
   port: number;
}

export interface ICountryReverseGeoCodeResult {
   cc: string;
   seaData: any;
}

export interface ISocketIoAllStatRequest {
   type: number;
   lastHrs: number;
}

export interface IUserSession {
   uid: string;
   did?: string;
   sid: string;
}

export interface IUserAuthenticationData {
   uid: string;
   sid: string;
}

export interface IInitializationMessage {
   latLon?: number[];
   acc?: number;
   alt?: number;
   id?: number; // last id
   dtr?: number; // distance treshold
   dirs?: number[]; // directions
   se?: IUserSession;
   lang?: string; // language
   dt?: string; // device msgType
   ad?: number; // auto distance
   cn?: boolean; // can notify
   hrd?: IHungarianRegionalInformation;
   lastRec?: Date;
}

export interface IGeoInformation {
   distance: number;
   bearing: number;
}

export interface IHungarianRegionalInformation {
   isInHungary: boolean;
   regionalData?: {
      countyName: string;
      regionalUnitName: string;
   };
}

export interface ILightningMapsStroke {
   time: number;
   lat: number;
   lon: number;
   id: number;
   inv: number;
   del: number;
   sta: any;
}

export interface ILightningMapsStrokeBulk {
   time: number;
   id: number;
   max_id: number;
   type: number;
   strokes: Array<ILightningMapsStroke>;
}

export interface IGeoAddress {
   cc: string;
   regDef: string;
   sRegDef: string;
   smDef: string;
   strDef: string;
   suburbDef: string;
   sm_hun?: string;
}

export interface IStroke {
   sequentialId?: number;
   latLon: number[];
   locationData: IGeoAddress;
   time: Date;
   sunData: {
      sunElev: number;
      azimuth: number;
      sunState: SunState;
   };
   blitzortungId: number;
   dist?: number;
   _id?: number;
}

export interface IStrokeWithDistance {
   s: IStroke;
   dist: number;
   nc: number;
   dLatLon: number[];
}

export interface IStrokeWithSavedLocation {
   s: IStroke;
   dist: number;
   nc: number;
   savedLoc: {
      latLon: number[];
      name: string;
   };
}

export interface IIdAndDate {
   id: number;
   time: number;
}

export interface ISocketInitialization {
   v: number;
   i: number;
   s: boolean;
   x: number;
   w: number;
   tx: number;
   tw: number;
   t: number;
   h: string;
   p: number[];
   l: number;
   b: boolean;
   z: number;
   a: number;
}

export interface IDeviceUpdateRequestBody {
   se: IUserSession;
   acc: number;
   dt: string;
   latLon: number[];
}

export enum LocationUpdateSource {
   SocketIO = 'SOCKET.IO',
   PeriodicQuery = 'PERIODIC',
}

export interface ILocationUpdateRequest {
   updater: LocationUpdateSource;
   deviceData: IDeviceUpdateRequestBody;
}

export interface IDeviceLocationBase {
   _id?: any;
   num: number;
   updater: LocationUpdateSource | string;
   timeFirst: Date;
   timeLast: Date;
   latLon: number[];
   location: ILocationLogResult;
   did: string;
   userData: {
      uid: string;
      dt: string;
   };
   hunData: IHungarianRegionalInformation;
}

export interface IDeviceLocationLog extends IDeviceLocationBase {
   alerts: IStrokeWithDistance[];
   accsum: number;
}

export interface IDeviceLocationRecent extends IDeviceLocationBase {
   acc: number;
   lastAlert: IStrokeWithDistance;
   lastInAlertZone?: Date;
   lastLogId: string;
   dist?: number;
}

export enum LogType {
   Normal = 'NORMAL',
   Warning = 'WARNING',
   Error = 'ERROR',
}

export interface ILog {
   time: Date;
   canBeHidden: boolean;
   isError: boolean;
   colors: {
      bg: number;
      fg: number;
   };
   messageParts: {
      msgType: LogType;
      tag: string;
      msg: string;
   };
}

export enum HungarianAlertTypes {
   RegionalUnit = 'regionalUnit',
   County = 'county',
}

export interface IMetHuEntityWithData {
   data: string;
   type: HungarianAlertTypes;
   code: number;
}

export interface IMetHuData {
   counties: number[];
   regionalUnits: number[];
}

export interface IMeteoAlert {
   level: number;
   type: MeteoEvents;
   timeFirst?: Date | number;
   timeLast?: Date | number;
}

export interface IAlertArea {
   alerts: Array<IMeteoAlert>;
   name: string;
   type: HungarianAlertTypes;
}

export interface IFcmBase {
   time_to_live: number;
   registration_ids: string[];
   data: {
      message: {
         mtype: string;
         data: any;
      };
   };
}

export interface IFcmMessage {
   time_to_live: number;
   registration_ids: Array<string>;
   data: any;
}

export interface IFcmStrokeLastLocation extends IFcmMessage {
   data: {
      message: {
         mtype: 'STROKE';
         data: IStrokeWithDistance;
      };
   };
}

export interface IFcmStrokeSavedLocation extends IFcmMessage {
   data: {
      message: {
         mtype: 'STROKE_SAVEDLOC';
         data: IStrokeWithSavedLocation;
      };
   };
}

export interface IUser {
   userName: string;
   fullName: string;
   email: string;
   password: string;
}

export interface ISettlementDocument extends mongoose.Document {
   _id: mongoose.Types.ObjectId;
   properties: any;
   geometry: {
      type: string;
      coordinates: number[];
   };
}

export interface ICountryOutlineDocument extends mongoose.Document {
   _id: mongoose.Types.ObjectId;
   properties: any;
   tags: any;
   geometry: {
      type: string;
      coordinates: number[][][][];
   };
}

export interface IUserDocument extends mongoose.Document {
   userName: string;
   fullName: string;
   email: string;
   password: string;
   _id: mongoose.Types.ObjectId;
   logIns: Array<IUserLogInDocument>;
}

export interface ISavedLocation extends mongoose.Document {
   uid: mongoose.Types.ObjectId;
   latLon: number[];
   locationData: IGeoAddress;
   hunData: IHungarianRegionalInformation;
   name: string;
   type: string;
   dist?: number;
   alerts: IStrokeWithSavedLocation[];
   lastAlert: IStrokeWithSavedLocation;
   lastInAlertZone: Date;
   meteoAlerts: IMeteoAlert[];
   _id: mongoose.Types.ObjectId;
}

export interface IUserLogInDocument {
   _id: mongoose.Types.ObjectId;
   time: Date;
   userAgent: string;
   ip: string;
}

export interface IMinutelyStatDocument extends mongoose.Document {
   timeStart: Date;
   all: number;
   data: any;
}

export interface IAllStatDocument extends mongoose.Document {
   period: string;
   all: number;
   isYear: boolean;
   data: any;
}

export interface IStrokeDocument extends IStroke, mongoose.Document {
   _id: number;
}

export interface ILogDocument extends mongoose.Document {
   time: Date;
   canBeHidden: boolean;
   isError: boolean;
   colors: {
      bg: number;
      fg: number;
   };
   messageParts: {
      msgType: LogType;
      tag: string;
      msg: string;
   };
}

export interface StationData {
   latLon: number[];
   name: string;
   sId: number;
}

export interface IStationDocument extends mongoose.Document, StationData {
   usedCn: string;
   detCnt: string;
   lastSeen: Date;
   location: IGeoAddress;
}

export interface IDeviceLocationBaseDocument extends IDeviceLocationBase, mongoose.Document {
   _id: mongoose.Types.ObjectId;
}

export interface IDeviceLocationLogDocument extends IDeviceLocationLog, IDeviceLocationBaseDocument {
   _id: mongoose.Types.ObjectId;
   accsum: number;
   alerts: IStrokeWithDistance[];
}

export interface IDeviceLocationRecentDocument extends IDeviceLocationRecent, IDeviceLocationBaseDocument {
   _id: mongoose.Types.ObjectId;
   acc: number;
   lastAlert: IStrokeWithDistance;
   lastInAlertZone?: Date;
   lastLogId: string;
}

export interface IMetHuAlertDocument extends mongoose.Document {
   areaName: string;
   areaType: HungarianAlertTypes;
   timeFirst: Date;
   timeLast: Date;
   alertType: MeteoEvents;
   level: number;
   desc: string;
   _id: string;
}

export interface IFlagsRequest extends express.Request {
   params: {
      format: string;
      size: string;
      cc: string;
   };
}

export interface IErrorRequest extends express.Request {
   params: {
      type: string;
      time: string;
   };
}

export interface INearbyRequest extends express.Request {
   params: {
      lat: string;
      lon: string;
   };
}

export interface IUserRegistrationRequest {
   body: {
      uname: string;
      email: string;
      pass: string;
      fullname: string;
   };
}

export interface IUserLoginRequest {
   body: {
      uname: string;
      pass: string;
   };
}

export interface IUserRegistrationResponse {
   event: string;
   errors: string[];
   userData?: {
      userId: string;
   };
}

export interface IUserLoginResponse {
   event: string;
   errors: string[];
   userData?: {
      userId: string;
      userName: string;
      sessionId: string;
   };
}

export interface StrokeSocket extends Socket {
   userInfo: IInitializationMessage | null;
   allStatInfo: ISocketIoAllStatRequest | null;
   connectionType: SocketIoConnectionTypes[] | null;
   on(event: string | symbol | SocketIoRooms, listener: (socket: Socket) => void): this;
   emit(event: string | symbol | SocketIoRooms, ...args: any[]): boolean;
}

export interface IAuthenticatedRequest extends express.Request {
   authContext: IUserDocument;
}

export interface IDeviceUpdateRequest extends IAuthenticatedRequest {
   body: IDeviceUpdateRequestBody;
}

export interface ILocationLogsRequest extends IAuthenticatedRequest {
   body: {
      se: IUserSession;
   };
}

export interface INewSavedLocationInstance extends IAuthenticatedRequest {
   body: {
      se: IUserSession;
      latLon: number[];
      name: string;
      type: string;
   };
}

export interface IUserDataRequest extends IAuthenticatedRequest {
   body: IUserSession;
}

export interface IRemoveSavedLocationInstance extends IAuthenticatedRequest {
   body: {
      se: IUserSession;
      savedLocationId: string;
   };
}

export interface IGoogleGeocodingResponse {
   results: GeocoderResult[];
   status: GeocoderStatus;
}

export interface IStationsFromWeb {
   sId: number;
   latLon: number[];
   name: string;
}

export interface ILightningmapsStationData {
   user: string;
   stations: { [key: string]: ILightningMapsStationInfo };
}

export interface ILightningMapsStationInfo {
   0: number;
   1: number;
   a: string;
   c: string;
   C: string;
   s: string;
}
