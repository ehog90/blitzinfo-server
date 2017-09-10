import * as geo from "../utils/geo";
import {Modules} from "../interfaces/modules";
import IReverseGeocoderService = Modules.IReverseGeoCoderService;
import ILightningMapsWebSocket = Modules.ILightningMapsWebSocket;
import {Entities} from "../interfaces/entities";
import IStroke = Entities.IStroke;
import IReverseGeocoderAsync = Modules.IReverseGeoCoderAsync;
import ILightningMapsStroke = Entities.ILightningMapsStroke;
import {lightningMapsWebSocket} from "../lightningMaps/lightningMaps";
import {Subject} from "rxjs/Subject";
import {remoteMongoReverseGeocoderAsync} from "./remote-mongo-reverse-geocoder";
import {logger} from "../logger/logger";

const sunCalc: any = require("../../changed-modules/suncalc");

class ReverseGeocoderService implements IReverseGeocoderService {
    private lightningMapsWebSocket: ILightningMapsWebSocket;
    public lastGeocodedStroke: Subject<IStroke>;
    public serverEventChannel: Subject<any>;

    constructor(private reverseGeocoder: IReverseGeocoderAsync) {
    }

    public async geoCode(stroke: ILightningMapsStroke) {
        let sunData = sunCalc.getPosition(new Date(stroke.time), stroke.lat, stroke.lon);
        let sunElevation: number = (sunData.altitude * 180 / Math.PI);
        const azimuth: number = ((sunData.azimuth * 180 / Math.PI));
        const geoCodedStroke: Entities.IStroke = {
            latLon: [stroke.lon, stroke.lat],
            locationData: {
                cc: 'xx',
                regDef: null,
                sRegDef: null,
                smDef: null,
                strDef: null,
                suburbDef: null
            },
            time: new Date(stroke.time),
            sunData: {
                sunElev: sunElevation,
                azimuth: azimuth,
                sunState: geo.getSunState(sunElevation, azimuth)
            },
            blitzortungId: stroke.id,
            _id: null
        };
        try {
            geoCodedStroke.locationData = await this.reverseGeocoder.getGeoInformation([stroke.lon, stroke.lat]);
            this.lastGeocodedStroke.next(geoCodedStroke);
        }
        catch (error) {
            logger.sendErrorMessage(0, 0, "Geocoder", "Geocoder error", false)
        }
    }

    public assignWebSocket(lightningMapsWebSocket: ILightningMapsWebSocket) {
        this.lightningMapsWebSocket = lightningMapsWebSocket;
        this.lastGeocodedStroke = new Subject<IStroke>();
        this.serverEventChannel = lightningMapsWebSocket.strokeEventChannel;
        lightningMapsWebSocket.lastReceived.subscribe(stroke => this.geoCode(stroke));
    }
}

export const reverseGeocoderService: IReverseGeocoderService = new
ReverseGeocoderService(remoteMongoReverseGeocoderAsync);
reverseGeocoderService.assignWebSocket(lightningMapsWebSocket);