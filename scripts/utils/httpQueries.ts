import * as https from "https";
import {RequestOptions} from "https";
const request = require("request");
import {Observable} from "rxjs/Observable";

export function getHttpRequestAsync<T>(url: string, timeout: number): Observable<T> {
    return Observable.create(observer => {
        request({url: url, json: true, timeout: timeout}, (error, response, body) => {
            if (error) {
                observer.error({error: error, errorCode: -1});
            }
            else if (response.statusCode !== 200) {
                observer.error({error: "Other", errorCode: response.statusCode});
            }
            else {
                observer.next(body);
            }
            observer.complete();
        });
    });
}

export function customHttpRequestAsync<T>(opts: RequestOptions, message: any): Observable<T> {
    return Observable.create(observer => {
        const request: any = https.request(opts,
            res => {
                let d;
                res.on('data',
                    chunk => {
                        d += chunk;
                    });
                res.on('end',
                    () => {
                        observer.next(d);
                        observer.complete();
                    });
            })
            .on('error',
                e => {
                    observer.error(e);
                    observer.complete();
                });
        request.end(JSON.stringify(message));
    });
}
