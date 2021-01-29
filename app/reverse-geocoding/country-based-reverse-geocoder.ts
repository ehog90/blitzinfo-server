import { readFileSync } from 'fs';

import { ICountryReverseGeoCodeResult } from '../contracts/entities';
import { ICountryReverseGeoCoderAsync } from '../contracts/service-interfaces';

const wherewolf = require('wherewolf');

export class CountryBasedReverseGeocoder
  implements ICountryReverseGeoCoderAsync {
  // #region Properties (1)

  private whereWolfInstance: any;

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor() {
    const countryDataTopoJson = JSON.parse(
      readFileSync('./static-json-data/countryData.json', 'utf8'),
    );
    const seaDataGeoJson = JSON.parse(
      readFileSync('./static-json-data/seaData.json', 'utf8'),
    );
    this.whereWolfInstance = wherewolf();
    this.whereWolfInstance.add('cc', countryDataTopoJson);
    this.whereWolfInstance.add('sea', seaDataGeoJson);
  }

  // #endregion Constructors (1)

  // #region Public Methods (1)

  public getCountryData(
    latLonPair: number[],
  ): Promise<ICountryReverseGeoCodeResult> {
    const result = { cc: 'xx', seaData: null };
    const geoResult = this.whereWolfInstance.find(
      { lat: latLonPair[1], lng: latLonPair[0] },
      { wholeFeature: true },
    );
    if (geoResult.cc) {
      result.cc = geoResult.cc.properties.tags['ISO3166-1'].toLowerCase();
    } else if (!geoResult.cc && geoResult.sea != null) {
      result.seaData = geoResult.sea.properties.name;
    }
    return Promise.resolve(result);
  }

  // #endregion Public Methods (1)
}

export const countryReverseGeocoderAsync: ICountryReverseGeoCoderAsync = new CountryBasedReverseGeocoder();
