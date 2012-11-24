
function geta(x) {
    return x & 0xffff;
}
function getb(x) {
    return x >> 16;
}
function makec(a, b) {
    return a | (b << 16)
}

function testBox() {

    var start = Date.now()    
    map1 = []
    map1[0] = 1
    for (var i = 0; i < 5000000; ++i) {
        k = i % 30000
        map1[i] = k * k + map1[Math.floor(i / 2)] + 1;
    }
    var el = Date.now()-start
    console.log('Operations without boxing: ', el);


    start = Date.now()
    map2 = []
    map2[0] = { num: 1, n2:2 }
    for (var i = 0; i < 5000000; ++i) {
        k = i % 30000
        map2[i] = { num: k * k, n2: k+2 + map2[Math.floor(i / 2)].n2 + 1};
    }
    el = Date.now() - start
    console.log('Operations with boxing: ', el);

    var start = Date.now()
    map4 = []
    map4[0] = makec(1, 2)
    for (var i = 0; i < 5000000; ++i) {
        k = i % 30000
        map4[i] = makec(k * k, k + 2 + getb(map4[Math.floor(i / 2)]) + 1);
    }
    var el = Date.now() - start
    console.log('Operations with shifts: ', el);

    var start = Date.now()
    map5 = new Uint32Array()
    map5[0] = makec(1, 2)
    for (var i = 0; i < 5000000; ++i) {
        k = i % 30000
        map5[i] = makec(k * k, k + 2 + getb(map5[Math.floor(i / 2)]) + 1);
    }
    var el = Date.now() - start
    console.log('Operations with shifts in arrays: ', el);
    console.log('x')

    /*
    start = Date.now()
    map31 = []
    map32 = []
    map31[0] = 1
    map32[0] = 2
    for (var i = 0; i < 5000000; ++i) {
    map31[i] = i * i
    map32[i] += i+2 + map32[Math.round(i / 2)] + 1;
    }
    el = Date.now() - start
    console.log('Operations with dblmap: ', el);
    */
}


function webGLStart() {
    testBox()
    testBox()
    testBox()
    return;
}