import {loggerInstance} from "../logger/loggerInstance";

import * as http from "http";
import {forkJoin, timer, Observable, Subject, TimeInterval} from "rxjs";
import {map, timeInterval} from "rxjs/operators";
import * as socketIo from 'socket.io';
import {config} from "../config";
import {databaseSaverInstance} from "../databaseSaver/databaseSaverInstance";
import {locationUpdaterInstance} from "../databaseSaver/locationUpdaterInstance";
import {
    HungarianAlertTypes,
    IAlertArea, IAllStatDocument, IDeviceUpdateRequestBody, IGeoInformation,
    IHungarianRegionalInformation, IInitializationMessage, ILog, IMetHuAlertDocument,
    IStroke, LocationUpdateSource,
    SocketIoConnectionTypes,
    SocketIoRooms,
    StrokeSocket
} from "../interfaces/entities";
import {IDatabaseSaver, ILocationUpdater, ILogger, ISocketIoServer} from "../interfaces/modules";
import * as mongo from "../mongo/mongoDbSchemas";
import * as geoUtils from "../utils/geo";
import {JsonUtils} from "../utils/jsonUtils";
import {localeDatabase} from "../utils/localeDatabase";
import {StatUtils} from "../utils/statUtils";

export class SocketIoServer implements ISocketIoServer {

    constructor(private logger: ILogger,
                private databaseSaver: IDatabaseSaver,
                private locationUpdater: ILocationUpdater,
                private statRefreshTickInSeconds: number,
                private portNumber: number) {
        this.lastDataFromDatabase = this.databaseSaver.lastSavedStroke;
        this.httpServer = http.createServer((req, res) => {
            res.writeHead(0x1A4);
            res.end();
        });

        this.socketIoServer = socketIo(this.httpServer);
        this.httpServer.listen(this.portNumber);
        this.httpServer.on("error", (errorMessage) => this.onServerError(errorMessage));
        this.socketIoServer.on('connection', connection => this.onConnectionRequest(<StrokeSocket>connection));
        this.lastDataFromDatabase.subscribe(stroke => this.strokeReceived(stroke));
        this.logger.logs.subscribe(x => this.logsReceived(x));
        this.statUpdaterTimer = timer(0, this.statRefreshTickInSeconds * 1000)
            .pipe(timeInterval());
        this.statUpdaterTimer.subscribe(x => this.statUpdateTriggered());
    }

    public static STAT_HOURS = 24;
    public static MAXIMAL_DATA = 400;
    public static LAST_HOUR = 1000 * 60 * 60;
    public static LAST_DAY = 1000 * 60 * 60 * 24;
    private socketIoServer: socketIo.Server;
    private lastDataFromDatabase: Subject<IStroke>;
    private httpServer: http.Server;
    private statUpdaterTimer: Observable<TimeInterval<number>>;

    private static async onLogRequestReceived(connection: StrokeSocket) {
        connection.connectionType.push(SocketIoConnectionTypes.Log);
        const results = await mongo.LogsMongoModel.find(
            {
                time:
                    {'$gt': new Date(Date.now() - 600000)}
            }).sort({time: -1}).limit(10000).lean();
        connection.emit(SocketIoRooms.LoggingInit, results);
    }

    private static async sendAlerts(connection: StrokeSocket, hungarianData: IHungarianRegionalInformation): Promise<IAlertArea> {
        if (hungarianData.isInHungary) {
            const alerts = <IMetHuAlertDocument[]>await mongo.AlertsMongoModel.find({
                "areaType": HungarianAlertTypes.County,
                "areaName": hungarianData.regionalData.countyName,
                "timeLast": {"$eq": null}
            }).lean();
            const toAlerts = alerts.map(x => {
                return ({
                    type: x.alertType,
                    level: x.level,
                    timeStart: x.timeFirst.getTime()
                });
            });

            const alertsObject: IAlertArea = {
                alerts: toAlerts,
                name: hungarianData.regionalData.countyName,
                type: HungarianAlertTypes.County
            };
            connection.emit(SocketIoRooms.Alerts, alertsObject);
            return Promise.resolve(alertsObject);
        }
    }

    private static getLocaleName(stroke: IStroke, locale: string): IStroke {
        if (locale && localeDatabase[locale] !== undefined && stroke.locationData[`sm_${locale}`]) {
            stroke.locationData.smDef = stroke.locationData[`sm_${locale}`];
        }
        return stroke;
    }

    private onServerError(error: Error) {
        this.logger.sendErrorMessage(0, 0, "Socket.IO Server", JSON.stringify(error), false);
        if (error.name === "EADDRINUSE") {
            this.logger.sendErrorMessage(0, 0, "Socket.IO Server", `Fatal error, the port is in use.`, false);
            process.exit(1);
        }
    }


