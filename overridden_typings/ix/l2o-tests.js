var ec_ns = (a, b) => a.toString() == b;
var ec_nn = (a, b) => a === b;
var c_nn = (a, b) => a - b;
var ax = Ix.Enumerable.fromArray([0, 2, 7, 3, 4, 5]);
var bx = Ix.Enumerable.create(() => {
    var current = ".";
    return Ix.Enumerator.create(() => { current += "."; return true; }, () => current, () => { });
});
Ix.Enumerator.create(() => true, () => 1);
var cx = Ix.Enumerable.empty();
var dx = Ix.Enumerable.concat(ax, cx);
var ex = Ix.Enumerable.return(42);
var fx = Ix.Enumerable.returnValue("42");
var gx = Ix.Enumerable.range(-100, 200);
Ix.Enumerable.repeat(42, 42);
Ix.Enumerable.repeat(42);
Ix.Enumerable.sequenceEqual(ax, fx, ec_ns);
Ix.Enumerable.sequenceEqual(ax, ex);
ax.getEnumerator();
ax.aggregate("", (acc, i) => acc + i, acc => acc.length);
ax.aggregate("", (acc, i) => acc + i);
ax.aggregate((acc, i) => acc + i);
ax.reduce((acc, i) => acc + i, 100);
ax.reduce((acc, i) => acc + i);
ax.all(item => true);
ax.all(item => true, bx);
ax.every(item => true);
ax.every(item => true, bx);
ax.any();
ax.any(item => true);
ax.any(item => true, bx);
ax.some();
ax.some(item => true);
ax.some(item => true, bx);
ax.average();
bx.average(item => item.length);
ax.min();
bx.min(item => item.length);
ax.max();
bx.max(item => item.length);
ax.sum();
bx.sum(item => item.length);
ax.concat(ax, cx, dx, ex, gx);
ax.contains(10);
ax.contains("10", ec_ns);
ax.count();
ax.count(item => false);
ax.count(item => false, {});
cx.defaultIfEmpty();
cx.defaultIfEmpty(10);
dx.distinct();
dx.distinct((d1, d2) => d1 === d2);
ax.elementAt(2);
ax.elementAtOrDefault(2);
ax.except(bx, ec_ns);
bx.except(fx);
ax.first();
ax.firstOrDefault();
ax.last();
ax.lastOrDefault();
ax.single();
ax.singleOrDefault();
ax.forEach(a => console.log(a));
ax.forEach(a => console.log(a), cx);
bx.groupBy(b => b.length);
bx.groupBy(b => b.length, b => "[" + b + "]");
bx.groupBy(b => b.length, b => "[" + b + "]", (l, values) => l + values.count());
bx.groupBy(b => b.length, false, (l, values) => l + values.count());
bx.groupBy(b => b.length, b => "[" + b + "]", (l, values) => l + values.count(), ec_nn);
bx.groupBy(b => b.length, b => "[" + b + "]", false, (x, y) => x == y);
bx.groupBy(b => b.length, false, (l, values) => l + values.count(), ec_nn);
bx.groupBy(b => b.length, false, false, ec_nn);
ax.groupJoin(bx, a => a, b => b, (a, b) => [a, b], ec_ns);
ax.groupJoin(bx, a => a, b => b.length, (a, b) => [a, b]);
ax.join(bx, a => a, b => b, (a, b) => [a, b], ec_ns);
ax.join(bx, a => a, b => b.length, (a, b) => [a, b]);
ax.intersect(bx, ec_ns);
ax.intersect(cx);
ax.union(cx);
ax.orderBy(a => -a).thenBy(a => a);
ax.orderBy(a => -a, c_nn).thenBy(a => a, c_nn);
ax.orderByDescending(a => -a).thenByDescending(a => a);
ax.orderByDescending(a => -a, c_nn).thenByDescending(a => a, c_nn);
ax.reverse();
ax.select(a => a.toString());
ax.select(a => a.toString(), {});
ax.map(a => a.toString());
ax.map(a => a.toString(), {});
ax.selectMany(a => bx);
ax.selectMany(a => bx, (a, b) => [a, b]);
ax.sequenceEqual(fx, ec_ns);
ax.sequenceEqual(ax, ec_nn);
ax.sequenceEqual(cx);
ax.skip(10);
ax.skipWhile(a => a > 10);
ax.take(10);
ax.takeWhile(a => a > 10);
ax.toArray();
bx.toDictionary(b => b.length, b => 10, ec_nn);
bx.toDictionary(b => b.length, false, ec_nn);
bx.toDictionary(b => b.length, b => 10);
bx.toDictionary(b => b.length);
bx.toLookup(b => b.length, b => 10, ec_nn);
bx.toLookup(b => b.length, false, ec_nn);
bx.toLookup(b => b.length, b => 10);
bx.toLookup(b => b.length);
ax.where(a => a > 10, {});
ax.where(a => a > 10);
ax.filter(a => a > 10, {});
ax.filter(a => a > 10);
ax.zip(bx, (a, b) => [a, b]);
ax.zip(bx, (a, b) => [a, b]);
{
    var d;
    d.dispose();
}
{
    var e;
    try {
        while (e.moveNext()) {
            var c = e.getCurrent();
        }
    }
    finally {
        e.dispose();
    }
}
{
    var dic = new Ix.Dictionary(0, ec_nn);
    var key = dic.toEnumerable().first().key;
    var value = dic.toEnumerable().first().value;
    dic.add(1, "1");
    dic.remove(1);
    dic.clear();
    dic.length();
    dic.tryGetValue(1);
    dic.get(1);
    dic.set(1, "1");
    dic.getValues();
    dic.has(1);
}
{
    var kv;
    var key = kv.key;
    var value = kv.value;
}
{
    var lookup;
    var key = lookup.toEnumerable().first().key;
    lookup.toEnumerable().first().first();
    lookup.has(1);
    lookup.length();
    lookup.get(1).first();
}
//# sourceMappingURL=l2o-tests.js.map