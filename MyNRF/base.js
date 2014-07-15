var nrf = require('./RF24.js');
var Q = require('q');
var asap = require('asap');
nrf.RF24('/dev/spidev1.0','P9_16', 'P9_17');

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
  asap(loop);

  // The promise
  return done.promise;
};


var cnt = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; //array used to store the last 10 header.IDs
var cntID = 0; //counter for header.ID array

function DupID(id) {
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
  }
  else {
    cntID = 0;
    cnt[cntID] = id;
  }
  cntID++;
  return found;
}

function setup() {

  nrf.begin();
  //setup radio
  Q().then(function() {
    var deferred = Q.defer();
    console.log("retries");
    nrf.setRetries(15, 15);
   nrf.setCRCLength(1,function(){});
    //        nrf.printDetails();
    console.log("dynamic");
    nrf.enableDynamicPayloads(deferred.makeNodeResolver());

    return deferred.promise;
  }).then(function() {
    var deferred = Q.defer();
    console.log("openPipe");
    nrf.openReadingPipe(1, BASEBROADCAST(1), deferred.makeNodeResolver()); //Nodes send on this

    return deferred.promise;
  }).then(function() {
    var deferred = Q.defer();
    console.log("openWrite");
    nrf.openWritingPipe(BASEBROADCAST(2));
    console.log("startLMisten");
    nrf.startListening(deferred.makeNodeResolver());

    return deferred.promise;
  }).then(function() {
    var deferred = Q.defer();

    console.log("base starting...");
    nrf.printDetails();
    deferred.resolve();
    return deferred.promise;
  }).then(function() {
    loop();
  }).
  catch (function(error) {
    console.log("errorsetup");
    console.log(error);
  }).done();


  /*
nrf.getChannel(function(result){
  console.log("channel");
  console.log(result);
  
});
 nrf.setRetries(15, 15);
 nrf.getRetries(function(result){
  console.log("retries");
  console.log(result);
  
});

nrf.print_address_register("test",[0x0A,0x0B],function(result){
  console.log(result);
  
})
*/
}

function loop() {
  //check to see if we have anything available
  promiseWhile(function() {
    return true;
  }, function() {
//    console.log("loop");
    var deferredTop = Q.defer();

    Q().then(function() {
      var deferred = Q.defer();
 //     console.log("available?");
      nrf.available(deferred.makeNodeResolver())

      return deferred.promise;
    }).then(function(available) {
      var deferred = Q.defer();
    
      if (available) {
  //      console.log("available");
        nrf.getDynamicPayloadSize(deferred.makeNodeResolver());
      
      }
      else {
   //     console.log("not available");
        deferredTop.resolve(Q.delay(10));
        deferred.reject("rien a faire");
      }
      return deferred.promise;
    }).then(function(payloadSize) {
//      console.log("payload "+payloadSize);
      var deferred = Q.defer();
      
      nrf.read(payloadSize,deferred.makeNodeResolver());
      return deferred.promise;
    }).then(function(result) {
      var res=convert(result.buf);
      //console.log(res);
//      console.log("from 0x"+res.src.toString(16)+" ID:"+res.ID.toString(16)+" hops: "+res.hops);
      console.log(res.type+" "+res.hops+" "+res.src.toString(16)+" "+res.ID.toString(16)+" "+res.sensor.temp+" "+res.sensor.humidity+" "+res.sensor.pressure);

      deferredTop.resolve(Q.delay(1000));
    }).
    catch (function(error) {
//      console.log("error loop");
      console.log(error);
    }).done();


    //     return Q.delay(10);

    return deferredTop.promise;
  });



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
//loop();