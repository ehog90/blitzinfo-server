import { readFileSync } from 'fs';
import * as commander from 'commander';
import { Environment } from './contracts/entities';

export const corsSettings = {
  origin: (origin, callback) => {
    if (
      !origin ||
      origin.endsWith('ehog.hu') ||
      origin.startsWith('http://localhost')
    ) {
      callback(null, true);
    } else {
      callback(new Error(`${origin}: this is not an allowed origin`));
    }
  },
};

export const initObject = JSON.parse(readFileSync('./init.json', 'utf8'));

commander
  .allowUnknownOption(true)
  .option('-r, --rest-port <n>', 'Rest API port', '5000')
  .option('-l, --live-port <n>', 'Live data port', '5001')
  .option('-e, --environment [value]', 'environment', Environment.Production)
  .option(
    '-m, --mongo-path [value]',
    'MongoDB path without mongodb://',
    '127.0.0.1/blitzinfo',
  )
  .parse(process.argv);

/*config.restPort = Number(commander.restPort);
config.socketIOPort = Number(commander.livePort);
switch (config.environment) {
  case 'DEV':
    config.environment = Environment.Development;
    config.lightningMapsUrl = 'ws://localhost:4777';
    config.mongoLink = `mongodb://${commander.mongoPath}`;
    break;
  case 'DEVREAL':
    config.environment = Environment.Development;
    config.lightningMapsUrl = 'ws://localhost:4777';
    config.mongoLink = `mongodb://192.168.1.22/blitzinfo_dev`;
    break;
  default:
    break;
}
*/
