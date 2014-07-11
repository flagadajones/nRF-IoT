var nrf = require('./RF24.js');
var Q = require('q');
RF24 = nrf.RF24('/dev/spidev1.0', 'P9_16', 'P9_17');

function BASEBROADCAST(x) {
    var buf = new Buffer(5);
    buf[0] = 0xBB;
    buf[1] = 0x00;
    buf[2] = 0x00;
    buf[3] = 0x00;
    buf[4] = x;
    return buf;
}

function RELAYBROADCAST(x) {
    var buf = new Buffer(5);
    buf[0] = 0xAA;
    buf[1] = 0x00;
    buf[2] = 0x00;
    buf[3] = 0x00;
    buf[4] = x;
    return buf;
}

function promiseWhile(condition, body) {
    var done = Q.defer();

    function loop() {
        // When the result of calling `condition` is no longer true, we are
        // done.
        if (!condition()) return done.resolve();
        // Use `when`, in case `body` does not return a promise.
        // When it completes loop again otherwise, if it fails, reject the
        // done promise
        Q.when(body(), loop, done.reject);
    }

    // Start running the loop in the next tick so that this function is
    // completely async. It would be unexpected if `body` was called
    // synchronously the first time.
    Q.nextTick(loop);

    // The promise
    return done.promise;
};


var cnt = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; //array used to store the last 10 header.IDs
var cntID = 0; //counter for header.ID array

function DupID(var id) {
    //this function keeps the last 10 header.IDs, then searches through them all
    //when cntID reaches 10, it rolls over to 0 again
    //if a match is found, it returns true, falst otherwise
    var found = false;
    for (i = 0; i < 10; i++)
        if (cnt[i] == id) {
            found = true;
            break;
        }
    if (cntID < 10) {
        cnt[cntID] = id;
    } else {
        cntID = 0;
        cnt[cntID] = id;
    }
    cntID++;
    return found;
}

function setup() {

    RF24.begin();
    //setup radio
    Q().then(function () {
        var deferred = Q.defer();

        RF24.setRetries(15, 15);
        RF24.enableDynamicPayloads(deferred.makeNodeResolver());

        return deferred.promise;
    }).then(function () {
        var deferred = Q.defer();

        RF24.openReadingPipe(1, BASEBROADCAST(1), deferred.makeNodeResolver()); //Nodes send on this

        return deferred.promise;
    }).then(function () {
        var deferred = Q.defer();

        RF24.openWritingPipe(BASEBROADCAST(2));
        RF24.startListening(deferred.makeNodeResolver());

        return deferred.promise;
    }).then(function () {
        var deferred = Q.defer();

        console.log("base starting...");
        RF24.printDetails()
        deferred.resolve();
        return deferred.promise;
    })


}

function loop() {
    //check to see if we have anything available
    promiseWhile(function () {
        return true;
    }, function () {
        var deferredTop = Q.defer();
        Q().then(function () {
            var deferred = Q.defer();
            radio.available(deferred.makeNodeResolver())

            return deferred.promise;
        }).then(function (available) {
            if (available) {
                var deferredTop = Q.defer();
                RF24.getDynamicPayloadSize(deferred.makeNodeResolver());

                return deferred.promise;
            } else {
                //voir comment stopper;
                deferredTop.resolve(Q.delay(1000));
                return defered.reject;
            }
        }).then(function (payloadSize) {
            var deferredTop = Q.defer();
            var buf = new Buffer(payloadSize);
            RF24.read(deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function (done, buffer) {
            console.log(done);
            console.log(buffer);
            console.log(convert(buffer));
            deferredTop.resolve(Q.delay(1000));
        });

        //     return Q.delay(10);

        return deferredTop.promise;
    });

})

}
/*
struct SENSOR{
  float temp;     => 4 bytes
  float humidity; => 4 bytes
  float pressure; => 4 bytes
};

struct HEADER{
  long type;   => 4 bytes
  long hops;   => 4 bytes
  long src;    => 4 bytes
  long ID;     => 4 bytes
  SENSOR sensor;
};
*/

function convert(buffer) {
    var result = {};
    result.type = buffer.readInt32LE(0);
    result.hops = buffer.readInt32LE(4);
    result.src = buffer.readInt32LE(8);
    result.ID = buffer.readInt32LE(12);
    result.sensor = {};
    result.sensor.temp = buffer.readFloatLE(16);
    result.sensor.humidity = buffer.readFloatLE(20);
    result.sensor.pressure = buffer.readFloatLE(24);

    return result;
}

setup();
loop();