import * as mongoose from "mongoose";

export module Entities {

    import Socket = SocketIO.Socket;
    export interface IResult<T> {
        result: T;
        error: any;
    }

    export interface IGeoCodingResult {
        locationData: IGeoAddress;
        hungarianData: IHungarianRegionalInformation;
    }
    export interface ILocationLogResult {
        geocodingResult: IGeoCodingResult;
        id: string;
    }

    export interface IConfig {
        restPort: number;
        socketIOPort: number;
        environment: "DEV" | "PROD";
        mongoLink: string;
        lightningMapsUrl: string;
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


    export interface IInitializationMessage {
        latLon?: number[];
        acc?: number;
        alt?: number;
        id?: number; //last id
        dtr?: number; // distance treshold
        dirs?: number[]; // directions
        se?: IUserSession;
        lang?: string; //language
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
        }
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
        latLon: number[];
        locationData: IGeoAddress;
        time: Date;
        sunData: {
            sunElev: number;
            azimuth: number;
            sunState: string;
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
            latLon: number[],
            name: string,
        }
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

    export interface ILocationUpdateRequest {
        updater: "SOCKET.IO" | "PERIODIC",
        deviceData: IDeviceUpdateRequestBody,
    }


    export interface IDeviceLocationBase {
        _id?: any,
        num: number,
        updater: string;
        timeFirst: Date;
        timeLast: Date;
        latLon: number[];
        location: IGeoAddress;
        did: string;
        userData: {
            uid: string;
            dt: string;
        }
        hunData: IHungarianRegionalInformation;
    }
    export interface IDeviceLocationLog extends IDeviceLocationBase {
        alerts: IStroke[];
        accsum: number;
    }

    export interface IDeviceLocationRecent extends IDeviceLocationBase {
        acc: number,
        lastAlert: IStrokeWithDistance;
        lastInAlertZone?: Date,
        lastLogId: string;
        dist?: number;
    }

    export interface ILog {
        time: Date;
        canBeHidden: boolean;
        isError: boolean;
        colors: {
            bg: number;
            fg: number;
        },
        messageParts: {
            msgType: "NORMAL" | "WARNING" | "ERROR";
            tag: string;
            msg: string;
        }
    }
    export interface IMetHuEntityWithData {
        data: string;
        type: "regionalUnit" | "county";
        code: number;
    }

    export interface IMetHuData {
        counties: number[];
        regionalUnits: number[];
    }

    export interface IMeteoAlert {
        level: number;
        type: string;
        timeFirst?: Date | number;
        timeLast?: Date | number;
    }

    export interface IAlertArea {
        alerts: Array<IMeteoAlert>;
        name: string;
        type: "county" | "regionalUnit";
    }


    export interface IFcmBase {
        time_to_live: number,
        registration_ids: string[],
        data: {
            message: {
                mtype: string;
                data: any;
            }
        }
    }


    export interface IFcmMessage {
        time_to_live: number;
        registration_ids: Array<string>;
        data: any;
    }

    export interface IFcmStrokeLastLocation extends IFcmMessage {
        data: {
            message: {
                mtype: "STROKE";
                data: IStrokeWithDistance;
            }
        }
    }

    export interface IFcmStrokeSavedLocation extends IFcmMessage {
        data: {
            message: {
                mtype: "STROKE_SAVEDLOC";
                data: IStrokeWithSavedLocation;
            }
        }
    }

    export interface IUser {
        userName: string;
        fullName: string;
        email: string;
        password: string;
    }
    
    
    export interface ISettlementDocument extends mongoose.Document {
        _id: mongoose.Types.ObjectId;
        properties: any,
        geometry:
        {
            type: string;
            coordinates: number[];
        }
    }

    export interface ICountryOutlineDocument extends mongoose.Document {
        _id: mongoose.Types.ObjectId;
        properties: any,
        tags: any;
        geometry:
            {
                type: string;
                coordinates: number[][][][];
            }
    }


    export interface IUserDocument extends mongoose.Document {
        userName: string;
        fullName: string;
        email: string;
        password: string;
        _id: mongoose.Types.ObjectId;
        logIns: Array<IUserLogInDocument>;
    }

    export interface ISavedLocation extends mongoose.Document{
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

    export interface IUserLogInDocument extends mongoose.Document {
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
        },
        messageParts:
        {
            msgType: "NORMAL" | "WARNING" | "ERROR";
            tag: string;
            msg: string;
        }
    }

    export interface IStationDocument extends mongoose.Document{
        latLon: number[];
        sId: number;
        name: string;
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
        accsum: number,
        alerts: IStroke[];
    }

    export interface IDeviceLocationRecentDocument extends IDeviceLocationRecent, IDeviceLocationBaseDocument {
        _id: mongoose.Types.ObjectId;
        acc: number,
        lastAlert: IStrokeWithDistance;
        lastInAlertZone?: Date,
        lastLogId: string;
    }

    export interface IMetHuAlertDocument extends mongoose.Document {
        areaName: string,
        areaType: "county" | "regionalUnit",
        timeFirst: Date,
        timeLast: Date,
        alertType: string,
        level: number,
        desc: string,
        _id: string,
    }

    export interface ILocationLogsRequest {
        body:
            {
                se: IUserSession;
            }
    }

    export interface IFlagsRequest {
        params:
            {
                format: string;
                size: number;
                cc: string;
            }
    }

    export interface INearbyTequest {
        params:
            {
                lat: number;
                lon: number;
            }
    }

    export interface IErrorRequest {
        params:
            {
                type: string;
                time: number;
            }
    }


    export interface IKmlRequest {
        params:
            {
                local?: string;
            }
    }

    export interface IDeviceUpdateRequest {
        body: Entities.IDeviceUpdateRequestBody;
    }

    export interface IUserDataRequest {
        body: Entities.IUserSession;
    }

    export interface INewSavedLocationInstance {
        body: {
            se: Entities.IUserSession;
            latLon: number[];
            name: string;
            type: string;
        }
    }

    export interface IRemoveSavedLocationInstance {
        body: {
            se: Entities.IUserSession;
            savedLocationId: string;
        }
    }

    export interface IUserRegistrationRequest {
        body:
            {
                uname: string;
                email: string;
                pass: string;
                fullname: string;
            }
    }

    export interface IUserLoginRequest {
        body:
            {
                uname: string;
                pass: string;
            }
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
        userInfo?: Entities.IInitializationMessage;
        allStatInfo?: Entities.ISocketIoAllStatRequest;
        areStatsAlreadyInitialized?: boolean;
        connectionType?: number[];
    }
}

