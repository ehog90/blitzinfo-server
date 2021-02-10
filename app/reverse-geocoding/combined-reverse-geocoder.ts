import { reverseGeocodingBaseUrl } from './../config_new';
import { ICombinedReverseGeocoderService } from './../contracts/service-interfaces';
import { IHungarianRegionalInformation } from '../contracts/entities';
import { IGeoAddress } from '../contracts/entities';
import { getHttpRequestAsync } from '../helpers';

class RemoteMongoReverseGeocoderAsync
  implements ICombinedReverseGeocoderService {
  // #region Public Methods (1)

  public getGeoInformation(latLonPair: number[]): Promise<IGeoAddress> {
    return getHttpRequestAsync<IGeoAddress>(
      `${reverseGeocodingBaseUrl}/revgeo/${latLonPair[0]},${latLonPair[1]}`,
      10000,
    ).toPromise();
  }

  public getHungarianGeoInformation(
    latLonPair: number[],
  ): Promise<IHungarianRegionalInformation> {
    return getHttpRequestAsync<IHungarianRegionalInformation>(
      `${reverseGeocodingBaseUrl}/revgeo-hu/${latLonPair[0]},${latLonPair[1]}`,
      10000,
    ).toPromise();
  }

  // #endregion Public Methods (1)
}

export const combinedReverseGeocooder: ICombinedReverseGeocoderService = new RemoteMongoReverseGeocoderAsync();