    private getAllSockets(): Array<StrokeSocket> {
        const sockets = this.socketIoServer.nsps['/'].connected;
        const socketsArray = [];
        for (const sockKey in sockets) {
            if (sockets.hasOwnProperty(sockKey)) {
                socketsArray.push(sockets[sockKey]);
            }
        }
        return socketsArray;
    }

    private onConnectionRequest(request: StrokeSocket) {
        request.connectionType = [];
        this.logger.sendNormalMessage(0, 120, 'Socket.IO server', `User connected: ${request.client.conn.remoteAddress}`, false);
        request.on(SocketIoRooms.StrokesInit, (message) => this.onStrokesInitReceived(request, message));
        request.on(SocketIoRooms.StatsInit, (msg) => this.onStatQueryRequested(request, msg));
        request.on(SocketIoRooms.LoggingInit, (message) => SocketIoServer.onLogRequestReceived(request));
        request.on('disconnect', connection => this.onClientDisconnected());
    }

    private statUpdateTriggered(): void {
        this.getAllSockets().forEach(connection => {
            if (connection.connectionType.indexOf(SocketIoConnectionTypes.Stat) !== -1) {
                this.onStatQueryRequested(connection, connection.allStatInfo);
            }
        });
    }

    private async onStatQueryRequested(request: StrokeSocket, message: any) {
        this.logger.sendNormalMessage(0, 112,
            'Socket.IO server', `Stat request: ${request.client.conn.remoteAddress}, message: ${JSON.stringify(message)}`,
            false);
        request.connectionType.push(SocketIoConnectionTypes.Stat);
        const year = new Date().getUTCFullYear();
        const statData = await forkJoin(
            mongo.AllStatMongoModel.findOne({
                isYear: false,
                period: 'all'
            }).toObservable().pipe(map(x => StatUtils.processStatResult(x.data))),
            mongo.AllStatMongoModel.findOne({
                isYear: true,
                period: year.toString()
            }).lean().toObservable().pipe(map((x: IAllStatDocument) => StatUtils.processStatResult(x.data))),
            mongo.MinStatMongoModel
                .find({
                    'timeStart':
                        {'$gt': new Date(Date.now() - SocketIoServer.LAST_DAY)}
                }).lean()
                .toObservable().pipe(map(x => StatUtils.getFlatAllStatistics(x))),
            mongo.MinStatMongoModel
                .find({
                    'timeStart':
                        {'$gt': new Date(Date.now() - SocketIoServer.LAST_HOUR)}
                }).lean()
                .toObservable().pipe(map(x => StatUtils.getFlatAllStatistics(x))),
            mongo.TenminStatMongoModel
                .find({})
                .sort({timeStart: -1})
                .limit(SocketIoServer.STAT_HOURS * 6)
                .lean().toObservable()
                .pipe(map(x => StatUtils.getFlatTenMinStatistics(x)))
        ).toPromise();
        request.emit(SocketIoRooms.StatsInit, statData);
    }


    private logsReceived(log: ILog): void {
        this.getAllSockets().forEach(connection => {
            if (connection.connectionType.indexOf(SocketIoConnectionTypes.Log) !== -1) {
                connection.emit(SocketIoRooms.Logging, log);
            }
        });
    }

    private validateInitializationMessage(initializationMessage: IInitializationMessage): boolean {
        if (initializationMessage.latLon === undefined ||
            initializationMessage.latLon.length !== 2 ||
            isNaN(initializationMessage.latLon[0]) ||
            isNaN(initializationMessage.latLon[0])) {
            return false;
        } else if (initializationMessage.dirs === undefined) {
            return false;
        }
        initializationMessage.dirs.forEach(x => {
            if (isNaN(x)) {
                return false;
            }
        });
        return true;
    }

    private getLocaleNames(strokes: Array<IStroke>, locale: string): Array<IStroke> {
        if (locale && !localeDatabase[locale]) {
            strokes.map(stroke => SocketIoServer.getLocaleName(stroke, locale));
        }
        return strokes;
    }

