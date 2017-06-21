import * as fs from 'fs';
import * as clicolor from 'cli-color';
import * as Rx from 'rx';
import * as mongo from "../mongo/mongoDbSchemas";
import * as moment from 'moment'
import {Modules} from "../interfaces/modules";
import ILogger = Modules.ILogger;
import Subject = Rx.Subject;
import {Entities} from "../interfaces/entities";
import ILog = Entities.ILog;
import ILogDocument = Entities.ILogDocument;

/*
A rendszer eseményeinek kiírásáért, naplzásáért felelős osztály. A figyelmeztetések publikus metódusokon keresztül érkeznek be, amiket elment az adatbázisba,
illetve továbbít a Socket.IO kapcsolatokért felelős osztálynak is, hogy az esetleges kliensek fogadhassák azt.
*/

class Logger implements ILogger {
    private xtermData: any;
    public logs: Subject<ILog> = new Subject<ILog>();
    constructor(
        private canHideSome: boolean) {
        this.xtermData = JSON.parse(fs.readFileSync('./JSON/xtermData.json', 'utf8'));
    }
    private toConsoleMessage(message: ILog) {
        if (!message.canBeHidden || !this.canHideSome) {
            const msg = clicolor.xterm(message.colors.fg).bgXterm(message.colors.bg);
            if (message.messageParts.msgType === "NORMAL") {
                console.log(msg(`LOG [${moment(message.time).format("MM.DD HH:mm:ss:SSS")}] [${message.messageParts.tag}] [${message.messageParts.msg.toString() }]`));
            } else if (message.messageParts.msgType === "WARNING") {
                console.warn(msg(`WARN [${moment(message.time).format("MM.DD HH:mm:ss:SSS")}] [${message.messageParts.tag}] [${message.messageParts.msg.toString() }]`));
            } else if (message.messageParts.msgType === "ERROR") {
                console.error(msg(`ERROR [${moment(message.time).format("MM.DD HH:mm:ss:SSS")}}] [${message.messageParts.tag}] [${message.messageParts.msg.toString() }]`));
            }
        }
    }

    private async save(message: ILog): void {
        const logsSave = new mongo.LogsMongoModel(message);
        const logSaved = await logsSave.save();
        this.logs.onNext(logSaved);
    }
    public sendNormalMessage(bgColor: number, fgColor: number, tag: string, message: string, canBeHidden: boolean): void {
        if (fgColor === 0) {
            fgColor = 15;
        }

        const msg: ILog = {
            time: new Date(),
            canBeHidden: canBeHidden,
            isError: false,
            colors: {
                bg: bgColor,
                fg: fgColor
            },
            messageParts:
            {
                msgType: "NORMAL",
                tag: tag,
                msg: message
            }
        };
        this.toConsoleMessage(msg);
        this.save(msg);
    }
    public sendWarningMessage(bgColor: number, fgColor: number, tag: string, message: string, canBeHidden: boolean): void {
        if (fgColor === 0) {
            fgColor = 233;
        }
        if (bgColor === 0) {
            bgColor = 166;
        }
        const msg: ILog = {
            time: new Date(),
            isError: false,
            canBeHidden: canBeHidden,
            colors: {
                bg: bgColor,
                fg: fgColor
            },
            messageParts:
            {
                msgType: "WARNING",
                tag: tag,
                msg: message
            }
        };
        this.toConsoleMessage(msg);
        this.save(msg);

    }
    public sendErrorMessage(bgColor: number, fgColor: number, tag: string, message: string, canBeHidden: boolean) {
        if (fgColor === 0) {
            fgColor = 15;
        }
        if (bgColor === 0) {
            bgColor = 9;
        }
        const msg: ILog = {
            time: new Date(),
            isError: true,
            canBeHidden: canBeHidden,
            colors: {
                bg: bgColor,
                fg: fgColor
            },
            messageParts:
            {
                msgType: "ERROR",
                tag: tag,
                msg: message
            }
        };
        this.toConsoleMessage(msg);
        this.save(msg);
    }
}

export const logger: Modules.ILogger = new Logger(false);
