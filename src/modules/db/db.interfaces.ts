import * as mongoose from 'mongoose';
import { LogType } from '../logger/logger.interfaces';

export interface IGeoAddress {
  cc: string;
  regDef: string;
  sRegDef: string;
  smDef: string;
  strDef: string;
  suburbDef: string;
  sm_hun?: string;
}
export interface IDeviceLocationRecent extends IDeviceLocationBase {
  acc: number;
  lastAlert: IStrokeWithDistance;
  lastInAlertZone?: Date;
  lastLogId: string;
  dist?: number;
}

export enum LocationUpdateSource {
  SocketIO = 'SOCKET.IO',
  PeriodicQuery = 'PERIODIC',
}

export interface IGeoCodingResult {
  locationData: IGeoAddress;
  hungarianData: IHungarianRegionalInformation;
}

export interface ILocationLogResult {
  geocodingResult: IGeoCodingResult;
  id: string;
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

export enum HungarianAlertTypes {
  RegionalUnit = 'regionalUnit',
  County = 'county',
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

export interface IGeoAddress {
  cc: string;
  regDef: string;
  sRegDef: string;
  smDef: string;
  strDef: string;
  suburbDef: string;
  sm_hun?: string;
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

export interface IHungarianRegionalInformation {
  isInHungary: boolean;
  regionalData?: {
    countyName: string;
    regionalUnitName: string;
  };
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

export interface IDeviceLocationBaseDocument
  extends IDeviceLocationBase,
    mongoose.Document {
  _id: mongoose.Types.ObjectId;
}

export interface IDeviceLocationLogDocument
  extends IDeviceLocationLog,
    IDeviceLocationBaseDocument {
  _id: mongoose.Types.ObjectId;
  accsum: number;
  alerts: IStrokeWithDistance[];
}

export interface IDeviceLocationRecentDocument
  extends IDeviceLocationRecent,
    IDeviceLocationBaseDocument {
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
