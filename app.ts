//Imports.
import * as morgan from "morgan";
import * as bodyParser from "body-parser";
const mongoose = require('mongoose');
import * as method_override from "method-override";
import * as express from "express";
import {lightningMapsWebSocket} from "./scripts/lightningMaps/lightningMaps";
import {locationUpdater} from "./scripts/databaseSaver/locationUpdater";
import {socketIoServer} from "./scripts/socketIoServer/socketIoServer";
import {firebaseService} from "./scripts/firebase/firebaseService";
import {logger} from "./scripts/logger/logger";
import * as http from "http";
import * as path from "path";
import * as restStats from "./scripts/rest/stats";
import * as perupdate from "./scripts/rest/perupdate";
import * as restWelcome from "./scripts/rest/welcome";
import * as flags from "./scripts/rest/flags";
import * as userlogs from "./scripts/rest/locationLogs";
import * as userHandling from "./scripts/rest/userHandling";
import * as logs from "./scripts/rest/logs";
import * as savedLocations from "./scripts/rest/savedLocations";
import * as nearbyStrokes from "./scripts/rest/nearbyStrokes";
import {getStationsAsync, stationCount, stationsByCountry} from "./scripts/rest/stations";
import {stationResolver} from "./scripts/station-resolver/station-resolver";
import {config} from "./scripts/config";
import {Entities} from "./scripts/interfaces/entities";
import IServerError = Entities.IServerError;
import {authTest, authenticationMiddleware} from "./scripts/rest/authentication-middleware";
import {metHuParser} from "./scripts/hungarian-meteo-alerts/hungarian-meteo-alerts-parser";
import {corsMiddleware} from "./scripts/rest/cors-middleware";
const mongooseExt = require('./scripts/mongo/mongoose-extensions');

// Set up mongoose

mongoose.promise = global.Promise;
mongoose.connect(config.mongoLink, {poolSize: 12}, (error, ins) => {
    if (error) {
        console.error(`Failed to connect to the database ${config.mongoLink}: ${error}`);
        process.exit(1);
    }
    else {
        console.error(`Mongoose connected to MongoDB:  ${config.mongoLink}}`);
    }
});

//Express app settings


const app = express();

morgan.token('custom', (req, res) => {
    if (res.statusCode === 500) {
        logger.sendErrorMessage(0, 0, "Morgan HTTP Logging", `${req.method} Reguest on: ${req.url}, params: ${JSON.stringify(req.params)}, status code: ${res.statusCode}`, false);
        ;
    }
    else if (res.statusCode >= 400) {
        logger.sendWarningMessage(0, 0, "Morgan HTTP Logging", `${req.method} Reguest on: ${req.url}, params: ${JSON.stringify(req.params)}, status code: ${res.statusCode}`, false);
    } else {
        logger.sendNormalMessage(22, 255, "Morgan HTTP Logging", `${req.method} Reguest on: ${req.url}, params: ${JSON.stringify(req.params)}, status code: ${res.statusCode}`, false);
    }
    return ""
});
app.set('view engine', 'jade');
//noinspection TypeScriptValidateTypes
app.use(morgan(':method :url :response-time :status :custom', {}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(method_override());
app.use(corsMiddleware);
app.use(authenticationMiddleware);
app.get('/', restWelcome.welcome);
app.get('/auth/test', authTest);
app.get('/stats/tenmin/:hours', restStats.tenminStats);
app.get('/stats/utcyear', restStats.currentUTCYearStats);
app.get('/stats/overall', restStats.overallStats);
app.get('/stats/lastminutes/:mins', restStats.lastMinutesStatistics);
app.get('/flags/:cc/:size/:format', flags.flagImage);
app.post('/loginUser', userHandling.login);
app.post('/registerUser', userHandling.register);
app.get('/stations', stationCount);
app.get('/stationsNearby', getStationsAsync);
app.get('/stationsByCountry', stationsByCountry);
app.get('/logs/:type/:time', logs.errors);
app.get('/nearby/:lat,:lon', nearbyStrokes.nearbyStrokes);

app.post('/auth/user-location-logs', userlogs.locationLogsForUser);
app.post('/auth/periodic-update', perupdate.periodicUpdate);
app.get('/auth/saved-locations', savedLocations.getLocationsForUser);
app.post('/auth/saved-locations', savedLocations.newLocationInstance);
app.delete('/auth/saved-locations/:locationId', savedLocations.removeLocationInstance);


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
