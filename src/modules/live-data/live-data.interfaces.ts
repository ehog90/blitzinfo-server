export interface ISocketInitialization {
  v: number;
  i: number;
  s: boolean;
  x: number;
  w: number;
  tx: number;
  tw: number;
  t: number;
  h: string;
  p: number[];
  l: number;
  b: boolean;
  z: number;
  a: number;
}

export interface ILightningMapsStroke {
  time: number;
  lat: number;
  lon: number;
  id: number;
  inv: number;
  del: number;
  sta: any;
}

export interface IIdAndDate {
  id: number;
  time: number;
}

export interface ILightningMapsStrokeBulk {
  time: number;
  id: number;
  max_id: number;
  type: number;
  strokes: Array<ILightningMapsStroke>;
}
