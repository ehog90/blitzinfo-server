import * as https from "https";
import {RequestOptions} from "https";
import * as Rx from "rx";
import {Entities} from "../interfaces/entities";
const request = require("request");
import Observable = Rx.Observable;
import IResult = Entities.IResult;

export async function getJsonAsync(url: string, timeout: number): Promise<IResult<any>> {
    return <Promise<IResult<any>>>new Promise((resolve, reject) => {
        request({url: url, json: true, timeout: timeout}, (error, response, body) => {
            if (error) {
                resolve({error: error, result: null});
            }
            else if (response.statusCode !== 200) {
                resolve({error: response.statusCode, result: null});
            }
            if (response) {
                resolve({error: response.statusCode, result: body});
            }
            else {
                resolve({error: 'Unknown', result: body});
            }

        });
    });
}
export async function getAnyAsync(url: string, timeout: number): Promise<IResult<string>> {
    return <Promise<Entities.IResult<any>>>new Promise((resolve, reject) => {
        request({url: url, timeout: timeout}, (error, response, body) => {
            if (error) {
                resolve({error: error, result: null});
            }
            else if (response.statusCode !== 200) {
                resolve({error: response.statusCode, result: null});
            }
            resolve({error: null, result: body});
        });
    });
}
export function getJson(url, callback: (error: any, result: any) => void) {
    request({url: url, json: true, timeout: 5000}, (error, response, body) => {
        if (error) {
            return callback(error, null);
        }
        else if (response.statusCode !== 200) {
            return callback(response.statusCode, null);
        }
        callback(undefined, body);
    });
}
export function customHttpRequestAsync<T>(opts: RequestOptions, message: any): Observable<T> {
    return Observable.create<T>(observer => {
        const request: any = https.request(opts,
            res => {
                let d;
                res.on('data',
                    chunk => {
                        d += chunk;
                    });
                res.on('end',
                    () => {
                        observer.onNext(d);
                        observer.onCompleted();
                    });

            })
            .on('error',
                e => {
                    observer.onError(e);
                    observer.onCompleted();
                });
        request.end(JSON.stringify(message));
    });

}
