import * as Rx from "rx";
import * as websocket from "websocket";
import {logger} from "../logger/logger";
import {config, initObject} from "../config";
import * as _ from "lodash";
import {Modules} from "../interfaces/modules";
import {Entities} from "../interfaces/entities";
import ILightningMapsWebSocket = Modules.ILightningMapsWebSocket;
import ILightningMapsStroke = Entities.ILightningMapsStroke;
import Subject = Rx.Subject;
import IIdAndDate = Entities.IIdAndDate;
import Observable = Rx.Observable;
import TimeInterval = Rx.TimeInterval;
import IDisposable = Rx.IDisposable;
import ILogger = Modules.ILogger;
import ILightningMapsStrokeBulk = Entities.ILightningMapsStrokeBulk;
import ISocketInitialization = Entities.ISocketInitialization;
/*
 A LightningMaps-kapcsolatért felelős osztály. a villámok aszinkron módon érkeznek a távoli szerverről, és továbbítja azt az adatbázisba mentésért felelős osztálynak.
 */

class LightningMapsWebSocket implements ILightningMapsWebSocket {
    public initializationObject: ISocketInitialization;
    private blitzortungWebSocket: websocket.client;
    private blitzortungConnection: websocket.connection;
    public timeoutInSec: number;
    public lastStroke: ILightningMapsStroke;
    public lastTimeWhenReceived: number;
    public lastReceived: Subject<ILightningMapsStroke>;
    public strokeEventChannel: Subject<any>;
    private processedStrokes: Array<IIdAndDate>;
    private timeoutCheckerTimer: Observable<TimeInterval<number>>;
    private reconnectTimer: Observable<TimeInterval<number>>;
    private duplicateDatas: Subject<ILightningMapsStroke>;
    private timerSubscription: IDisposable;
    private reconnectSubscription: IDisposable;
    private url: string;

    constructor(private logger: ILogger, timeoutInSec: number, url: string) {
        this.initializationObject = initObject;
        this.initializationObject.t = Math.ceil(new Date().getTime() / 1000);
        this.url = url;
        this.timeoutInSec = timeoutInSec;
        this.lastTimeWhenReceived = new Date().getTime();
        this.strokeEventChannel = new Subject<any>();
        this.lastReceived = new Subject<ILightningMapsStroke>();
        this.duplicateDatas = new Subject<ILightningMapsStroke>();

        this.timeoutCheckerTimer = Observable.timer(this.timeoutInSec * 1000, this.timeoutInSec * 1000)
            .timeInterval();
        this.reconnectTimer = Observable.timer(46800000, 46800000)
            .timeInterval();
        this.timerSubscription = this.timeoutCheckerTimer.subscribe(x => this.timeoutTimerSubscription());
        this.reconnectSubscription = this.reconnectTimer.subscribe(x => this.reconnectTimerSubscription());
        this.duplicateDatas
            .buffer(Observable.interval(10000))
            .subscribe(strokes => {
                if (strokes.length > 0) {
                    this.logger.sendErrorMessage(197,
                        0,
                        "LightningMaps Socket",
                        `Duplicated strokes within 10 secs: ${strokes.length}`,
                        true);
                }

            });
    }

    private reconnectTimerSubscription() {
        this.initializeWebSocket();
        this.logger.sendNormalMessage(0, 0, "LightningMaps Socket", `Socket reopened.`, false);
    }


    private timeoutTimerSubscription() {
        const timeSinceLast = (new Date().getTime() - this.lastTimeWhenReceived) / 1000;
        this.processedStrokes = this.processedStrokes.filter(x => x.time >= (new Date().getTime()) - 60000);

        if (timeSinceLast > this.timeoutInSec) {
            try {
                this.blitzortungConnection.close();
                this.logger.sendNormalMessage(165, 11, 'Lightning Maps Websocket', 'Websocket disconnected.', false);
            } catch (exc) {
            } finally {
                this.strokeEventChannel.onNext(0);
                this.logger.sendWarningMessage(165,
                    11,
                    'Lightning Maps Websocket',
                    'Websocket reconnection attempt.',
                    false);
                this.initializeWebSocket();
                this.blitzortungWebSocket.connect(this.url);
            }
        }
    }

