import * as clicolor from 'cli-color';
import * as fs from 'fs';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { ILog, LogType } from '../contracts/entities';
import { ILogger } from '../contracts/service-interfaces';
import * as mongo from '../database/mongoose-schemes';

class LoggerService implements ILogger {
   private xtermData: any;
   public logs: Subject<ILog> = new Subject<ILog>();
   constructor(private canHideSome: boolean) {
      this.xtermData = JSON.parse(fs.readFileSync('./static-json-data/xtermData.json', 'utf8'));
   }
   private toConsoleMessage(message: ILog) {
      if (!message.canBeHidden || !this.canHideSome) {
         const msg = clicolor.xterm(message.colors.fg).bgXterm(message.colors.bg);
         if (message.messageParts.msgType === LogType.Normal) {
            console.log(
               msg(
                  `LOG [${moment(message.time).format('MM.DD HH:mm:ss:SSS')}] [${
                     message.messageParts.tag
                  }] [${message.messageParts.msg.toString()}]`
               )
            );
         } else if (message.messageParts.msgType === LogType.Warning) {
            console.warn(
               msg(
                  `WARN [${moment(message.time).format('MM.DD HH:mm:ss:SSS')}] [${
                     message.messageParts.tag
                  }] [${message.messageParts.msg.toString()}]`
               )
            );
         } else if (message.messageParts.msgType === LogType.Error) {
            console.error(
               msg(
                  `ERROR [${moment(message.time).format('MM.DD HH:mm:ss:SSS')}}] [${
                     message.messageParts.tag
                  }] [${message.messageParts.msg.toString()}]`
               )
            );
         }
      }
   }

   private async save(message: ILog) {
      const logsSave = new mongo.LogsMongoModel(message);
      const logSaved = await logsSave.save();
      this.logs.next(logSaved);
   }
   public sendNormalMessage(
      bgColor: number,
      fgColor: number,
      tag: string,
      message: string,
      canBeHidden: boolean
   ): void {
      if (fgColor === 0) {
         fgColor = 15;
      }

      const msg: ILog = {
         time: new Date(),
         canBeHidden,
         isError: false,
         colors: {
            bg: bgColor,
            fg: fgColor,
         },
         messageParts: {
            msgType: LogType.Normal,
            tag,
            msg: message,
         },
      };
      this.toConsoleMessage(msg);
      this.save(msg);
   }
   public sendWarningMessage(
      bgColor: number,
      fgColor: number,
      tag: string,
      message: string,
      canBeHidden: boolean
   ): void {
      if (fgColor === 0) {
         fgColor = 233;
      }
      if (bgColor === 0) {
         bgColor = 166;
      }
      const msg: ILog = {
         time: new Date(),
         isError: false,
         canBeHidden,
         colors: {
            bg: bgColor,
            fg: fgColor,
         },
         messageParts: {
            msgType: LogType.Warning,
            tag,
            msg: message,
         },
      };
      this.toConsoleMessage(msg);
      this.save(msg);
   }
   public sendErrorMessage(
      bgColor: number,
      fgColor: number,
      tag: string,
      message: string,
      canBeHidden: boolean
   ) {
      if (fgColor === 0) {
         fgColor = 15;
      }
      if (bgColor === 0) {
         bgColor = 9;
      }
      const msg: ILog = {
         time: new Date(),
         isError: true,
         canBeHidden,
         colors: {
            bg: bgColor,
            fg: fgColor,
         },
         messageParts: {
            msgType: LogType.Error,
            tag,
            msg: message,
         },
      };
      this.toConsoleMessage(msg);
      this.save(msg);
   }
}

export const loggerInstance: ILogger = new LoggerService(false);
