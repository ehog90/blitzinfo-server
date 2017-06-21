function testPausable() {
    var o;
    var pauser = new Rx.Subject();
    var p = o.pausable(pauser);
    p = o.pausableBuffered(pauser);
}
function testControlled() {
    var o;
    var c = o.controlled();
    var d = c.request();
    d = c.request(5);
}
//# sourceMappingURL=rx.backpressure-tests.js.map