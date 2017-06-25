/**
 * Created by ehog on 2017. 06. 25..
 */
import * as Rx from 'rx';

import Observable = Rx.Observable;
export {}
import {DocumentQuery, mquery} from 'mongoose'
declare module 'mongoose' {
    interface mquery{
        toObservable() : Observable<any>
    }
    interface DocumentQuery<T, DocType extends Document> {
        toObservable() : Observable<T>
    }
}
mquery.prototype.toObservable = function() {
    const query = this;
    return Observable.fromPromise(query.exec())
};