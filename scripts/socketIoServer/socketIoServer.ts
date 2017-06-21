import * as Rx from 'rx';
import * as http from 'http';
import * as geoUtils from '../utils/geo';
import {JsonUtils} from '../utils/jsonUtils';
import {StatUtils} from '../utils/statUtils';
import * as io from 'socket.io';
import * as mongo from "../mongo/mongoDbSchemas";
import {Entities} from "../interfaces/entities"
import { localeDatabase } from "../utils/localeDatabase";
import { logger } from "../logger/logger";
import { databaseSaver } from "../databaseSaver/databaseSaver"
import { locationUpdater} from "../databaseSaver/locationUpdater"
import {config } from "../config"
import {Modules} from "../interfaces/modules";
import ISocketIoServer = Modules.ISocketIoServer;
import IDatabaseSaver = Modules.IDatabaseSaver;
import Subject = Rx.Subject;
import IStroke = Entities.IStroke;
import ILocationUpdater = Modules.ILocationUpdater;
import Observable = Rx.Observable;
import TimeInterval = Rx.TimeInterval;
import ILogger = Modules.ILogger;
import IAllStatDocument = Entities.IAllStatDocument;
import IMinutelyStatDocument = Entities.IMinutelyStatDocument;
import IInitializationMessage = Entities.IInitializationMessage;
import ILog = Entities.ILog;
import IHungarianRegionalInformation = Entities.IHungarianRegionalInformation;
import IAlertArea = Entities.IAlertArea;
import IDeviceUpdateRequestBody = Entities.IDeviceUpdateRequestBody;
import IGeoInformation = Entities.IGeoInformation;
import Socket = SocketIO.Socket;
import StrokeSocket = Entities.StrokeSocket;
import Server = SocketIO.Server;

/*
    Socket.IO szerver osztály. Ez kezeli a bejövő élő kapcsolatokat, és küldi el az adatokat a kliesnek (villám, figyelmeztetés, stb.)
*/
export class SocketIoServer implements ISocketIoServer {
    private databaseSaver: IDatabaseSaver;
    private socketIoServer: Server;
    private lastDataFromDatabase: Subject<IStroke>;
    private portNumber: number;
    private httpServer: http.Server;
    private locationUpdater: ILocationUpdater;
    private statUpdaterTimer: Observable<TimeInterval<number>>;

    public static STAT_HOURS: number = 24;
    public static MAXIMAL_DATA = 400;
    public static ROOM_STROKES: string = "strokes";
    public static ROOM_ALERTS: string = "alerts";
    public static ROOM_STROKES_INIT: string = "strokesInit";
    public static ROOM_CONTROL: string = "control";
    public static ROOM_LOGGING: string = "log";
    public static ROOM_LOGGING_INIT: string = "logInit";
    public static ROOM_STATS: string = "stats";
    public static ROOM_STATS_INIT: string = "statsInit";
    public static AREA_TYPE_REGIONAL_UNIT: string = "regionalUnit";
    public static AREA_TYPE_COUNTY: string = "county";

    private static CT_LOG = 1;
    private static CT_STAT = 2;
    private static CT_STROKES = 3;

    constructor(private logger: ILogger, databaseSaver: IDatabaseSaver, locationUpdater: ILocationUpdater, statRefreshTickInSeconds: number, portNumber: number) {
        this.databaseSaver = databaseSaver;
        this.portNumber = portNumber;
        this.lastDataFromDatabase = this.databaseSaver.lastSavedStroke;

        this.httpServer = http.createServer((req, res) => {
            res.writeHead(0x1A4);
            res.end();
        });


        this.locationUpdater = locationUpdater;
        this.socketIoServer = io(this.httpServer);
        this.httpServer.listen(this.portNumber);
        this.httpServer.on("error", (errorMessage) => this.onServerError(errorMessage));
        this.socketIoServer.on('connection', connection => this.onConnectionRequest(connection));
        this.lastDataFromDatabase.subscribe(stroke => this.strokeReceived(stroke));
        this.logger.logs.subscribe(x => this.logsReceived(x));
        this.statUpdaterTimer = Observable.timer(0, statRefreshTickInSeconds * 1000)
            .timeInterval();

        this.statUpdaterTimer.subscribe(x => this.statUpdateTriggered());
    }

