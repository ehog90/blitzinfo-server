import * as express from 'express';
import {INearbyRequest} from "../contracts/entities";
import * as mongo from "../database/mongoose-schemes";
import * as geoUtils from "../helpers/geospatial-helper";

/*
    REST: 10 perces statisztikák bizonyos órára visszamenőleg.
*/
export async function nearbyStrokes(req: INearbyRequest, res: express.Response) {
    if (!isNaN(req.params.lat) && !isNaN(req.params.lon)) {
        const queryCoords: number[] = [Number(req.params.lon), Number(req.params.lat)];
        const dataWithDistance: any[] = await mongo.TtlOneHourStrokeMongoModel.aggregate([
            {
                '$geoNear': {
                    near: {type: "Point", coordinates: [Number(req.params.lon), Number(req.params.lat)]},
                    spherical: true,
                    maxDistance: 100000,
                    distanceField: 'dist',
                    limit: 50000
                }
            }
        ]);
        const data = dataWithDistance.map(x => {
            return {
                latLon: x.obj.latLon,
                time: x.obj.time.getTime(),
                d: x.dist / 1000,
                br: geoUtils.getBearing(queryCoords, x.obj.latLon)
            };
        });
        res.json({error: null, data: data});


    } else {
        res.json({error: "WRONG_FORMAT", data: null});
    }
}
