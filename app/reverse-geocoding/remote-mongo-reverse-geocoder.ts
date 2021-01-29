import { IGeoAddress } from '../contracts/entities';
import { IReverseGeoCoderAsync } from '../contracts/service-interfaces';
import { getHttpRequestAsync } from '../helpers';

class RemoteMongoReverseGeocoderAsync implements IReverseGeoCoderAsync {
   // #region Public Methods (1)

   public getGeoInformation(latLonPair: number[]): Promise<IGeoAddress> {
      return getHttpRequestAsync<IGeoAddress>(
         `http://localhost:8889/revgeo/${latLonPair[0]},${latLonPair[1]}`,
         10000
      ).toPromise();
   }

   // #endregion Public Methods (1)
}

export const remoteMongoReverseGeocoderAsync: IReverseGeoCoderAsync = new RemoteMongoReverseGeocoderAsync();
