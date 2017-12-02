import * as fs from "fs"
import {Entities} from "./interfaces/entities";
import IConfig = Entities.IConfig;
import Environment = Entities.Environment;
import * as commander from "commander";


export const config: IConfig = {
    environment: Environment.Production,
    mongoLink: "mongodb://127.0.0.1/blitzinfo",
    restPort: 5000,
    socketIOPort: 5001,
    lightningMapsUrl: 'wss://live.lightningmaps.org',
    geoCodingDistanceThreshold: 15000,
    dbDupeCheckingTimeout: 60
};
export const initObject = JSON.parse(fs.readFileSync("./init.json", "utf8"));

commander
    .allowUnknownOption(true)
    .option('-r, --rest-port <n>', 'Rest API port',"5000")
    .option('-l, --live-port <n>', 'Live data port', "5001")
    .option('-e, --environment [value]', 'environment',Environment.Production)
    .option('-m, --mongo-path [value]', 'MongoDB path without mongodb://','127.0.0.1/blitzinfo')
    .parse(process.argv);

config.restPort = Number(commander.restPort);
config.socketIOPort = Number(commander.livePort);
switch (config.environment) {
    case "DEV":
        config.environment = Environment.Development;
        config.lightningMapsUrl = "ws://localhost:4777";
        config.mongoLink = `mongodb://${commander.mongoPath}`;
        break;
    case "DEVREAL":
        config.environment = Environment.Development;
        config.lightningMapsUrl = "ws://localhost:4777";
        config.mongoLink = `mongodb://192.168.1.22/blitzinfo_dev`;
        break;
    default:
        break;
}