/**
 * Created by ehog on 2017. 06. 25..
 */
import { mquery } from 'mongoose';
import { Observable } from 'rxjs';
import { fromPromise } from 'rxjs/internal-compatibility';

export {};
declare module 'mongoose' {
  // eslint-disable-next-line @typescript-eslint/naming-convention
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
