import {Entities} from "../interfaces/entities";
import IGeoAddress = Entities.IGeoAddress;
import {getHttpRequestAsync} from "../utils/httpQueries";
import {Modules} from "../interfaces/modules";

class RemoteMongoReverseGeocoderAsync implements Modules.IReverseGeoCoderAsync {

    getGeoInformation(latLonPair: number[]): Promise<IGeoAddress> {
        return getHttpRequestAsync<IGeoAddress>(`http://localhost:8889/revgeo/${latLonPair[0]},${latLonPair[1]}`,10000).toPromise();
    }
}
export const remoteMongoReverseGeocoderAsync: Modules.IReverseGeoCoderAsync = new RemoteMongoReverseGeocoderAsync();