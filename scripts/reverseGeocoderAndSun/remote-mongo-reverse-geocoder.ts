import {IGeoAddress} from "../interfaces/entities";
import {IReverseGeoCoderAsync} from "../interfaces/modules";
import {getHttpRequestAsync} from "../utils/httpQueries";

class RemoteMongoReverseGeocoderAsync implements IReverseGeoCoderAsync {

    public getGeoInformation(latLonPair: number[]): Promise<IGeoAddress> {
        return getHttpRequestAsync<IGeoAddress>(`http://localhost:8889/revgeo/${latLonPair[0]},${latLonPair[1]}`,
            10000).toPromise();
    }
}

export const remoteMongoReverseGeocoderAsync: IReverseGeoCoderAsync = new RemoteMongoReverseGeocoderAsync();
