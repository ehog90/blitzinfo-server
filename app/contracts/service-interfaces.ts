import { Subject } from 'rxjs';
import {
  ICountryReverseGeoCodeResult,
  IGeoAddress,
  IGeoCodingResult,
  IHungarianRegionalInformation,
  ILightningMapsStroke,
  ILocationUpdateRequest,
  ILog,
  ISocketInitialization,
  IStroke,
} from './entities';

export interface ILogger {
  logs: Subject<ILog>;
  sendNormalMessage(
    bgColor: number,
    fgColor: number,
    tag: string,
    message: string,
    canBeHidden: boolean,
  ): void;
  sendWarningMessage(
    bgColor: number,
    fgColor: number,
    tag: string,
    message: string,
    canBeHidden: boolean,
  ): void;
  sendErrorMessage(
    bgColor: number,
    fgColor: number,
    tag: string,
    message: string,
    canBeHidden: boolean,
  );
}

export interface ILightningMapsWebSocket {
  timeoutInSec: number;
  initializationObject: ISocketInitialization;
  strokeEventChannel: Subject<any>;
  lastTimeWhenReceived: number;
  lastReceived: Subject<ILightningMapsStroke>;
  isStrokeCorrect(stroke: ILightningMapsStroke): boolean;
  start(): void;
}

export interface ILocationUpdater {
  insertLastLocationSubject: Subject<ILocationUpdateRequest>;
  reverseGeocodeWithCountryAsync(latLon: number[]): Promise<IGeoCodingResult>;
  getHungarianData(latLon: number[]): Promise<IHungarianRegionalInformation>;
}

export interface ICountryReverseGeoCoderAsync {
  getCountryData(latLonPair: number[]): Promise<ICountryReverseGeoCodeResult>;
}

export interface IReverseGeoCoderAsync {
  getGeoInformation(latLonPair: number[]): Promise<IGeoAddress>;
}

export interface ICombinedReverseGeocoderService {
  getGeoInformation(latLonPair: number[]): Promise<IGeoAddress>;
  getHungarianGeoInformation(
    latLonPair: number[],
  ): Promise<IHungarianRegionalInformation>;
}

export interface IReverseGeoCoderService {
  serverEventChannel: Subject<any>;
  lastGeocodedStroke: Subject<IStroke>;
  assignWebSocket(lightningMapsWebSocket: ILightningMapsWebSocket): void;
}

export interface IDatabaseSaver {
  lastSavedStroke: Subject<IStroke>;
  isDupeChecking: boolean;
}

export interface ISocketIoServer {
  invoke(): void;
}

export interface IFirebaseService {
  invoke(): void;
}

export interface IMetHuParser {
  invoke(): void;
}

export interface IStationResolver {
  start(): void;
}
