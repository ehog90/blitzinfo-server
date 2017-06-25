import * as Rx from "rx";
import * as geo from "../utils/geo";
import {mongoReverseGeocoderAsync} from "./mongoReverseGeocoderAsync";
import {Modules} from "../interfaces/modules";
import IReverseGeocoderService = Modules.IReverseGeoCoderService;
import ILightningMapsWebSocket = Modules.ILightningMapsWebSocket;
import Subject = Rx.Subject;
import {Entities} from "../interfaces/entities";
import IStroke = Entities.IStroke;
import IReverseGeocoderAsync = Modules.IReverseGeoCoderAsync;
import ILightningMapsStroke = Entities.ILightningMapsStroke;
import Observable = Rx.Observable;
import {lightningMapsWebSocket} from "../lightningMaps/lightningMaps";
const sunCalc: any = require("../../overridden_modules/suncalc");

class ReverseGeocoderService implements IReverseGeocoderService {
    private lightningMapsWebSocket: ILightningMapsWebSocket;
    public lastGeocodedStroke: Subject<IStroke>;
    public serverEventChannel: Subject<any>;

    constructor(private reverseGeocoder: IReverseGeocoderAsync) { }

    public async geoCode(stroke: ILightningMapsStroke)
    {
        let sunData = sunCalc.getPosition(new Date(stroke.time), stroke.lat, stroke.lon);
        let sunElevation: number = (sunData.altitude * 180 / Math.PI);
        const azimuth: number = ((sunData.azimuth * 180 / Math.PI));
        const geoCodedStroke: Entities.IStroke = {
            latLon: [parseFloat(stroke.lon.toFixed(4)), parseFloat(stroke.lat.toFixed(4))],
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
        geoCodedStroke.locationData = await this.reverseGeocoder.getGeoInformation([stroke.lon, stroke.lat]);
        this.lastGeocodedStroke.onNext(geoCodedStroke);
    }

    public  assignWebSocket(lightningMapsWebSocket: ILightningMapsWebSocket) {
        this.lightningMapsWebSocket = lightningMapsWebSocket;
        this.lastGeocodedStroke = new Subject<IStroke>();
        this.serverEventChannel = lightningMapsWebSocket.strokeEventChannel;
        lightningMapsWebSocket.lastReceived.subscribe(stroke => this.geoCode(stroke));
    }
}

export const reverseGeocoderService: IReverseGeocoderService = new
    ReverseGeocoderService(mongoReverseGeocoderAsync);
reverseGeocoderService.assignWebSocket(lightningMapsWebSocket);