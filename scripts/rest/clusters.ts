import * as express from "express";
import {TtlTenMinStrokeMongoModel} from "../mongo/mongoDbSchemas";
import {getDistance} from "../utils/geo";
import {Entities} from "../interfaces/entities";
import IStrokeDocument = Entities.IStrokeDocument;
import * as concaveman from 'concaveman';
import {FeatureCollection} from "geojson";

export async function getClusters(req: express.Request, res: express.Response) {
    let geoJsonFeatureCollection = {type: 'FeatureCollection', features: []};
    let allStrokes: IStrokeDocument[] =<IStrokeDocument[]>await TtlTenMinStrokeMongoModel.aggregate([{$project: {_id: 1, latLon: 1, time: 1}},{$sort: {time: -1}},{$limit: 10000}]);
    let currentCluster = [];
    while (allStrokes.length > 0) {
        let firstStroke = allStrokes[0];
        let allStrokesInDistance : IStrokeDocument[] = allStrokes.filter(x => getDistance(firstStroke.latLon,x.latLon) < 10);
        while (allStrokesInDistance.length > 0) {
            let currentStroke = allStrokesInDistance[0];
            let newStrokes = allStrokes.filter(x =>!allStrokesInDistance.find(y => y._id == currentStroke._id) && getDistance(currentStroke.latLon,x.latLon) < 10 );
            allStrokesInDistance.splice(0,1);
            allStrokesInDistance = allStrokesInDistance.concat(newStrokes);
            currentCluster.push(currentStroke);
            allStrokes = allStrokes.filter(x => x._id != currentStroke._id);
        }
        geoJsonFeatureCollection.features.push(currentCluster.map(x => {return {type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [concaveman(x.latLon)]}}}));
        currentCluster = [];
        allStrokes.splice(0,1);
    }
    res.json(geoJsonFeatureCollection);
}