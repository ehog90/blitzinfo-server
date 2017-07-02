import {Entities} from "../interfaces/entities";
export module JsonUtils {

    import IStroke = Entities.IStroke;
    function roundTime(time: Date) {
        return time.getTime() - time.getTime() % (10 * 60 * 1000);
    }

    export function toAllStatJson(stroke: IStroke): any[] {
        return ([stroke.time.getTime(), stroke.locationData.cc]);
    }
    export function flattenStroke(stroke: IStroke): any[] {
        return ([
            stroke._id,
            [stroke.latLon[0],
                stroke.latLon[1]],
            stroke.locationData.cc,
            stroke.locationData.regDef,
            stroke.locationData.sRegDef,
            stroke.locationData.smDef,
            stroke.locationData.strDef,
            stroke.locationData.suburbDef,
            parseFloat(stroke.sunData.azimuth.toFixed(3)),
            stroke.time.getTime(),
            parseFloat(stroke.sunData.sunElev.toFixed(3))
        ]);
    }

    export function flattenStrokeArray(strokes: Entities.IStroke[]): any[][] {
        return strokes.map(x => flattenStroke(x));
    }

    export function toLogsJson(deviceLocation: Entities.IDeviceLocationLog): any {
        return ([
            deviceLocation._id,
            deviceLocation.timeFirst.getTime(),
            deviceLocation.timeLast.getTime(),
            deviceLocation.timeLast.getTime() - deviceLocation.timeFirst.getTime(),
            [deviceLocation.latLon[0],
                deviceLocation.latLon[1]],
            deviceLocation.location.cc,
            deviceLocation.location.smDef,
            deviceLocation.location.suburbDef,
            deviceLocation.location.strDef,
            parseInt((deviceLocation.accsum / deviceLocation.num).toFixed(2)),
            flattenStrokeArray(deviceLocation.alerts)
        ]);
    }

}

