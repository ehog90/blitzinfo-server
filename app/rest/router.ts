/**
 * Created by ehog on 2017. 07. 16..
 */
import * as express from 'express';

import { authTest } from './authentication-middleware';
import { flagImage } from './flags';
import { locationLogsForUser } from './location-logs';
import { errors } from './logs';
import { nearbyStrokes } from './nearby-strokes';
import { periodicUpdate } from './periodic-update';
import {
  getLocationsForUser,
  newLocationInstance,
  removeLocationInstance,
} from './saved-locations';
import { getStationsAsync, stationCount, stationsByCountry } from './stations';
import {
  currentUTCYearStats,
  lastMinutesStatistics,
  overallStats,
  tenminStats,
} from './stats';
import { login, register } from './user-handling';
import { welcome } from './welcome';

export const defaultRouter = express.Router();

defaultRouter.get('/', welcome);
defaultRouter.get('/auth/test', authTest);
defaultRouter.get('/stats/tenmin/:hours', tenminStats);
defaultRouter.get('/stats/utcyear', currentUTCYearStats);
defaultRouter.get('/stats/overall', overallStats);
defaultRouter.get('/stats/lastminutes/:mins', lastMinutesStatistics);
defaultRouter.get('/flags/:cc/:size/:format', flagImage);
defaultRouter.post('/loginUser', login);
defaultRouter.post('/registerUser', register);
defaultRouter.get('/stations', stationCount);
defaultRouter.get('/stationsNearby', getStationsAsync);
defaultRouter.get('/stationsByCountry', stationsByCountry);
defaultRouter.get('/logs/:type/:time', errors);
defaultRouter.get('/nearby/:lat,:lon', nearbyStrokes);

defaultRouter.post('/auth/user-location-logs', locationLogsForUser);
defaultRouter.post('/auth/periodic-update', periodicUpdate);
defaultRouter.get('/auth/saved-locations', getLocationsForUser);
defaultRouter.post('/auth/saved-locations', newLocationInstance);
defaultRouter.delete(
  '/auth/saved-locations/:locationId',
  removeLocationInstance,
);
