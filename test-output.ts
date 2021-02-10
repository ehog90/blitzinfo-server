import * as fs from 'fs';
import * as websocket from 'websocket';

const initializationObject = JSON.parse(fs.readFileSync('init.json', 'utf8'));
const ws = new websocket.client();
ws.on('connect', (connection: websocket.connection) => {
  connection.on('error', (error: Error) => {
    console.error('Error' + error);
  });
  connection.on('close', (reason: number) => {
    console.error('Socket colosure' + reason);
  });
  connection.on('message', (messageRaw: websocket.IMessage) => {
    const data = JSON.parse(messageRaw.utf8Data);
    console.warn(
      'Strokes length: ' + (data.strokes ? data.strokes.length : 'None'),
    );
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    fs.appendFile('test-output-log.log', `${messageRaw.utf8Data}\n`, () => {});
  });
  connection.sendUTF(JSON.stringify(initializationObject));
});

ws.connect('wss://live.lightningmaps.org');
