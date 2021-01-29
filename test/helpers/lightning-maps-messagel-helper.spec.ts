import { processLightningmapsMessage } from '../../app/helpers/lightningmaps-message-helper';

describe('Lightningmaps Message helpers', () => {
  const message1NoDupes = {
    time: 1611943075,
    flags: { '2': 0 },
    strokes: [
      {
        time: 1611942924446,
        lat: 34.165546,
        lon: 45.620441,
        src: 2,
        srv: 2,
        id: 7991303,
        del: 1802,
        dev: 293,
      },
      {
        time: 1611942924886,
        lat: 34.279755,
        lon: 45.490129,
        src: 2,
        srv: 2,
        id: 7991304,
        del: 1807,
        dev: 2684,
      },
    ],
  };

  const message2Dupes = {
    time: 1611943075,
    flags: { '2': 0 },
    strokes: [
      {
        time: 1611942924886,
        lat: 34.279755,
        lon: 45.490129,
        src: 2,
        srv: 2,
        id: 7991304,
        del: 1807,
        dev: 2684,
      },
      {
        time: 1611942924886,
        lat: 34.279755,
        lon: 45.490129,
        src: 2,
        srv: 2,
        id: 7991304,
        del: 1807,
        dev: 2684,
      },
    ],
  };

  const message3DupesSameCoords = {
    time: 1611943075,
    flags: { '2': 0 },
    strokes: [
      {
        time: 1611942924886,
        lat: 34.279755,
        lon: 45.490129,
        src: 2,
        srv: 2,
        id: 7991304,
        del: 1807,
        dev: 2684,
      },
      {
        time: 1611942924446,
        lat: 34.279755,
        lon: 45.490129,
        src: 2,
        srv: 2,
        id: 7991303,
        del: 1802,
        dev: 293,
      },
    ],
  };

  const message4SameIds = {
    time: 1611943075,
    flags: { '2': 0 },
    strokes: [
      {
        time: 1611942924446,
        lat: 34.165546,
        lon: 45.620441,
        src: 2,
        srv: 2,
        id: 420,
        del: 1802,
        dev: 293,
      },
      {
        time: 1611942924886,
        lat: 34.279755,
        lon: 45.490129,
        src: 2,
        srv: 2,
        id: 420,
        del: 1807,
        dev: 2684,
      },
    ],
  };

  it('should map the strokes correctly if no dupes', () => {
    const results = processLightningmapsMessage({
      utf8Data: JSON.stringify(message1NoDupes),
    } as any);

    expect(results.dupes).toBeFalsy();
  });

  it('should check the dupes correctly (example 1)', () => {
    const results = processLightningmapsMessage({
      utf8Data: JSON.stringify(message2Dupes),
    } as any);

    expect(results.dupes).toBe(1);
  });

  it('should check the dupes correctly (example 2 - same-coords dupes)', () => {
    const results = processLightningmapsMessage({
      utf8Data: JSON.stringify(message3DupesSameCoords),
    } as any);

    expect(results.dupes).toBe(1);
  });

  it('should check the dupes correctly (example 3 - same-id dupes)', () => {
    const results = processLightningmapsMessage({
      utf8Data: JSON.stringify(message4SameIds),
    } as any);

    expect(results.dupes).toBe(1);
  });
});
