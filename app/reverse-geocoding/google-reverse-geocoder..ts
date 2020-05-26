/**
 * Created by ehog on 2016. 11. 21..
 */
import { IGeoAddress, IGoogleGeocodingResponse } from '../contracts/entities';
import { IReverseGeoCoderAsync } from '../contracts/service-interfaces';
import { getHttpRequestAsync } from '../helpers';
import { googleMapsApiKey } from '../sensitive-data/api-key.sensitive';

class GoogleReverseGeocoder implements IReverseGeoCoderAsync {
   public async getGeoInformation(latLonPair: number[]): Promise<IGeoAddress> {
      try {
         const url = `https://maps.googleapis.com/maps/api/geocode/json?
            latlng=${latLonPair[1]},${latLonPair[0]}&key=${googleMapsApiKey}&language=en`;
         const geoCodingResponse = await getHttpRequestAsync<IGoogleGeocodingResponse>(url, 5000).toPromise();
         const locationData: IGeoAddress = {
            cc: null,
            regDef: null,
            sRegDef: null,
            smDef: null,
            suburbDef: null,
            strDef: null,
         };
         // TODO: Recactor with TS monad.
         if (geoCodingResponse.results.length > 0) {
            let streetNumber: string;
            geoCodingResponse.results.forEach((result) => {
               result.address_components.forEach((resultElem) => {
                  if (resultElem.types.indexOf('route') !== -1 && !locationData.strDef) {
                     locationData.strDef = resultElem.long_name;
                  } else if (resultElem.types.indexOf('locality') !== -1 && !locationData.smDef) {
                     locationData.smDef = resultElem.long_name;
                  } else if (resultElem.types.indexOf('country') !== -1 && !locationData.cc) {
                     locationData.cc = resultElem.short_name.toLowerCase();
                  } else if (
                     resultElem.types.indexOf('administrative_area_level_1') !== -1 &&
                     !locationData.regDef
                  ) {
                     locationData.regDef = resultElem.long_name;
                  } else if (
                     resultElem.types.indexOf('administrative_area_level_2') !== -1 &&
                     +locationData.sRegDef
                  ) {
                     locationData.sRegDef = resultElem.long_name;
                  } else if (resultElem.types.indexOf('neighborhood') !== -1 && !locationData.suburbDef) {
                     locationData.suburbDef = resultElem.long_name;
                  } else if (resultElem.types.indexOf('street_number') !== -1 && +streetNumber) {
                     streetNumber = resultElem.long_name;
                  }
               });
            });
            if (streetNumber && locationData.strDef) {
               locationData.strDef = `${streetNumber} ${locationData.strDef}`;
            }

            return Promise.resolve(locationData);
         } else {
            return Promise.resolve(locationData);
         }
      } catch (error) {
         return Promise.reject(error);
      }
   }
}

export const googleReverseGeoCoder = new GoogleReverseGeocoder();
