// Imports.
import * as bodyParser from "body-parser";
import * as morgan from "morgan";
const mongoose = require('mongoose');
import * as cors from 'cors';
import * as express from "express";
import * as http from "http";
import * as method_override from "method-override";
import * as path from "path";
import {config, corsSettings} from "./scripts/config";
import {firebaseService} from "./scripts/firebase/firebaseService";
import {metHuParser} from "./scripts/hungarian-meteo-alerts/hungarian-meteo-alerts-parser";

import {loggerInstance} from "./scripts/logger/loggerInstance";

import {IServerError} from "./scripts/interfaces/entities";
import {lightningMapsWebSocketInstance} from "./scripts/lightningMaps/lightningMaps";
import {authenticationMiddleware} from "./scripts/rest/authentication-middleware";
import {customMorganLogger} from "./scripts/rest/morgan-logger";
import {defaultRouter} from "./scripts/rest/router";
import {socketIoServer} from "./scripts/socketIoServer/socketIoServer";
import {stationResolver} from "./scripts/station-resolver/station-resolver";

require('./scripts/mongo/mongoose-extensions');
// Set up mongoose
mongoose.promise = global.Promise;
mongoose.connect(config.mongoLink, {poolSize: 3}, (error) => {
    if (error) {
        console.error(`Failed to connect to the database ${config.mongoLink}: ${error}`);
        process.exit(1);
    } else {
        console.error(`Mongoose connected to MongoDB:  ${config.mongoLink}}`);
    }
});
const app = express();
morgan.token('custom', customMorganLogger);
app.use(morgan(':method :url :response-time :status :custom'));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(method_override());
app.use(cors(corsSettings));
app.use(authenticationMiddleware);
app.use(defaultRouter);

const server = http.createServer(app);
server.listen(config.restPort);
server.on("error", (error: IServerError) => {
    loggerInstance.sendErrorMessage(0, 0, "REST API Server error", JSON.stringify(error), false);
    if (error.code === "EADDRINUSE") {
        loggerInstance.sendErrorMessage(0, 0, "REST API Server error", `Fatal error, the port ${error.port} is in use.`, false);
        process.exit(1);
    }
});
loggerInstance.sendNormalMessage(40, 16, "Configuration", JSON.stringify(config), false);
lightningMapsWebSocketInstance.start();
metHuParser.invoke();
socketIoServer.invoke();
stationResolver.start();
firebaseService.invoke();
