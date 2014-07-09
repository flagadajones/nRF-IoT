'use strict';

//var b = require('bonescript');
var nrf = require('./RF24');

console.log(nrf.getMaxTimeout());
console.log(nrf.getRetries());
console.log(nrf.setRetries(15,15));
console.log(nrf.disableCRC());
console.log(nrf.getCRCLength());
console.log(nrf.setCRCLength(1));
console.log(nrf.getDataRate());
console.log(nrf.setDataRate(1));
console.log(nrf.getPALevel());
console.log(nrf.setPALevel(1));
console.log(nrf.testCarrier());
console.log(nrf.testRPD());
console.log(nrf.setAutoAck(1,1));
console.log(nrf.setAutoAck(1));
console.log(nrf.isAckPayloadAvailable());
console.log(nrf.enableAckPayload());
console.log(nrf.enableDynamicPayloads());