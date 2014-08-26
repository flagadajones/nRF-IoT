#include <Narcoleptic.h>
#include <avr/wdt.h>
#include <DHT.h>

#include <SPI.h>

#include "nRF24L01.h"
#include "RF24.h"

#define DHTTYPE DHT22

//#define MYDEVMODE 1

RF24 radio(8, 7);

const long long       // Use pipe + 1 for nodes, pipe + 2 for relays
RELAYBROADCAST  = 0xAA00000000LL,
NODEACK         = 0xCC00000000LL;

struct SENSOR {
  short temp;
  short hygro;
  short voltage;
};

struct HEADER {
  byte type;
  byte hops;
  byte src[8];
  short ID;
  SENSOR sensor;
};

HEADER header;

byte retries = 0;                 // How many times have we tried to rx
#define MAX_RETRIES  5       // How many times will we try?

//short myID;
short packetID;
//OneWire ds(10);
#define DHT_POWER_PIN  9       // How many times will we try?
#define DHT_DATA_PIN  10       // How many times will we try?

DHT dht(DHT_DATA_PIN, DHTTYPE);

//byte myID[8];
byte data[2];
void setup(void) {
#if defined(MYDEVMODE)
  Serial.begin(57600);

#endif
  randomSeed(analogRead(0));
  pinMode(DHT_POWER_PIN, OUTPUT);

  setupTemp();
  setupRadio();
  header.src[0] = 'e';
  header.src[1] = 'x';
  header.src[2] = 't';
  header.src[3] = 'e';
  header.src[4] = 'r';
  header.src[5] = 'i';
  header.src[6] = 'e';
  header.src[7] = 'u';

}
void setupRadio() {
  packetID = 0;
  radio.begin();
  radio.setRetries(15, 15);
  radio.setCRCLength(RF24_CRC_8);
  radio.setDataRate( RF24_250KBPS );
  radio.setChannel(0x25);
  radio.enableDynamicPayloads();

#if defined(MYDEVMODE)
  Serial.println(F("node starting..."));
#endif
  radio.openReadingPipe(1 , NODEACK + 1); // Read the 'node' pipe

  //myID = random(1, 0xffff);      // Identify this packet
}

void setupTemp() {
  digitalWrite(DHT_POWER_PIN, HIGH);
  delay(50);
  dht.begin();
  digitalWrite(DHT_POWER_PIN, LOW);

};
const long InternalReferenceVoltage = 1100;  // Adjust this value to your board's specific internal BG voltage

long readVcc() {
  ADMUX = _BV(MUX5) | _BV(MUX0);

  delay(2); // Wait for Vref to settle
  ADCSRA |= _BV(ADSC); // Start conversion
  while (bit_is_set(ADCSRA, ADSC)); // measuring

  uint8_t low  = ADCL; // must read ADCL first - it then locks ADCH
  uint8_t high = ADCH; // unlocks both

  long result = (high << 8) | low;

  result = 1125300L / result; // Calculate Vcc (in mV); 1125300 = 1.1*1023*1000
  return result; // Vcc in millivolts
}
void getTemp() {
  //  pinMode(DHT_POWER_PIN,OUTPUT);
  digitalWrite(DHT_POWER_PIN, HIGH);
  Narcoleptic.sleep(WDTO_2S);


  header.sensor.temp = (dht.readTemperature() * 100); // Lecture de la température
  header.sensor.hygro = (dht.readHumidity() * 100); // Lecture de l'hygrométrie

  // delay(20);
  digitalWrite(DHT_POWER_PIN, LOW);
  // pinMode(DHT_POWER_PIN,INPUT);

  // Calcul de la température en degré Celsius
};

void loop(void) {

  getTemp();
  header.sensor.voltage = readVcc();

#if defined(MYDEVMODE)

  Serial.println(header.sensor.voltage);
  Serial.print(header.sensor.temp);
#endif
  radio.powerUp();
  if (packetID < 32000) // Identify this packet
    packetID++;
  else
    packetID = 1;

  xmit(packetID, 1);            // Send some data

  wait(MAX_RETRIES, packetID);        // Wait for it to be acknowledged
  radio.powerDown();
  //Serial.println("emit");
  //byte i=2;
  //  while(i-->0){
  //    Narcoleptic.delay(8000);              // Pause before repeating
  //}
  short i = 37;
  while (i > 0) {
    Narcoleptic.sleep(WDTO_8S);
    i--;
  }
  //Narcoleptic.delay(300000L);
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
#if defined(MYDEVMODE)

  else {

    nak(packetID);
  }
#endif

}

// Signal a NAK
#if defined(MYDEVMODE)
void nak(long packetID) {


  Serial.print(F("NACK:      ")); Serial.println(packetID, HEX);

}
#endif

// Signal an ACK
void ack(bool reply, long packetID) {

  if (reply) {

    long src;      //ack returns just the header.ID, so check what was returned with what was sent
    radio.read( &src, radio.getDynamicPayloadSize() );
#if defined(MYDEVMODE)

    if (src == packetID) {
      Serial.print(F("ACK:            ")); Serial.println(src, HEX);
    }
#endif
    //     else {	// Display packets destined for nodes other than us
    // 	    Serial.print(src, HEX);Serial.print(" = "); Serial.println(myID, HEX);
    //     }
  }
#if defined(MYDEVMODE)

  else {
    Serial.println(F("NOT AVAILABLE"));
  }
#endif
}

// Send some data to the base
void xmit(long packetID, byte pipe_id) {


  header.ID = packetID;
  header.type = 4;
  header.hops = 0;
  //header.src = myID;

  //header.sensor.temp = 18.8;
#if defined(MYDEVMODE)

  Serial.print(F("XMIT: ")); Serial.println(header.ID, HEX);
#endif
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
#if defined(MYDEVMODE)

  Serial.print(ok ? F("SENT            ") : F("FAILED TO SEND  "));	// Seems to fail to transmit often
  Serial.println(header.ID, HEX);
#endif
  radio.startListening();

  return ok;
}
