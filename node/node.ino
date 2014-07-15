#include <SPI.h>
#include "nRF24L01.h"
#include "RF24.h"
#include <EEPROM.h>
#include "EEPROMAnything.h"

RF24 radio(9,10);

const long long       // Use pipe + 1 for nodes, pipe + 2 for relays
  RELAYBROADCAST  = 0xAA00000000LL,
  NODEACK         = 0xCC00000000LL;

struct SENSOR{
  int temp;   //12.6°C => 1260
  int humidity;
  int pressure;
};

struct HEADER{
  byte type;
  byte cmd;
  long src;
  long ID;
  SENSOR sensor;
};
 
  byte retries = 0;                 // How many times have we tried to rx
  const byte MAX_RETRIES = 5;       // How many times will we try?
  
  
  long myID;
  bool isInit;
// change this to any new value to re-init EEPROM state
#define SCHEMA 0x37
#define EEPROM_SCHEMA_BYTE 0
#define EEPROM_INIT_BYTE 1
#define EEPROM_ADDR_BYTE 2
// EEPROM values :
// [0]  : schema Id;
// [1]  : 0 = not Initialized ; 1 = Initialized
// [2-5]: node address


#define CMD_ASK_ADDRESS 0xAA // 10101010

void reinitialize()
{
     for (i = 6; i < 20; i++){
	 EEPROM_writeAnything(i,0xFF);
	 }
	 EEPROM_writeAnything(EEPROM_INIT_BYTE,0x00);
	long aleatAddress = random(1, 0xffff);
	EEPROM_writeAnything(EEPROM_ADDR_BYTE,aleatAddress);
	 
}

void setup(void){
	
	Serial.begin(57600);
	randomSeed(analogRead(0));
	//EEPROM initialization 
	byte schema;
    EEPROM_readAnything(EEPROM_SCHEMA_BYTE, schema);
    if (schema != SCHEMA) {
	Serial.println("EEPROM initialization");
        reinitialize();
        schema = SCHEMA;
        EEPROM_writeAnything(EEPROM_SCHEMA_BYTE, schema);
    }	
  
	//EEPROM Read for Init
    EEPROM_readAnything(EEPROM_INIT_BYTE, isInit);
	EEPROM_readAnything(EEPROM_ADDR_BYTE, myID);
  
	//Radio Init
	radio.begin();
	radio.setRetries(15,15);
	radio.enableDynamicPayloads();

    radio.openReadingPipe(1 ,NODEACK + 1);  // Read the 'node' pipe
	Serial.println(F("node starting..."));
	if(!isInit){
		Serial.println("Not Init, ask and Address");
		// not init send Command ASK ADDRESS
		sendCMD(CMD_ASK_ADDRESS);
    }
 }

void loop(void){
 
 if(isInit){
	
	long  packetID = random(1, 0xffff);      // Identify this packet
	xmit(packetID, 1);            // Send some data
   
	wait(MAX_RETRIES, packetID);        // Wait for it to be acknowledged
  
	delay(3000);              // Pause before repeating
              // If serial port connected send some more data (for what purpose?)
  }else{
  
  }
}

// Get Ack from relay or timeout
void wait(byte retries, long packetID) {
  
	bool reply;
	
	do {
		
 		unsigned long started_waiting_at = millis();
  
	  while (millis() - started_waiting_at < 250) {
	    // Wait here until we get a response, or timeout (250ms)
	    
	    if (reply = radio.available()) break;
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
// 	    Serial.print(src, HEX);Serial.print(" = "); Serial.println(packetID, HEX);
//     }
  }
  else {
	  Serial.println(F("NOT AVAILABLE"));
  }
}



// Send some data to the base
void xmit(long packetID, byte pipe_id) {

  HEADER header;
  
  header.ID = packetID;
  header.type = 3;
  header.hops = 0;
  header.src = 0xabcd;
  
  header.sensor.temp = 1880;
  header.sensor.humidity = 1880;
  header.sensor.pressure = 1880;

  Serial.print(F("XMIT: "));Serial.println(header.ID, HEX);

  byte retries = 5;
  bool ok;
  
  do {
	  ok = relay(header, pipe_id);           // Send using the 'node' pipe
  } while (!ok && --retries > 0);
  
}

// Send packet to any relay that can hear this node
bool relay(struct HEADER header, byte pipe_id) {

  radio.stopListening();
  radio.openWritingPipe(RELAYBROADCAST + pipe_id);
  bool ok = radio.write( &header, sizeof(header), true );
  
  Serial.print(ok ? F("SENT            ") : F("FAILED TO SEND  "));	// Seems to fail to transmit often
  Serial.println(header.ID, HEX);

  radio.startListening();
  
  return ok;
}
