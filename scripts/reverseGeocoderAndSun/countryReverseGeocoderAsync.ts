import * as fs from "fs";
import {Modules} from "../interfaces/modules";
import {Entities} from "../interfaces/entities";
import ICountryReverseGeoCodeResult = Entities.ICountryReverseGeoCodeResult;
import Observable = Rx.Observable;
import ICountryReverseGeoCoderAsync = Modules.ICountryReverseGeoCoderAsync;
const wherewolf = require("wherewolf");

/*
 Országszintű reverse geocoding osztály. Egy latlon értékhez határozza meg a területkódot.
 */
class CountryReverseGeocoderAsync implements ICountryReverseGeoCoderAsync {
    private whereWolfInstance: any;

    constructor() {
        const countryDataTopoJson = JSON.parse(fs.readFileSync('./JSON/countryData.json', 'utf8'));
        const seaDataGeoJson = JSON.parse(fs.readFileSync('./JSON/seaData.json', 'utf8'));
        this.whereWolfInstance = wherewolf();
        this.whereWolfInstance.add('cc', countryDataTopoJson);
        this.whereWolfInstance.add('sea', seaDataGeoJson);
    }

    getCountryData(latLonPair: number[]): Promise<ICountryReverseGeoCodeResult> {
        const result = {cc: "xx", seaData: null};
        const geoResult = this.whereWolfInstance.find({lat: latLonPair[1], lng: latLonPair[0]}, {wholeFeature: true});
        if (geoResult.cc) {
            result.cc = geoResult.cc.properties.tags['ISO3166-1'].toLowerCase();
        }
        else if (!geoResult.cc && geoResult.sea != null) {
            result.seaData = geoResult.sea.properties.name;
        }
        return Promise.resolve(result)
    }
}

export const countryReverseGeocoderAsync: ICountryReverseGeoCoderAsync = new CountryReverseGeocoderAsync();
