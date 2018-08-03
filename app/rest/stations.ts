import * as express from "express";
import { StationsMongoModel } from "../database";

export function stationCount(req: any, res: express.Response) {
    const filter: any = {};
    const limit: number = !isNaN(req.query.limit) ? Number(req.query.limit) : undefined;
    if (req.query.ignoreUnknown) {
        filter.latLon = { "$exists": true };
    }
    if (req.query.country) {
        filter["location.cc"] = req.query.country;
    }
    if (req.query.search) {
        const regexp = new RegExp(req.query.search, "i");
        filter["$or"] = [{ name: regexp }, { 'location.smDef': regexp }, { 'location.sm_hun': regexp }];
    }

    StationsMongoModel.find(filter, { _id: 0, __v: 0 }).sort({ detCnt: -1 }).limit(limit).exec((err, result: any[]) => {
        result.forEach(elem => {
            if (elem.lastSeen) {
                elem.lastSeen = elem.lastSeen.getTime();
            }
        });
        res.json(result);
    });
}

export async function getStationsAsync(req: express.Request, res: express.Response) {
    const lat = req.query['lat'] || 0;
    const lon = req.query['lon'] || 0;
    if (!isNaN(lat) && !isNaN(lon)) {
        const count: number = await StationsMongoModel.count({});
        const results = await StationsMongoModel.aggregate([
            {
                '$geoNear': {
                    limit: count,
                    near: { type: "Point", coordinates: [Number(lon), Number(lat)] },
                    distanceField: "dist",
                    includeLocs: "latLon",
                    spherical: true
                },
            },
            {
                '$addFields': {
                    dist: {
                        '$divide': ['$dist', 1000]
                    }
                }
            }
        ]);
        res.json(results);
    } else {
        res.json({error: "NO_COORDS"});
    }
}

export async function stationsByCountry(req: express.Request, res: express.Response) {
        const results = await StationsMongoModel.aggregate([
            {
                "$group": {
                    _id: "$location.cc",
                    sIds: { "$push": '$sId' }
                }
            },
            {
                '$project': {
                    allCount: { "$size": '$sIds' },
                    _id: 0,
                    cc: "$_id",
                    sIds: 1
                }
            },
            {
                '$sort': {
                    allCount: -1
                }
            }
        ]);
        res.json(results);
}
