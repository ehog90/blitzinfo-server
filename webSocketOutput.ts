import * as websocket from 'websocket';
import * as fs from "fs";


const initializationObject = { "v": 15, "i": 0, "s": true, "x": 0, "w": 1, "tx": 0, "tw": 0, "a": 0, "z": 6, "b": true, "h": "#y=0;x=0;z=0;t=2;m=sat;r=0;s=0;o=0;b=0.00;n=0;d=2;dl=2;dc=0;", "l": 301, "t": 1465075774, "p": [90, 180, -90, -180] };

const ws = new websocket.client;

ws.on('connect', (connection: websocket.connection) => {
    connection.on('error', (error: Error) => {

    });
    connection.on('close', (reason: number) => {

    });
    connection.on('message', (messageRaw: websocket.IMessage) => {
        let data = JSON.parse(messageRaw.utf8Data);
        //console.log(messageRaw);
        console.warn("Strokes length: " + (data.strokes ? data.strokes.length : "None"));
        fs.appendFile("logData",`${messageRaw.utf8Data}\n`,() => {
            console.log(messageRaw.utf8Data);
        })

    });

    connection.sendUTF(JSON.stringify(initializationObject));
});

ws.connect("wss://ws3.lightningmaps.org/");