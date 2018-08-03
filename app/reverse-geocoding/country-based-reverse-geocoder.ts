import * as fs from "fs";
import {ICountryReverseGeoCodeResult} from "../contracts/entities";
import {ICountryReverseGeoCoderAsync} from "../contracts/service-interfaces";

const wherewolf = require("wherewolf");

class CountryBasedReverseGeocoder implements ICountryReverseGeoCoderAsync {
    private whereWolfInstance: any;

    constructor() {
        const countryDataTopoJson = JSON.parse(fs.readFileSync('./static-json-data/countryData.json', 'utf8'));
        const seaDataGeoJson = JSON.parse(fs.readFileSync('./static-json-data/seaData.json', 'utf8'));
        this.whereWolfInstance = wherewolf();
        this.whereWolfInstance.add('cc', countryDataTopoJson);
        this.whereWolfInstance.add('sea', seaDataGeoJson);
    }

    public getCountryData(latLonPair: number[]): Promise<ICountryReverseGeoCodeResult> {
        const result = {cc: "xx", seaData: null};
        const geoResult = this.whereWolfInstance.find({lat: latLonPair[1], lng: latLonPair[0]}, {wholeFeature: true});
        if (geoResult.cc) {
            result.cc = geoResult.cc.properties.tags['ISO3166-1'].toLowerCase();
        } else if (!geoResult.cc && geoResult.sea != null) {
            result.seaData = geoResult.sea.properties.name;
        }
        return Promise.resolve(result);
    }
}

export const countryReverseGeocoderAsync: ICountryReverseGeoCoderAsync = new CountryBasedReverseGeocoder();
