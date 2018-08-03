/**
 * Created by ehog on 2017. 06. 25..
 */

import {Observable} from "rxjs";

export {};
import {mquery, DocumentQuery} from 'mongoose';
import {fromPromise} from "rxjs/internal-compatibility";

declare module 'mongoose' {
    // noinspection TsLint
    interface mquery {
        toObservable(): Observable<any>;

        toPromise(): Promise<any>;
    }

    interface DocumentQuery<T, DocType extends Document> {
        toObservable(): Observable<T>;

        toPromise(): Promise<T>;
    }
}
mquery.prototype.toObservable = function () {
    const query = this;
    return fromPromise(query.exec());
};

mquery.prototype.toPromise = function () {
    const query = this;
    return query.exec();
};