    public start(): void {
        this.logger.sendWarningMessage(0,
            0,
            'Lightning Maps Websocket',
            'Initializadtion message: ' + JSON.stringify(this.initializationObject),
            false);
        this.initializeWebSocket();
        this.blitzortungWebSocket.connect(this.url);
    }

    public isStrokeCorrect(stroke: ILightningMapsStroke): boolean {
        return stroke.lat != undefined &&
            stroke.lon != undefined &&
            stroke.id != undefined && !isNaN(stroke.lat) && !isNaN(stroke.lon) && !isNaN(stroke.id) &&
            stroke.lat <= 90 &&
            stroke.lat >= -90 &&
            stroke.lon <= 180 &&
            stroke.lon >= -180;

    }

    private isStrokeAlreadyProcessed(stroke: ILightningMapsStroke): boolean {
        for (let x of this.processedStrokes) {
            if (stroke.id == x.id) {
                return true;
            }
        }
        return false;
    }

    private initializeWebSocket(): void {
        if (this.blitzortungConnection) {
            try {
                this.blitzortungConnection.close();
                this.logger.sendNormalMessage(0, 0, "LightningMaps Socket", `Socket closure`, false);
            } catch (exc) {
                this.logger.sendErrorMessage(0, 0, "LightningMaps Socket", `Socket closure error: ${exc}`, false);
            }

        }
        this.processedStrokes = [];
        this.blitzortungWebSocket = new websocket.client;
        this.blitzortungWebSocket.on('connect',
            (connection: websocket.connection) => {
                this.blitzortungConnection = connection;
                connection.on('error',
                    (error: Error) => {
                        this.logger.sendErrorMessage(0,
                            0,
                            "LightningMaps Socket",
                            `Error on connection: ${error}`,
                            false);
                    });
                connection.on('close',
                    (reason: number) => {
                        this.logger.sendErrorMessage(0, 0, "LightningMaps Socket", `Client closed: ${reason}`, false);
                    });
                connection.on('message',
                    (messageRaw: websocket.IMessage) => {
                        try {
                            const messageParsed: any = JSON.parse(messageRaw.utf8Data);
                            if (messageParsed.strokes != null) {
                                const messageBulk = <ILightningMapsStrokeBulk>messageParsed;
                                const originalStrokes = messageBulk.strokes;
                                messageBulk.strokes = _.uniqBy(messageBulk.strokes, item => item.id);
                                if (originalStrokes.length !== messageBulk.strokes.length) {
                                    this.logger
                                        .sendWarningMessage(0,
                                            0,
                                            "LightningMaps Socket",
                                            `Maybe duplicated strokes: ${
                                            originalStrokes.length - messageBulk.strokes.length}`,
                                            true);
                                }
                                messageBulk.strokes.forEach(x => {
                                    if (!this.isStrokeCorrect(x)) {
                                        this.logger
                                            .sendErrorMessage(0,
                                                0,
                                                "LightningMaps Socket",
                                                `Malformed stroke: [ID=${x.id}, lat=${x.lat}, lon=${x.lon}]`,
                                                true);
                                    } else if (this.isStrokeAlreadyProcessed(x)) {
                                        this.duplicateDatas.onNext(x);
                                    } else {
                                        this.processedStrokes.unshift({id: x.id, time: x.time});
                                        this.lastReceived.onNext(x);
                                        this.lastStroke = x;
                                        this.lastTimeWhenReceived = new Date().getTime();
                                    }

                                });

                            } else {

                            }
                        } catch (exc) {
                            this.logger.sendErrorMessage(0, 0, "LightningMaps Socket", `Message error: ${exc}`, true);
                        }


                    });
                try {
                    this.blitzortungConnection.sendUTF(JSON.stringify(this.initializationObject));
                    this.strokeEventChannel.onNext(0);
                } catch (exc) {
                    this.logger.sendErrorMessage(0,
                        0,
                        "LightningMaps Socket",
                        `Initialization message error: ${exc}`,
                        false);
                }

            });
    }
}
export const lightningMapsWebSocket: ILightningMapsWebSocket = new
LightningMapsWebSocket(logger, 60, config.lightningMapsUrl);