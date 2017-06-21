var Rx;
(function (Rx) {
    var Tests;
    (function (Tests) {
        var Async;
        (function (Async) {
            var obsNum;
            var obsStr;
            var sch;
            function start() {
                obsNum = Rx.Observable.start(() => 10, obsStr, sch);
                obsNum = Rx.Observable.start(() => 10, obsStr);
                obsNum = Rx.Observable.start(() => 10);
            }
            function toAsync() {
                obsNum = Rx.Observable.toAsync(() => 1, sch)();
                obsNum = Rx.Observable.toAsync((a1) => a1)(1);
                obsStr = Rx.Observable.toAsync((a1, a2) => a1 + a2.toFixed(0))("", 1);
                obsStr = Rx.Observable.toAsync((a1, a2, a3) => a1 + a2.toFixed(0) + a3.toDateString())("", 1, new Date());
                obsStr = Rx.Observable.toAsync((a1, a2, a3, a4) => a1 + a2.toFixed(0) + a3.toDateString() + (a4 ? 1 : 0))("", 1, new Date(), false);
            }
            function fromCallback() {
                var func0;
                obsNum = Rx.Observable.fromCallback(func0)();
                obsNum = Rx.Observable.fromCallback(func0, obsStr)();
                obsNum = Rx.Observable.fromCallback(func0, obsStr, (results) => results[0])();
                var func1;
                obsNum = Rx.Observable.fromCallback(func1)("");
                obsNum = Rx.Observable.fromCallback(func1, {})("");
                obsNum = Rx.Observable.fromCallback(func1, {}, (results) => results[0])("");
                var func2;
                obsStr = Rx.Observable.fromCallback(func2)(1, "");
                obsStr = Rx.Observable.fromCallback(func2, {})(1, "");
                obsStr = Rx.Observable.fromCallback(func2, {}, (results) => results[0])(1, "");
                var func3;
                obsStr = Rx.Observable.fromCallback(func3)(1, "", true);
                obsStr = Rx.Observable.fromCallback(func3, {})(1, "", true);
                obsStr = Rx.Observable.fromCallback(func3, {}, (results) => results[0])(1, "", true);
                var func0m;
                obsNum = Rx.Observable.fromCallback(func0m, obsStr, (results) => results[0])();
                var func1m;
                obsNum = Rx.Observable.fromCallback(func1m, obsStr, (results) => results[0])("");
                var func2m;
                obsStr = Rx.Observable.fromCallback(func2m, obsStr, (results) => results[0])("", 10);
            }
            function toPromise() {
                var promiseImpl;
                Rx.config.Promise = promiseImpl;
                var p = obsNum.toPromise(promiseImpl);
                p = obsNum.toPromise();
                p = p.then(x => x);
                p = p.then(x => p);
                p = p.then(undefined, reason => 10);
                p = p.then(undefined, reason => p);
                var ps = p.then(undefined, reason => "error");
                ps = p.then(x => "");
                ps = p.then(x => ps);
            }
            function startAsync() {
                var o = Rx.Observable.startAsync(() => null);
            }
        })(Async = Tests.Async || (Tests.Async = {}));
    })(Tests = Rx.Tests || (Rx.Tests = {}));
})(Rx || (Rx = {}));
//# sourceMappingURL=rx.async-tests.js.map