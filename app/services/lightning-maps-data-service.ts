import { processLightningmapsMessage } from '../helpers/lightningmaps-message-helper';
import {
  interval,
  Observable,
  Subject,
  Subscription,
  TimeInterval,
  timer,
} from 'rxjs';
import { buffer, timeInterval } from 'rxjs/operators';
import { client, connection, IMessage } from 'websocket';

import { config, initObject } from '../config';
import {
  IIdAndDate,
  ILightningMapsStroke,
  ISocketInitialization,
} from '../contracts/entities';
import {
  ILightningMapsWebSocket,
  ILogger,
} from '../contracts/service-interfaces';
import { loggerInstance } from './logger-service';

export class LightningMapsDataService implements ILightningMapsWebSocket {
  // #region Properties (15)

  private blitzortungConnection: connection;
  private blitzortungWebSocket: client;
  private duplicatedData: Subject<ILightningMapsStroke>;
  private processedStrokes: Array<IIdAndDate>;
  private reconnectSubscription: Subscription;
  private reconnectTimer: Observable<TimeInterval<number>>;
  private timeoutCheckerTimer: Observable<TimeInterval<number>>;
  private timerSubscription: Subscription;
  private url: string;

  public initializationObject: ISocketInitialization;
  public lastReceived: Subject<ILightningMapsStroke>;
  public lastStroke: ILightningMapsStroke;
  public lastTimeWhenReceived: number;
  public strokeEventChannel: Subject<any>;
  public timeoutInSec: number;

  // #endregion Properties (15)

  // #region Constructors (1)

  constructor(private logger: ILogger, timeoutInSec: number, url: string) {
    this.initializationObject = initObject;
    this.initializationObject.t = Math.ceil(new Date().getTime() / 1000);
    this.url = url;
    this.timeoutInSec = timeoutInSec;
    this.lastTimeWhenReceived = new Date().getTime();
    this.strokeEventChannel = new Subject<any>();
    this.lastReceived = new Subject<ILightningMapsStroke>();
    this.duplicatedData = new Subject<ILightningMapsStroke>();

    this.timeoutCheckerTimer = timer(
      this.timeoutInSec * 1000,
      this.timeoutInSec * 1000,
    ).pipe(timeInterval());
    this.reconnectTimer = timer(46800000, 46800000).pipe(timeInterval());
    this.timerSubscription = this.timeoutCheckerTimer.subscribe((x) =>
      this.timeoutTimerSubscription(),
    );
    this.reconnectSubscription = this.reconnectTimer.subscribe((x) =>
      this.reconnectTimerSubscription(),
    );
    this.duplicatedData.pipe(buffer(interval(1000))).subscribe((strokes) => {
      if (strokes.length > 0) {
        this.logger.sendErrorMessage(
          197,
          0,
          'LightningMaps Socket',
          `Duplicated strokes within 10 secs: ${strokes.length}`,
          true,
        );
      }
    });
  }
  isStrokeCorrect(stroke: ILightningMapsStroke): boolean {
    throw new Error('Method not implemented.');
  }

  // #endregion Constructors (1)

  // #region Public Methods (2)

  public start(): void {
    this.logger.sendWarningMessage(
      0,
      0,
      'Lightning Maps Websocket',
      'Initializadtion message: ' + JSON.stringify(this.initializationObject),
      false,
    );
    this.initializeWebSocket();
    this.blitzortungWebSocket.connect(this.url);
  }

  // #endregion Public Methods (2)

  // #region Private Methods (4)

  private initializeWebSocket(): void {
    this.timerSubscription?.unsubscribe();
    this.reconnectSubscription?.unsubscribe();
    if (this.blitzortungConnection) {
      try {
        this.blitzortungConnection.close();
        this.logger.sendNormalMessage(
          0,
          0,
          'LightningMaps Socket',
          `Socket closure`,
          false,
        );
      } catch (exc) {
        this.logger.sendErrorMessage(
          0,
          0,
          'LightningMaps Socket',
          `Socket closure error: ${exc}`,
          false,
        );
      }
    }
    this.processedStrokes = [];
    this.blitzortungWebSocket = new client();
    this.blitzortungWebSocket.on('connect', (connection: connection) => {
      this.blitzortungConnection = connection;
      connection.on('error', (error: Error) => {
        this.logger.sendErrorMessage(
          0,
          0,
          'LightningMaps Socket',
          `Error on connection: ${error}`,
          false,
        );
      });
      connection.on('close', (reason: number) => {
        this.logger.sendErrorMessage(
          0,
          0,
          'LightningMaps Socket',
          `Client closed: ${reason}`,
          false,
        );
      });
      connection.on('message', (messageRaw: IMessage) => {
        try {
          const { strokes, dupes, malformed } = processLightningmapsMessage(
            messageRaw,
          );
          if (dupes) {
            this.logger.sendWarningMessage(
              0,
              0,
              'LightningMaps Socket',
              `Maybe duplicated strokes: ${dupes}`,
              true,
            );
          }

          if (malformed) {
            this.logger.sendWarningMessage(
              0,
              0,
              'LightningMaps Socket',
              `Malformed strokes: ${malformed}`,
              true,
            );
          }

          for (const stroke of strokes) {
            if (this.isStrokeAlreadyProcessed(stroke)) {
              this.duplicatedData.next(stroke);
            } else {
              this.processedStrokes.unshift({
                id: stroke.id,
                time: stroke.time,
              });
              this.lastReceived.next(stroke);
              this.lastStroke = stroke;
              this.lastTimeWhenReceived = new Date().getTime();
            }
          }
        } catch (exc) {
          this.logger.sendErrorMessage(
            0,
            0,
            'LightningMaps Socket',
            `Message error: ${exc}`,
            true,
          );
        }
      });
      try {
        this.blitzortungConnection.sendUTF(
          JSON.stringify(this.initializationObject),
        );
        this.strokeEventChannel.next(0);
      } catch (exc) {
        this.logger.sendErrorMessage(
          0,
          0,
          'LightningMaps Socket',
          `Initialization message error: ${exc}`,
          false,
        );
      }
    });
  }

  private isStrokeAlreadyProcessed(stroke: ILightningMapsStroke): boolean {
    for (const x of this.processedStrokes) {
      if (stroke.id === x.id) {
        return true;
      }
    }
    return false;
  }

  private reconnectTimerSubscription() {
    this.initializeWebSocket();
    this.logger.sendNormalMessage(
      0,
      0,
      'LightningMaps Socket',
      `Socket reopened.`,
      false,
    );
  }

  private timeoutTimerSubscription() {
    const timeSinceLast =
      (new Date().getTime() - this.lastTimeWhenReceived) / 1000;
    this.processedStrokes = this.processedStrokes.filter(
      (x) => x.time >= new Date().getTime() - 60000,
    );

    if (timeSinceLast > this.timeoutInSec) {
      try {
        this.blitzortungConnection.close();
        this.logger.sendNormalMessage(
          165,
          11,
          'Lightning Maps Websocket',
          'Websocket disconnected.',
          false,
        );
      } catch (exc) {
      } finally {
        this.strokeEventChannel.next(0);
        this.logger.sendWarningMessage(
          165,
          11,
          'Lightning Maps Websocket',
          'Websocket reconnection attempt.',
          false,
        );
        this.initializeWebSocket();
        this.blitzortungWebSocket.connect(this.url);
      }
    }
  }

  // #endregion Private Methods (4)
}

export const lightningMapsDataService: ILightningMapsWebSocket = new LightningMapsDataService(
  loggerInstance,
  60,
  config.lightningMapsUrl,
);