    private async onStrokesInitReceived(connection: StrokeSocket, message: any) {
        try {
            connection.connectionType.push(SocketIoConnectionTypes.Strokes);
            const initMessage = <IInitializationMessage>message;
            this.logger.sendNormalMessage(17, 24, 'Socket.IO server', `Strokes request: ${JSON.stringify(message)}`, false);

            if (this.validateInitializationMessage(initMessage)) {
                initMessage.lastRec = new Date();
                let canSendInitialData = true;
                let canSaveLocation = true;
                if (connection.userInfo !== undefined) {
                    if (initMessage.lastRec.getTime() - connection.userInfo.lastRec.getTime() < 500) {
                        canSaveLocation = false;
                    }
                    connection.userInfo.ad ? initMessage.ad = connection.userInfo.ad : initMessage.ad = Infinity;

                } else {
                    canSendInitialData = true;
                }
                if (initMessage.dtr === undefined) {
                    initMessage.dtr = -1;
                    initMessage.id = 0;
                }
                initMessage.cn = true;

                if (initMessage.id === undefined) {
                    initMessage.id = 0;
                }

                initMessage.acc = initMessage.acc === undefined ? 0 : Number(initMessage.acc);
                connection.userInfo = initMessage;

                if (canSendInitialData) {
                    const dataWithDistances: IStroke[] = <IStroke[]>await mongo.TtlTenMinStrokeMongoModel.aggregate([
                        {
                            '$geoNear': {
                                limit: SocketIoServer.MAXIMAL_DATA,
                                near: {type: "Point", coordinates: connection.userInfo.latLon},
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
                                    '$divide': ['$dist', 1000]
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
                            connection.emit(SocketIoRooms.Control, {distance: connection.userInfo.ad});
                        }


                        if (canSendInitialData) {
                            result.forEach(strokeDb => {
                                if (connection.userInfo.id < strokeDb._id &&
                                    (geoUtils.isInDirection(connection.userInfo.dirs,
                                            geoUtils.getBearing(connection.userInfo.latLon, strokeDb.latLon)) ||
                                        strokeDb.dist < 10
                                    ) &&
                                    ((strokeDb.dist < connection.userInfo.dtr) ||
                                        connection.userInfo.dtr === -1 || connection.userInfo.dtr === 0)) {
                                    const strokeArray = JsonUtils.flattenStroke(strokeDb);
                                    initArray.push(strokeArray);
                                }
                            });
                        }
                    }
                    connection.emit(SocketIoRooms.StrokesInit, JSON.stringify(initArray));
                }
                if (connection.userInfo.cn) {
                    const lastData: IDeviceUpdateRequestBody = {
                        latLon: connection.userInfo.latLon,
                        se: connection.userInfo.se,
                        dt: connection.userInfo.dt,
                        acc: connection.userInfo.acc
                    };
                    const hungarianData = await this.locationUpdater.getHungarianData(connection.userInfo.latLon);
                    if (connection.userInfo.se && canSaveLocation) {
                        this.locationUpdater.insertLastLocationSubject.next({
                            updater: LocationUpdateSource.SocketIO,
                            deviceData: lastData
                        });
                    }
                    await SocketIoServer.sendAlerts(connection, hungarianData);
                }
            } else {
                connection.disconnect(true);
            }
        } catch (exc) {
        }
    }

    private strokeReceived(stroke: IStroke): void {
        this.getAllSockets().forEach(connection => {
            if (connection.connectionType.indexOf(SocketIoConnectionTypes.Strokes) !== -1) {
                if (connection.userInfo !== undefined) {
                    const userInfo = connection.userInfo;
                    const clientGeoInformation: IGeoInformation = geoUtils.getDistanceAndBearing(userInfo.latLon, stroke.latLon);
                    // Szép nagy IF :))
                    if ((userInfo.dtr > clientGeoInformation.distance ||
                        userInfo.dtr === -1 ||
                        (userInfo.dtr === 0 &&
                            (userInfo.ad === undefined ||
                                clientGeoInformation.distance < userInfo.ad))) &&
                        (geoUtils.isInDirection(userInfo.dirs, clientGeoInformation.bearing) ||
                            clientGeoInformation.distance <= 10
                        )) {
                        const strokeLocalized = SocketIoServer.getLocaleName(stroke, connection.userInfo.lang);
                        const compressedStroke = JsonUtils.flattenStroke(strokeLocalized);
                        connection.emit(SocketIoRooms.Strokes, JSON.stringify(compressedStroke));
                    }
                }
            } else if (connection.connectionType.indexOf(SocketIoConnectionTypes.Stat) !== -1) {
                connection.emit(SocketIoRooms.Stats, JSON.stringify(JsonUtils.toAllStatJson(stroke)));
            }
        });
    }

    public invoke(): void {

    }

    private onClientDisconnected() {
        this.logger.sendNormalMessage(0, 94, 'Socket.IO server', `User disconnected`, false);
    }
}

export const socketIoServer: ISocketIoServer = new
SocketIoServer(loggerInstance, databaseSaverInstance, locationUpdaterInstance, 60, config.socketIOPort);
