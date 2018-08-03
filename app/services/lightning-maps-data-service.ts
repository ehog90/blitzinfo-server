import {loggerInstance} from "./logger-service";

import {uniqWith} from "lodash";
import {interval, timer, Observable, Subject, Subscription, TimeInterval} from "rxjs";
import {buffer, timeInterval} from "rxjs/operators";
import * as websocket from "websocket";
import {config, initObject} from "../config";
import {
    IIdAndDate,
    ILightningMapsStroke,
    ILightningMapsStrokeBulk,
    ISocketInitialization
} from "../contracts/entities";
import {ILightningMapsWebSocket, ILogger} from "../contracts/service-interfaces";

class LightningMapsDataService implements ILightningMapsWebSocket {
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
    private duplicatedData: Subject<ILightningMapsStroke>;
    private timerSubscription: Subscription;
    private reconnectSubscription: Subscription;
    private url: string;

    constructor(private logger: ILogger, timeoutInSec: number, url: string) {
        this.initializationObject = initObject;
        this.initializationObject.t = Math.ceil(new Date().getTime() / 1000);
        this.url = url;
        this.timeoutInSec = timeoutInSec;
        this.lastTimeWhenReceived = new Date().getTime();
        this.strokeEventChannel = new Subject<any>();
        this.lastReceived = new Subject<ILightningMapsStroke>();
        this.duplicatedData = new Subject<ILightningMapsStroke>();

        this.timeoutCheckerTimer = timer(this.timeoutInSec * 1000, this.timeoutInSec * 1000).pipe(
            timeInterval());
        this.reconnectTimer = timer(46800000, 46800000)
            .pipe(
                timeInterval());
        this.timerSubscription = this.timeoutCheckerTimer.subscribe(x => this.timeoutTimerSubscription());
        this.reconnectSubscription = this.reconnectTimer.subscribe(x => this.reconnectTimerSubscription());
        this.duplicatedData
            .pipe(
                buffer(interval(1000))
            ).subscribe(strokes => {
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
                this.strokeEventChannel.next(0);
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
        return stroke.lat !== undefined &&
            stroke.lon !== undefined &&
            stroke.id !== undefined && !isNaN(stroke.lat) && !isNaN(stroke.lon) && !isNaN(stroke.id) &&
            stroke.lat <= 90 &&
            stroke.lat >= -90 &&
            stroke.lon <= 180 &&
            stroke.lon >= -180;

    }

    private isStrokeAlreadyProcessed(stroke: ILightningMapsStroke): boolean {
        for (const x of this.processedStrokes) {
            if (stroke.id === x.id) {
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
                                messageBulk.strokes = uniqWith(messageBulk.strokes,
                                    (a, b) => (a.lat === b.lat && a.lon === b.lon) || a.id === b.id);
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
                                        this.duplicatedData.next(x);
                                    } else {
                                        this.processedStrokes.unshift({id: x.id, time: x.time});
                                        this.lastReceived.next(x);
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
                    this.strokeEventChannel.next(0);
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

export const lightningMapsDataService: ILightningMapsWebSocket = new
LightningMapsDataService(loggerInstance, 60, config.lightningMapsUrl);
