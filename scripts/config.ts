import * as fs from "fs"
import {Entities} from "./interfaces/entities";
import IConfig = Entities.IConfig;


export const config: IConfig = {
    environment: "PROD",
    mongoLink: "mongodb://127.0.0.1/blitzinfo",
    restPort: 5000,
    socketIOPort: 5001,
    lightningMapsUrl: 'wss://live.lightningmaps.org',
};
export const initObject =  JSON.parse(fs.readFileSync("./init.json","utf8"));

if (process.argv.length === 5 || process.argv.length === 6) {
    if (!isNaN(Number(process.argv[2]))) {
        config.restPort = Number(process.argv[2]);
    } else {
        config.restPort = 5000;
    }

    if (!isNaN(Number(process.argv[3]))) {
        config.socketIOPort = Number(process.argv[3]);
    } else {
        config.socketIOPort = 5001;
    }

    if (process.argv[4] === "DEV") {
        config.environment = "DEV";
        config.lightningMapsUrl = "ws://localhost:4777";
        if (process.argv.length === 6) {
            config.mongoLink = `mongodb://${process.argv[5]}`;
        } else {
            config.mongoLink = "mongodb://192.168.1.22/blitzinfo_dev";
        }
    }

    if (process.argv[4] === "DEVREAL") {
        config.environment = "DEV";
        config.lightningMapsUrl = "ws://localhost:4777";
        if (process.argv.length === 6) {
            config.mongoLink = `mongodb://${process.argv[5]}`;
        } else {
            config.mongoLink = "mongodb://192.168.1.22/blitzinfo_dev";
        }

    }
}