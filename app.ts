//Imports.
import * as morgan from "morgan";
import * as bodyParser from "body-parser";
const mongoose = require('mongoose');
import * as method_override from "method-override";
import * as express from "express";
import {lightningMapsWebSocket} from "./scripts/lightningMaps/lightningMaps";
import {socketIoServer} from "./scripts/socketIoServer/socketIoServer";
import {firebaseService} from "./scripts/firebase/firebaseService";
import {logger} from "./scripts/logger/logger";
import * as http from "http";
import * as path from "path";
import {stationResolver} from "./scripts/station-resolver/station-resolver";
import {config} from "./scripts/config";
import {Entities} from "./scripts/interfaces/entities";
import IServerError = Entities.IServerError;
import {authenticationMiddleware} from "./scripts/rest/authentication-middleware";
import {metHuParser} from "./scripts/hungarian-meteo-alerts/hungarian-meteo-alerts-parser";
import {corsMiddleware} from "./scripts/rest/cors-middleware";
import {customMorganLogger} from "./scripts/rest/morgan-logger";
import {defaultRouter} from "./scripts/rest/router";
require('./scripts/mongo/mongoose-extensions');
// Set up mongoose
mongoose.promise = global.Promise;
mongoose.connect(config.mongoLink, {poolSize: 3}, (error) => {
    if (error) {
        console.error(`Failed to connect to the database ${config.mongoLink}: ${error}`);
        process.exit(1);
    }
    else {
        console.error(`Mongoose connected to MongoDB:  ${config.mongoLink}}`);
    }
});
const app = express();
morgan.token('custom',customMorganLogger);
app.set('view engine', 'jade');
app.use(morgan(':method :url :response-time :status :custom', {}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(method_override());
app.use(corsMiddleware);
app.use(authenticationMiddleware);
app.use(defaultRouter);

const server = http.createServer(app);
server.listen(config.restPort);
server.on("error", (error: IServerError) => {
    logger.sendErrorMessage(0, 0, "REST API Server error", JSON.stringify(error), false);
    if (error.code === "EADDRINUSE") {
        logger.sendErrorMessage(0, 0, "REST API Server error", `Fatal error, the port ${error.port} is in use.`, false);
        process.exit(1);
    }
});
logger.sendNormalMessage(40, 16, "Configuration", JSON.stringify(config), false);
lightningMapsWebSocket.start();
metHuParser.invoke();
socketIoServer.invoke();
stationResolver.start();
firebaseService.invoke();
