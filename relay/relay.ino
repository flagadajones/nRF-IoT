#include <SPI.h>
#include "nRF24L01.h"
#include "RF24.h"

RF24 radio(9, 10);

#define BASEBROADCAST(x) (0xBB00000000LL + x)
#define RELAYBROADCAST(x) (0xAA00000000LL + x)
#define NODEACK(x) (0xCC00000000LL + x)

struct SENSOR {
  float temp;
  float humidity;
  float pressure;
};

struct HEADER {
  byte type;//1
  byte hops;//1
  byte src[8];//2
  short ID;//2
  byte sensor[26];//=32 - le reste=
};
HEADER header;

long cnt[10] = {};    //array used to store the last 10 header.IDs
byte cntID = 0;       //counter for header.ID array

bool DupID(long id) {
  //this function keeps the last 10 header.IDs, then searches through them all
  //when cntID reaches 10, it rolls over to 0 again
  //if a match is found, it returns true, falst otherwise
  bool found = false;
  for (int i = 0; i < 10; i++)
    if (cnt [i] == id) {
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

void setup(void) {
  Serial.begin(57600);
  randomSeed(analogRead(0));                        //here just for the testing bit on the bottom
  //setup radio
  radio.begin();
  radio.setRetries( 15, 15 );
  radio.enableDynamicPayloads();
  radio.setCRCLength(RF24_CRC_8);
  radio.setDataRate( RF24_250KBPS );
  radio.setChannel(0x25);
  radio.openReadingPipe( 1, RELAYBROADCAST(2) );    //relays send on this
  radio.openReadingPipe( 2, RELAYBROADCAST(1) );    //Nodes send on this
  radio.printDetails();
  radio.startListening();

  Serial.println("relay starting...");

}

void loop(void) {
  //check to see if we have anything available
  if ( radio.available() ) {
    bool done = false;
    int sizePayload = 0;
    while (!done) {
      //read whatever is available
      sizePayload = radio.getDynamicPayloadSize();
      done = radio.read( &header, sizePayload );
      Serial.print( "Got message from 0x" ); /*Serial.print( header.src, HEX );*/ Serial.print( " ID:" ); Serial.print( header.ID, HEX ); Serial.print( " Hops: " ); Serial.println(header.hops);
    }
    radio.stopListening();
    delay(20);    //wait a bit for node to switch to receiver
   
    radio.openWritingPipe( NODEACK(1) );
    bool ok1=radio.write( &header.ID, sizeof(header.ID), true );    //send out ack with the id of our received message
     Serial.print(ok1 ? F("SENT            ") : F("FAILED TO SEND  "));	// Seems to fail to transmit often
  Serial.println(header.ID, HEX);

    radio.startListening();
    //this could be an original node broadcast or it could be another relay's tx.
    //they both get forwarded, DupID is used to stay out of an infinite loops of relays sending relays sending relays...
    //so far remembering the last ten has worked. this might not work on a larger scale. Needs more testing.

    if (!DupID(header.ID)) {
      radio.stopListening();
      //send this on to the base
      radio.openWritingPipe( BASEBROADCAST(1) );
      bool ok = radio.write( &header, sizePayload, true );
    Serial.print(ok ? F("BASE SENT            ") : F("BASE FAILED TO SEND  "));	// Seems to fail to transmit often
  Serial.println(header.ID, HEX);

      //and broadcast this to the other relays incase this relay cant reach the base
      header.hops++;    //only count relay hops, not passing from relay to base
      radio.openWritingPipe( RELAYBROADCAST(2) );
      radio.write( &header, sizePayload, true );
      radio.startListening();
    }
  }
  delay(100);


}