    private onServerError(error: Error) {
        this.logger.sendErrorMessage(0, 0, "Socket.IO Server", JSON.stringify(error), false);
        if (error.name === "EADDRINUSE") {
            this.logger.sendErrorMessage(0, 0, "Socket.IO Server", `Fatal error, the port is in use.`, false);
            process.exit(1);
        }
    }


    private getAllSockets(): Array<StrokeSocket> {
        let sockets = this.socketIoServer.nsps['/'].connected;
        let socketsArray: Array<Socket> = [];
        for (let sockKey in sockets) {
            if (sockets.hasOwnProperty(sockKey))
                socketsArray.push(sockets[sockKey]);
        }
        return socketsArray;
    }

    private onConnectionRequest(request: StrokeSocket) {
        request.connectionType = [];
        this.logger.sendNormalMessage(0, 120, 'Socket.IO server', `User connected: ${request.client.conn.remoteAddress}`, false);
        request.on(SocketIoServer.ROOM_STROKES_INIT, (message) => this.onStrokesInitReceived(request, message));
        request.on(SocketIoServer.ROOM_STATS_INIT, (msg) => this.onStatQueryRequested(request, msg));
        request.on(SocketIoServer.ROOM_LOGGING_INIT, (message) => this.onLogRequestReceived(request));
        request.on('disconnect', connection => this.onClientDisconnected(connection));
    }

    private statUpdateTriggered(): void {
        this.getAllSockets().forEach(connection => {
            if (connection.connectionType.indexOf(SocketIoServer.CT_STAT) !== -1) {
                this.onStatQueryRequested(connection, connection.allStatInfo);
            }
        });
    }

    private async onStatQueryRequested(request: StrokeSocket, message: any) {
        this.logger.sendNormalMessage(0, 112, 'Socket.IO server', `Stat request: ${request.client.conn.remoteAddress}, message: ${JSON.stringify(message)}`, false);
        request.connectionType.push(SocketIoServer.CT_STAT);

        const year = new Date().getUTCFullYear();
        const lastHour = 1000 * 60 * 60;
        const lastDay = 1000 * 60 * 60 * 24;

        const statData =  await Observable.forkJoin([
            Observable.create(observer => {
                mongo.AllStatMongoModel.findOne({ isYear: false, period: 'all' })
                    .exec((error, result: IAllStatDocument) => {
                        observer.onNext(StatUtils.processStatResult(result.data));
                        observer.onCompleted();
                    });
            }),
            Observable.create(observer => {
                mongo.AllStatMongoModel.findOne({ isYear: true, period: year.toString() })
                    .exec((error, result: IAllStatDocument) => {
                        observer.onNext(StatUtils.processStatResult(result.data));
                        observer.onCompleted();
                    });
            }),
            Observable.create(observer => {
                mongo.MinStatMongoModel.find({ 'timeStart': { '$gt': new Date(new Date().getTime() - lastDay) } })
                    .exec((error, results: Array<IAllStatDocument>) => {
                        observer.onNext(StatUtils.getFlatAllStatistics(results));
                        observer.onCompleted();
                    });
            }),
            Observable.create(observer => {
                mongo.MinStatMongoModel.find({ 'timeStart': { '$gt': new Date(new Date().getTime() - lastHour) } })
                    .exec((error, results: Array<IAllStatDocument>) => {
                        observer.onNext(StatUtils.getFlatAllStatistics(results));
                        observer.onCompleted();
                    });
            }),
            Observable.create(observer => {

                if (!request.areStatsAlreadyInitialized) {
                    request.areStatsAlreadyInitialized = true;
                    mongo.TenminStatMongoModel.find({}).sort({ timeStart: -1 }).limit(SocketIoServer.STAT_HOURS * 6)
                        .exec((error, result: Array<IMinutelyStatDocument>) => {
                            observer.onNext(StatUtils.getFlatTenMinStatistics(result));
                            observer.onCompleted();
                        });
                } else {
                    return Observable.return([]);
                }
            })


        ]).toPromise();
        request.emit(SocketIoServer.ROOM_STATS_INIT, statData);
    }


