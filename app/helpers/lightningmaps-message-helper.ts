import { ILightningMapsStroke } from './../contracts/entities';
import {
  ILightningMapsProcessResult,
  ILightningMapsStrokeBulk,
} from 'app/contracts/entities';
import { uniqWith } from 'lodash';
import { IMessage } from 'websocket';

export function processLightningmapsMessage(
  messageRaw: IMessage,
): ILightningMapsProcessResult {
  const results: ILightningMapsProcessResult = {
    dupes: 0,
    malformed: 0,
    strokes: [],
  };
  const messageParsed: any = JSON.parse(messageRaw.utf8Data);
  if (messageParsed.strokes != null) {
    const messageBulk = messageParsed as ILightningMapsStrokeBulk;
    const originalStrokes = messageBulk.strokes;
    messageBulk.strokes = uniqWith(
      messageBulk.strokes,
      (a, b) => (a.lat === b.lat && a.lon === b.lon) || a.id === b.id,
    );
    if (originalStrokes.length !== messageBulk.strokes.length) {
      results.dupes = originalStrokes.length - messageBulk.strokes.length;
    }
    messageBulk.strokes.forEach((stroke) => {
      if (!isStrokeCorrect(stroke)) {
        results.malformed += 1;
      } else {
        results.strokes.push(stroke);
      }
    });
  }
  return results;
}

export function isStrokeCorrect(stroke: ILightningMapsStroke): boolean {
  return (
    stroke.lat !== undefined &&
    stroke.lon !== undefined &&
    stroke.id !== undefined &&
    !isNaN(stroke.lat) &&
    !isNaN(stroke.lon) &&
    !isNaN(stroke.id) &&
    stroke.lat <= 90 &&
    stroke.lat >= -90 &&
    stroke.lon <= 180 &&
    stroke.lon >= -180
  );
}
