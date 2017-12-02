import * as mongoose from 'mongoose'
import {config} from "./scripts/config";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as http from "http";
import {mongoReverseGeocoderAsync} from "./scripts/reverseGeocoderAndSun/mongoReverseGeocoderAsync";

mongoose.connect(config.mongoLink, {useMongoClient: true}, (error) => {
    if (error) {
        console.error(`Failed to connect to the database ${config.mongoLink}: ${error}`);
        process.exit(1);
    }
    else {
        console.error(`Mongoose connected to MongoDB:  ${config.mongoLink}}`);
    }
});

const revGeo = mongoReverseGeocoderAsync;
const app = express();
app.use(bodyParser.json());
app.get("/revgeo/:lon,:lat", async (req: express.Request, res: express.Response) => {
    const reverseGeocodedData = await revGeo.getGeoInformation([Number(req.params.lon),Number(req.params.lat)]);
    res.json(reverseGeocodedData);
});

const server = http.createServer(app);
server.listen(8889);