    private logsReceived(log: ILog): void {
        this.getAllSockets().forEach(connection => {
            if (connection.connectionType.indexOf(SocketIoServer.CT_LOG) !== -1) {
                connection.emit(SocketIoServer.ROOM_LOGGING, log);
            }
        });
    }

    private onLogRequestReceived(connection: StrokeSocket) {
        connection.connectionType.push(SocketIoServer.CT_LOG);
        mongo.LogsMongoModel.find({ time: { '$gt': new Date(new Date().getTime() - 1000 * 60 * 10) } }).sort({ time: -1 }).limit(10000).exec((error, results: Array<ILog>) => {
            connection.emit(SocketIoServer.ROOM_LOGGING_INIT, results);
        });
    }
    private validateInitializationMessage(initializationMessage: IInitializationMessage): boolean {
        if (initializationMessage.latLon == undefined || initializationMessage.latLon.length !== 2 || isNaN(initializationMessage.latLon[0]) || isNaN(initializationMessage.latLon[0])) {
            return false;
        }
        else if (initializationMessage.dirs == undefined) {
            return false;
        }
        initializationMessage.dirs.forEach(x => {
            if (isNaN(x)) {
                return false;
            }
        });
        return true;
    }
    private static async sendAlerts(connection: Socket, hungarianData: IHungarianRegionalInformation): Promise<IAlertArea> {
        if (hungarianData.isInHungary) {
            const alerts = await mongo.AlertsMongoModel.find({ "areaType": SocketIoServer.AREA_TYPE_COUNTY, "areaName": hungarianData.regionalData.countyName, "timeLast": { "$eq": null } });
            const toAlerts = alerts.map(x => {
                return ({
                    type: x.alertType,
                    level: x.level,
                    timeStart: x.timeFirst.getTime()
                });
            });

            let alertsObject: IAlertArea = {
                alerts: toAlerts,
                name: hungarianData.regionalData.countyName,
                type: "county"
            };
            connection.emit(SocketIoServer.ROOM_ALERTS, alertsObject);
            return Promise.resolve(alertsObject);
        }
    }
    private static getLocaleName(stroke: IStroke, locale: string): IStroke {
        if (locale && localeDatabase[locale] != undefined && stroke.locationData[`sm_${locale}`]) {
            stroke.locationData.smDef = stroke.locationData[`sm_${locale}`];
        }
        return stroke;
    }
    private getLocaleNames(strokes: Array<IStroke>, locale: string): Array<IStroke> {
        if (locale && localeDatabase[locale] != undefined) {
            strokes.map(stroke =>  SocketIoServer.getLocaleName(stroke, locale));
        }
        return strokes;
    }
    private async onStrokesInitReceived(connection: StrokeSocket, message: any) {
        try {
            connection.connectionType.push(SocketIoServer.CT_STROKES);
            let initMessage = <IInitializationMessage>message;
            this.logger.sendNormalMessage(17, 24, 'Socket.IO server', `Strokes request: ${JSON.stringify(message)}`, false);

            if (this.validateInitializationMessage(initMessage)) {
                initMessage.lastRec = new Date();
                let canSendInitialData = true;
                let canSaveLocation = true;
                if (connection.userInfo != undefined) {
                    if (initMessage.lastRec.getTime() - connection.userInfo.lastRec.getTime() < 500) {
                        canSaveLocation = false;
                    }
                    connection.userInfo.ad ? initMessage.ad = connection.userInfo.ad : initMessage.ad = Infinity;

                } else {
                    canSendInitialData = true;
                }
                if (initMessage.dtr == undefined) {
                    initMessage.dtr = -1;
                    initMessage.id = 0;
                }
                initMessage.cn = true;

                if (initMessage.id == undefined) {
                    initMessage.id = 0;
                }

                initMessage.acc = initMessage.acc == undefined ? 0 : Number(initMessage.acc);
                connection.userInfo = initMessage;

                if (canSendInitialData) {
                    const dataWithDistances: IStroke[] = <IStroke[]>await mongo.TtlTenMinStrokeMongoModel.aggregate([
                        {
                            '$geoNear': {
                                limit: SocketIoServer.MAXIMAL_DATA,
                                near: { type: "Point", coordinates: connection.userInfo.latLon },
                                distanceField: "dist",
                                includeLocs: "latLon",
                                spherical: true
                            }
                        },
                        {
                            '$project': {
                                latLon: 1,
                                time: 1,
                                blitzortungId: 1,
                                sunData: 1,
                                locationData: 1,
                                dist: {
                                    '$divide': ['$dist',1000]
                                }
                            }
                        }
                    ]);
                    let result = this.getLocaleNames(dataWithDistances, connection.userInfo.lang);
                    if (connection.userInfo.id !== 0) {
                        result = result.filter(x => x._id > connection.userInfo.id);
                    }

                    const initArray: any = [];
                    if (result.length !== 0) {

                        if (connection.userInfo.dtr === 0) {
                            connection.userInfo.ad = geoUtils.getDistance(connection.userInfo.latLon, result[result.length - 1].latLon);
                            connection.emit(SocketIoServer.ROOM_CONTROL, { distance: connection.userInfo.ad });
                        }


                        if (canSendInitialData) {
                            result.forEach(strokeDb => {
                                if (connection.userInfo.id < strokeDb._id && (geoUtils.isInDirection(connection.userInfo.dirs, geoUtils.getBearing(connection.userInfo.latLon, strokeDb.latLon)) ||
                                        strokeDb.dist < 10
                                    ) &&
                                    ((strokeDb.dist < connection.userInfo.dtr) ||
                                    connection.userInfo.dtr === -1 || connection.userInfo.dtr === 0)) {
                                    let strokeArray = JsonUtils.flattenStroke(strokeDb);
                                    initArray.push(strokeArray);
                                }
                            });
                        }
                    }
                    connection.emit(SocketIoServer.ROOM_STROKES_INIT, JSON.stringify(initArray));
                }
                if (connection.userInfo.cn) {
                    let lastData: IDeviceUpdateRequestBody =
                        {
                            latLon: connection.userInfo.latLon,
                            se: connection.userInfo.se,
                            dt: connection.userInfo.dt,
                            acc: connection.userInfo.acc
                        };
                    const hungarianData = await this.locationUpdater.getHungarianData(connection.userInfo.latLon);
                    if (connection.userInfo.se && canSaveLocation) {
                        this.locationUpdater.insertLastLocationSubject.onNext({ updater: "SOCKET.IO", deviceData: lastData });
                    }
                    await SocketIoServer.sendAlerts(connection, hungarianData);
                }
            }
            else {
                connection.disconnect(true);
            }

        }
        catch (exc) {
        }
    }
    private strokeReceived(stroke: IStroke): void {
        this.getAllSockets().forEach(connection => {
            if (connection.connectionType.indexOf(SocketIoServer.CT_STROKES) !== -1) {
                if (connection.userInfo != undefined) {
                    let userInfo = connection.userInfo;
                    let clientGeoInformation: IGeoInformation = geoUtils.getDistanceAndBearing(userInfo.latLon, stroke.latLon);
                    //Szép nagy IF :))
                    if ((userInfo.dtr > clientGeoInformation.distance ||
                        userInfo.dtr === -1 ||
                        (userInfo.dtr === 0 &&
                        (userInfo.ad == undefined ||
                        clientGeoInformation.distance < userInfo.ad))) &&
                        (geoUtils.isInDirection(userInfo.dirs, clientGeoInformation.bearing) ||
                            clientGeoInformation.distance <= 10
                        )) {
                        const strokeLocalized = SocketIoServer.getLocaleName(stroke, connection.userInfo.lang);
                        const compressedStroke = JsonUtils.flattenStroke(strokeLocalized);
                        connection.emit(SocketIoServer.ROOM_STROKES, JSON.stringify(compressedStroke));
                    }
                }
            }
            else if (connection.connectionType.indexOf(SocketIoServer.CT_STAT) !== -1) {
                connection.emit(SocketIoServer.ROOM_STATS, JSON.stringify(JsonUtils.toAllStatJson(stroke)));
            }
        });
    }

    public invoke(): void {

    }

    private onClientDisconnected(connection: StrokeSocket) {
        this.logger.sendNormalMessage(0, 94, 'Socket.IO server', `User disconnected`, false);
    }
}
export const socketIoServer: ISocketIoServer = new
    SocketIoServer(logger, databaseSaver, locationUpdater, 60, config.socketIOPort);