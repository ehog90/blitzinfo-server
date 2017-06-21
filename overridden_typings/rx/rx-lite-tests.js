function test_scan() {
    const source1 = Rx.Observable.range(1, 3)
        .scan((acc, x, i, source) => acc + x);
    const source2 = Rx.Observable.range(1, 3)
        .scan((acc, x, i, source) => acc + x, '...');
    var source = Rx.Observable.range(0, 3)
        .map(function (x) { return Rx.Observable.range(x, 3); })
        .concatAll();
    var subscription = source.subscribe(function (x) {
        console.log('Next: %s', x);
    }, function (err) {
        console.log('Error: %s', err);
    }, function () {
        console.log('Completed');
    });
    var source = Rx.Observable.range(0, 3)
        .map(function (x) { return Rx.Observable.range(x, 3); })
        .mergeAll();
    var subscription = source.subscribe(function (x) {
        console.log('Next: %s', x);
    }, function (err) {
        console.log('Error: %s', err);
    }, function () {
        console.log('Completed');
    });
}
//# sourceMappingURL=rx-lite-tests.js.map