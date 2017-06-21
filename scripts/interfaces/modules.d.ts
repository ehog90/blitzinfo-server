/*
 Az egyes osztályokhoz tartó interfészek publikus metódusainak leírásai.
 */
import {Entities} from "./entities";
declare module Modules {
    import ILog = Entities.ILog;
    import ISocketInitialization = Entities.ISocketInitialization;
    import ILightningMapsStroke = Entities.ILightningMapsStroke;
    import ILocationUpdateRequest = Entities.ILocationUpdateRequest;
    import IGeocodingResult = Entities.IGeoCodingResult;
    import IHungarianRegionalInformation = Entities.IHungarianRegionalInformation;
    import ICountryReverseGeocodeResult = Entities.ICountryReverseGeoCodeResult;
    import IGeoAddress = Entities.IGeoAddress;
    import IStroke = Entities.IStroke;
    import Observable = Rx.Observable;
    import Subject = Rx.Subject;

    export interface ILogger {
        logs: Rx.Subject<ILog>;
        sendNormalMessage(bgColor: number, fgColor: number, tag: string, message: string, canBeHidden: boolean): void;
        sendWarningMessage(bgColor: number, fgColor: number, tag: string, message: string, canBeHidden: boolean): void;
        sendErrorMessage(bgColor: number, fgColor: number, tag: string, message: string, canBeHidden: boolean);
    }

    export interface ILightningMapsWebSocket {
        timeoutInSec: number;
        initializationObject: ISocketInitialization;
        strokeEventChannel: Rx.Subject<any>;
        lastTimeWhenReceived: number;
        lastReceived: Subject<ILightningMapsStroke>;
        isStrokeCorrect(stroke: ILightningMapsStroke): boolean;
        start(): void;
    }

    export interface ILocationUpdater {
        insertLastLocationSubject: Subject<ILocationUpdateRequest>;
        reverseGeocodeWithCountryAsync(latLon: number[]): Promise<IGeocodingResult>;
        getHungarianData(latLon: number[]): Promise<IHungarianRegionalInformation>;
    }

    export interface ICountryReverseGeoCoderAsync {
        getCountryData(latLonPair: number[]): Promise<ICountryReverseGeocodeResult>;
    }

    export interface IHungarianRegionalReverseGeoCoder {
        getRegionalInformation(latLonPair: number[]): Promise<IHungarianRegionalInformation>;
    }

    export interface IReverseGeoCoderAsync {
        getGeoInformation(latLonPair: number[]): Promise<IGeoAddress>
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
        invoke(): void
    }

    export interface IFirebaseService {
        invoke(): void
    }

    export interface IMetHuParser {
        invoke(): void;
    }

    export interface IStationResolver {
        start(): void;
    }
}