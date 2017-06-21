/**
 * Created by ehog on 2016. 11. 21..
 */
import {getJson, getJsonAsync} from "../utils/httpQueries";
import {Entities} from "../interfaces/entities";
import IGeoAddress = Entities.IGeoAddress;
import {Modules} from "../interfaces/modules";
import IReverseGeocoderAsync = Modules.IReverseGeoCoderAsync;
import {googleMapsApiKey} from "../restricted/restricted";

class GoogleReverseGeocoder implements IReverseGeocoderAsync {
    public async getGeoInformation(latLonPair: number[]): Promise<IGeoAddress> {
        try {
            const reverseGeocodedDataResponse: any = await getJsonAsync(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latLonPair[1]},${latLonPair[0]}&key=${googleMapsApiKey}&language=en`, 5000);
            const reverseGeocodedData = reverseGeocodedDataResponse.result;
            const locationData: IGeoAddress = {
                cc: null,
                regDef: null,
                sRegDef: null,
                smDef: null,
                suburbDef: null,
                strDef: null
            };

            //TODO: Recactor with TS monad.
            if (reverseGeocodedData.results.length > 0) {
                let streetNumber: string;
                reverseGeocodedData.results.forEach(result => {
                    result.address_components.forEach(resultElem => {
                        if (resultElem.types.indexOf("route") !== -1 && locationData.strDef == null) {
                            locationData.strDef = resultElem.long_name;
                        }
                        else if (resultElem.types.indexOf("locality") !== -1 && locationData.smDef == null) {
                            locationData.smDef = resultElem.long_name;
                        }
                        else if (resultElem.types.indexOf("country") !== -1 && locationData.cc == null) {
                            locationData.cc = resultElem.short_name.toLowerCase();
                        }
                        else if (resultElem.types.indexOf("administrative_area_level_1") !== -1 && locationData.regDef == null) {
                            locationData.regDef = resultElem.long_name;
                        }
                        else if (resultElem.types.indexOf("administrative_area_level_2") !== -1 && locationData.sRegDef == null) {
                            locationData.sRegDef = resultElem.long_name;
                        }
                        else if (resultElem.types.indexOf("neighborhood") !== -1 && locationData.suburbDef == null) {
                            locationData.suburbDef = resultElem.long_name;
                        }
                        else if (resultElem.types.indexOf("street_number") !== -1 && streetNumber == null) {
                            streetNumber = resultElem.long_name;
                        }
                    });

                });
                if (streetNumber  && locationData.strDef) {
                    locationData.strDef = `${streetNumber} ${locationData.strDef}`;
                }

                return Promise.resolve(locationData);

            } else {
                return Promise.resolve(locationData);
            }
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
}

export const googleReverseGeoCoder = new GoogleReverseGeocoder();