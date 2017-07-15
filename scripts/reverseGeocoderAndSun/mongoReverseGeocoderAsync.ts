/**
 * Created by ehog on 2016. 11. 14..
 */

import * as mongo from "../mongo/mongoDbSchemas";
import * as crg from  "../reverseGeocoderAndSun/countryReverseGeocoderAsync";
import {Modules} from "../interfaces/modules";
import IReverseGeocoderAsync = Modules.IReverseGeoCoderAsync;
import {Entities} from "../interfaces/entities";
import IGeoAddress = Entities.IGeoAddress;
import {config} from "../config";

class MongoReverseGeocoderAsync implements IReverseGeocoderAsync {

    async getGeoInformation(latLonPair: number[]): Promise<IGeoAddress> {
        const locationData: IGeoAddress = {
            cc: "xx",
            regDef: null,
            sRegDef: null,
            smDef: null,
            suburbDef: null,
            strDef: null
        };
        const countryData = await crg.countryReverseGeocoderAsync.getCountryData(latLonPair);
        locationData.cc = countryData.cc;
        if (countryData.cc === "xx") {
            if (countryData.seaData) {
                locationData.regDef = countryData.seaData;
            }
            return Promise.resolve(locationData);
        }

        const result = await mongo.SettlementsModel.findOne({
            'geometry.coordinates': {
                '$near': {
                    '$geometry': {
                        type: "Point",
                        coordinates: latLonPair
                    },
                    '$maxDistance': config.geoCodingDistanceThreshold,
                    '$minDistance': 0
                }
            }});

        if (result != null) {
            locationData.smDef = result.properties.name;
            if (result.properties.other_tags != null) {
                let tags = this.processOtherTags(result.properties.other_tags);
                if (tags["name:en"] != undefined && tags["name:en"] !== result.properties.name) {
                    locationData.smDef = `${tags["name:en"]} (${result.properties.name})`;
                }

                if (tags["name:hu"]) {
                    locationData.sm_hun = tags["name:hu"];
                }

                if (tags["is_in:subregion"]) {
                    locationData.sRegDef = tags["is_in:subregion"];
                }
                else if (tags["gnis:County"]) {
                    locationData.sRegDef = tags["gnis:County"];
                }


                if (tags["is_in:state"]) {
                    locationData.regDef = tags["is_in:state"];
                }
                else if (tags["is_in:region"]) {
                    locationData.regDef = tags["is_in:region"];
                }
                else if (tags["is_in:county"]) {
                    locationData.regDef = tags["is_in:county"];
                }
                else if (tags["gnis:ST_alpha"]) {
                    locationData.regDef = tags["gnis:ST_alpha"];
                }
            }
        }
        return Promise.resolve(locationData);

    }

    private processOtherTags(tags: string) {
        try {
            const tagObject = {};
            const tagsSeparated: string[] = tags.split(",");
            tagsSeparated.forEach(tag => {
                const tagParts = tag.split("=>");
                tagObject[tagParts[0].substring(1, tagParts[0].length - 1)] = tagParts[1].substring(1, tagParts[1].length - 1);
            });
            return tagObject;
        } catch (exc) {
            return {};
        }
    }
}
export const mongoReverseGeocoderAsync: Modules.IReverseGeoCoderAsync = new MongoReverseGeocoderAsync();