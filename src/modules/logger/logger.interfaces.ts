export enum LogType {
  Normal = 'NORMAL',
  Warning = 'WARNING',
  Error = 'ERROR',
}
export interface ILog {
  time: Date;
  canBeHidden: boolean;
  isError: boolean;
  colors: {
    bg: number;
    fg: number;
  };
  messageParts: {
    msgType: LogType;
    tag: string;
    msg: string;
  };
}
