import * as express from 'express';
import * as mongo from "../mongo/mongoDbSchemas";
import* as geoUtils from "../utils/geo"
import {Entities} from "../interfaces/entities";
import INearbyTequest = Entities.INearbyTequest;

/*
    REST: 10 perces statisztikák bizonyos órára visszamenőleg.
*/
export function nearbyStrokes(req: INearbyTequest, res: express.Response) {
    if (!isNaN(req.params.lat) && !isNaN(req.params.lon)) {
        const queryCoords: number[] = [Number(req.params.lon), Number(req.params.lat)];
        mongo.TtlOneHourStrokeMongoModel.geoNear({ type: "Point", coordinates: [Number(req.params.lon), Number(req.params.lat)] },
            { spherical: true, maxDistance: 100000, limit: 50000},
            (err, dataWithDistance: any[]) => {
                if (err) {
                    res.json({ error: "DB_ERROR", data: null });
                } else {
                    const data = dataWithDistance.map(x => {
                        return { latLon: x.obj.latLon, time: x.obj.time.getTime(), d: x.dis / 1000, br: geoUtils.getBearing(queryCoords, x.obj.latLon)}
                    });
                    res.json({ error: null, data: data });
                }
            }
        );


    } else {
        res.json({ error: "WRONG_FORMAT", data: null });
    }
}