import * as https from 'https';
import { RequestOptions } from 'https';
import { Observable } from 'rxjs';

const request = require('request');

export function getHttpRequestAsync<T>(url: string, timeout: number): Observable<T> {
   return new Observable((observer) => {
      request({ url, json: true, timeout }, (error, response, body) => {
         if (error) {
            observer.error({ error, errorCode: -1 });
         } else if (response.statusCode !== 200) {
            observer.error({ error: 'Other', errorCode: response.statusCode });
         } else {
            observer.next(body);
         }
         observer.complete();
      });
   });
}

export function customHttpRequestAsync<T>(opts: RequestOptions, message: any): Observable<T> {
   return new Observable((observer) => {
      const req: any = https
         .request(opts, (res) => {
            let d;
            res.on('data', (chunk) => {
               d += chunk;
            });
            res.on('end', () => {
               observer.next(d);
               observer.complete();
            });
         })
         .on('error', (e) => {
            observer.error(e);
            observer.complete();
         });
      req.end(JSON.stringify(message));
   });
}
