/*
    FCM fejlécek.
*/
import { firebaseApiKey } from '../sensitive-data/api-key.sensitive';

export const firebaseSettings = {
  host: 'fcm.googleapis.com',
  port: 443,
  path: '/fcm/send',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `key=${firebaseApiKey}`,
  },
};
