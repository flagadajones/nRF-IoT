#include <OneWire.h>
#include <SPI.h>
#include "nRF24L01.h"
#include "RF24.h"

RF24 radio(9, 10);

const long long       // Use pipe + 1 for nodes, pipe + 2 for relays
RELAYBROADCAST  = 0xAA00000000LL,
NODEACK         = 0xCC00000000LL;

struct SENSOR {
  short temp;
  short voltage;
};

struct HEADER {
  byte type;
  long hops;
  byte src[8];
  short ID;
  SENSOR sensor;
};

HEADER header;

byte retries = 0;                 // How many times have we tried to rx
const byte MAX_RETRIES = 5;       // How many times will we try?

//short myID;
short packetID;
OneWire ds(7);

//byte myID[8];
byte data[2];
void setup(void) {

  Serial.begin(57600);
  randomSeed(analogRead(0));

  setupTemp();
  setupRadio();

}
void setupRadio() {
  packetID = 0;
  radio.begin();
  radio.setRetries(15, 15);
  radio.setCRCLength(RF24_CRC_8);
  radio.setDataRate( RF24_250KBPS );
 radio.setChannel(0x25);
  radio.enableDynamicPayloads();
  Serial.println(F("node starting..."));

  radio.openReadingPipe(1 , NODEACK + 1); // Read the 'node' pipe

  //myID = random(1, 0xffff);      // Identify this packet
}

void setupTemp() {
  ds.search(header.src);

  ds.reset();
  ds.select(header.src);
  ds.write(0x4E, 1);  //set resolution to 10 bits
  ds.write(0x00, 1);
  ds.write(0x00, 1);
  ds.write(0x3F, 1);

for(int i=0;i<8;i++){
Serial.print(header.src[i],HEX);
Serial.print(" ");
}
Serial.println();
};
const long InternalReferenceVoltage = 1100;  // Adjust this value to your board's specific internal BG voltage

int getBandgap ()
{
  // REFS0 : Selects AVcc external reference
  // MUX3 MUX2 MUX1 : Selects 1.1V (VBG)
  ADMUX = _BV (REFS0) | _BV (MUX3) | _BV (MUX2) | _BV (MUX1);
  ADCSRA |= _BV( ADSC );  // start conversion
  while (ADCSRA & _BV (ADSC))
  { }  // wait for conversion to complete
  int results = (((InternalReferenceVoltage * 1024) / ADC) + 5) / 10;
  return results;
}

short getTemp() {
  
  ds.reset();
  ds.select(header.src);
  ds.write(0x44, 1); //start convertion
  delay(188); //188ms en10 bits

  ds.reset();
  ds.select(header.src);
  ds.write(0xBE); // Read Scratchpad

  for ( int i = 0; i < 2; i++) {           // we need 9 bytes
    data[i] = ds.read();
  }
  // Calcul de la température en degré Celsius
  return (((data[1] << 8) | data[0]) * 0.0625) * 100;
};

void loop(void) {
  
  header.sensor.temp = getTemp();
  header.sensor.voltage = getBandgap();
  Serial.println(header.sensor.voltage);
  Serial.print(header.sensor.temp);
 
  if (packetID < 32000) // Identify this packet
    packetID++;
  else
    packetID = 1;

  xmit(packetID, 1);            // Send some data

  wait(MAX_RETRIES, packetID);        // Wait for it to be acknowledged

delay(300000);              // Pause before repeating

}

// Get Ack from relay or timeout
void wait(byte retries, short packetID) {

  bool reply;

  do {

    unsigned long started_waiting_at = millis();

    while (millis() - started_waiting_at < 250) {
      // Wait here until we get a response, or timeout (250ms)

      if (reply = radio.available()) break;
      delay(10);
    }

    retries--;

  } while (retries > 0 && !reply);


  if (reply) {

    ack(reply, packetID);
  }
  else {

    nak(packetID);
  }
}

// Signal a NAK
void nak(long packetID) {

  Serial.print(F("NACK:      ")); Serial.println(packetID, HEX);

}

// Signal an ACK
void ack(bool reply, long packetID) {

  if (reply) {

    long src;      //ack returns just the header.ID, so check what was returned with what was sent
    radio.read( &src, radio.getDynamicPayloadSize() );

    if (src == packetID) {
      Serial.print(F("ACK:            ")); Serial.println(src, HEX);
    }
    //     else {	// Display packets destined for nodes other than us
    // 	    Serial.print(src, HEX);Serial.print(" = "); Serial.println(myID, HEX);
    //     }
  }
  else {
    Serial.println(F("NOT AVAILABLE"));
  }
}

// Send some data to the base
void xmit(long packetID, byte pipe_id) {


  header.ID = packetID;
  header.type = 3;
  header.hops = 0;
  //header.src = myID;

  //header.sensor.temp = 18.8;

  Serial.print(F("XMIT: ")); Serial.println(header.ID, HEX);

  byte retries = 5;
  bool ok;

  do {
    ok = relay(header, pipe_id);           // Send using the 'node' pipe
  } while (!ok && --retries > 0);

}

// Send packet to any relay that can hear this node
bool relay(struct HEADER header, byte pipe_id) {

  radio.stopListening();
  delay(50);
  radio.openWritingPipe(RELAYBROADCAST + pipe_id);
  delay(50);
 
  bool ok = radio.write( &header, sizeof(header), true );

  Serial.print(ok ? F("SENT            ") : F("FAILED TO SEND  "));	// Seems to fail to transmit often
  Serial.println(header.ID, HEX);

  radio.startListening();

  return ok;
}
