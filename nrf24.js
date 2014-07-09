"use strict";
/*
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 * 
 * Python port of Maniacbug NRF24L01 library Author: Joao Paulo Barraca
 * <jpbarraca@gmail.com>
 * 
 * BeagleBoneBlack and Raspberry Pi use different GPIO access methods. Select
 * the most appropriate for you by uncommenting one of the two imports. For
 * Raspberry Pi import Ras.GPIO as GPIO For BBBB import Adafruit_BBIO.GPIO as
 * GPIO
 * 
 * import spidev import time import sys
 */
var consts = require('./consts');
var b = require('bonescript');

var nrf24 = {};

var SPI = require('spi');

function _BV(x) {
    return 1 << x;
}


nrf24.init = function () {
    this.ce_pin = "P9_15";
    this.irq_pin = "P9_16";
    this.csn_pin="FIXME";
    this.channel = 76;
    this.data_rate = consts.BR_1MBPS;
    this.wide_band = False; // 2Mbs data rate in use?
    this.p_variant = False; // False for RF24L01 and true for RF24L01P
    this.payload_size = 5; // *< Fixed size of payloads
    this.ack_payload_available = False; // *< Whether there is an ack payload
                                        // waiting
    this.dynamic_payloads_enabled = False; // *< Whether dynamic payloads are
                                            // enabled.
    this.ack_payload_length = 5; // *< Dynamic size of pending ack payload.
    this.pipe0_reading_address = None; // *< Last address set on pipe 0 for
                                        // reading.
    this.spidev = None;
};

nrf24.ce = function (level) {
    if (level == consts.HIGH) {
        b.digitalWrite(this.ce_pin, b.HIGH);
    } else {
        b.digitalWrite(this.ce_pin, b.LOW);
    }
};

nrf24.irqWait = function () {
    // A race condition may occur here.
    // TODO: Should set a timeout
    if (GPIO.input(this.irq_pin) == 0) {
        return
    };

    GPIO.wait_for_edge(this.irq_pin, GPIO.FALLING);
};
nrf24.read_register = function (reg, blen) {
    if (blen === undefined) {
        blen = 1;
    }
    buf = [consts.R_REGISTER | (consts.REGISTER_MASK & reg)];
    for (col in range(blen)) {
        buf.append(consts.NOP);
    }
    resp = this.spidev.xfer2(buf);
    if (blen == 1) {
        return resp[1];
    }
    return resp.slice(1, blen + 1);
};
nrf24.write_register = function (reg, value, length) {
    if (length === undefined) {
        length = -1;
    }
    buf = [consts.W_REGISTER | (consts.REGISTER_MASK & reg)];
    if (isinstance(value, (int, long))) {
        if (length < 0) {
            length = 1;
        }
        length = min(4, length);
        for (i in range(length)) {
            buf.insert(1, int(value & 0xff));
            value >>= 8;
        }
    } else if (isinstance(value, list)) {
        if (length < 0) {
            length = len(value);
        }
        for (i in range(min(len(value), length))) {
            buf.append(int(value[len(value) - i - 1] & 0xff));
        }
    } else {
        console.log("Value must be int or list");
        // raise Exception("Value must be int or list");
        return;
    }
    return this.spidev.xfer2(buf)[0];
};

nrf24.write_payload = function (buf) {
    data_len = min(this.payload_size, len(buf));
    blank_len = 0;
    if (!this.dynamic_payloads_enabled) {
        blank_len = this.payload_size - data_len;
    }
    txbuffer = [consts.W_TX_PAYLOAD];
    for (n in buf) {
        t = type(n);
        if (t instanceof String) {
            txbuffer.append(ord(n));
        } else if (t === parseInt(t)) {
            txbuffer.append(n);
        } else {
            console.log("Only ints and chars are supported: Found " + str(t));
            // raise Exception("Only ints and chars are supported: Found " +
            // str(t));
            return;
        };
    }
    if (blank_len != 0) {
        for (i in range(blank_len)) {
            blank[i] = 0x00;
        };
        buf.extend(blank);
    };
    return this.spidev.xfer2(txbuffer);
};

nrf24.read_payload = function (self, buf) {
    data_len = min(this.payload_size, len(buf));
    blank_len = 0;
    if (!this.dynamic_payloads_enabled) {
        blank_len = this.payload_size - data_len;
    };

    for (i in range(0, blank_len + data_len + 1)) {
        txbuffer[i] = consts.NOP;
    }
    txbuffer[0] = consts.R_RX_PAYLOAD;

    payload = this.spidev.xfer2(txbuffer);
    buf = []; 
    buf=buf.concat(payload.slice(1));
// buf.extend(payload[1: ]);
    return 0;
};
nrf24.flush_rx = function () {
    return this.spidev.xfer2([consts.FLUSH_RX])[0];
};
nrf24.flush_tx = function () {
    return this.spidev.xfer2([consts.FLUSH_TX])[0];
};

nrf24.get_status = function () {
    return this.spidev.xfer2([consts.NOP])[0];
};
nrf24.print_status = function (status) {
    status_str = "STATUS\t = 0x{0:02x} RX_DR={1:x} TX_DS={2:x} MAX_RT={3:x} RX_P_NO={4:x} TX_FULL={5:x}\r\n".format(
        status, (status & _BV(consts.RX_DR)) ? 1 :
        0, (status & _BV(consts.TX_DS)) ? 1 : 0, (status & _BV(consts.MAX_RT)) ? 1 : 0, ((status >> consts.RX_P_NO) & int("111", 2)), (status & _BV(consts.TX_FULL)) ? 1 : 0
    );

    console.log(status_str);
};
nrf24.print_observe_tx = function (value) {
    tx_str = "OBSERVE_TX=0x{0:02x}: POLS_CNT={2:x} ARC_CNT={2:x}\r\n".format(
        value, (value >> consts.PLOS_CNT) & int("1111", 2), (value >> consts.ARC_CNT) & int("1111", 2)
    );
    console.log( tx_str);
};
nrf24.print_byte_register = function (name, reg, qty) {
  if(qty==undefined){
  qty=1;  
  
  }
    
    if (len(name) < 8) {
        extra_tab = '\t';
    } else {
        extra_tab = 0;
    }
    
    var string ="";
    while (qty > 0) {
        string=string+"0x"+("00"+this.read_register(reg)).slice(-2) ;
        qty -= 1;
        reg += 1;
    }
    console.log( name+"\t"+extra_tab+" ="+string);

};
nrf24.print_address_register = function (name, reg, qty) {
   
  if(qty==undefined){
    qty=1;  
    
    }
  if (len(name) < 8) {
        extra_tab = '\t';
    } else {
        extra_tab = 0;
    }
   

    while (qty > 0) {
        qty -= 1;
        buf = reversed(this.read_register(reg, 5));
        reg += 1;
        var string = " 0x" ;
        for (i in buf) {
            string=string+ ("00"+i).slice(-2);
        }
        console.log( name+"\t"+extra_tab+" ="+string);
    }

};

nrf24.setChannel = function (channel) {
    this.channel = min(max(0, channel), consts.MAX_CHANNEL);
    this.write_register(consts.RF_CH, this.channel);
};
nrf24.getChannel = function () {
    return this.read_register(consts.RF_CH);
};
nrf24.setPayloadSize = function (size) {
    this.payload_size = min(max(size, 1), consts.MAX_PAYLOAD_SIZE);
};
nrf24.getPayloadSize = function () {
    return this.payload_size;
};
nrf24.printDetails = function () {
    this.print_status(this.get_status());
    this.print_address_register("RX_ADDR_P0-1", consts.RX_ADDR_P0, 2);
    this.print_byte_register("RX_ADDR_P2-5", consts.RX_ADDR_P2, 4);
    this.print_address_register("TX_ADDR", consts.TX_ADDR);

    this.print_byte_register("RX_PW_P0-6", consts.RX_PW_P0, 6);
    this.print_byte_register("EN_AA", consts.EN_AA);
    this.print_byte_register("EN_RXADDR", consts.EN_RXADDR);
    this.print_byte_register("RF_CH", consts.RF_CH);
    this.print_byte_register("RF_SETUP", consts.RF_SETUP);
    this.print_byte_register("CONFIG", consts.CONFIG);
    this.print_byte_register("DYNPD/FEATURE", consts.DYNPD, 2);

    //
    console.log("Data Rate\t = " + consts.datarate_e_str_P[this.getDataRate()]);
    console.log("Model\t\t = " + consts.model_e_str_P[this.isPVariant()]);
    console.log("CRC Length\t = " + consts.crclength_e_str_P[this.getCRCLength()]);
    console.log("PA Power\t = " + consts.pa_dbm_e_str_P[this.getPALevel()]);
};
nrf24.begin = function (spiDevice, ce_pin, irq_pin) {
    // Initialize SPI bus
    this.spidev = new SPI.Spi(spiDevice);
    this.spidev.maxSpeed(10000000);
    this.spidev.open();  

    this.ce_pin = ce_pin;
    this.irq_pin = irq_pin;

    
    b.pinMode(this.ce_pin, b.OUTPUT);
    b.pinMode(this.csn_pin, b.OUTPUT);
    b.pinMode(this.irq_pin, b.INPUT);

    time.sleep(5 / 1000000.0);

    // Set 1500uS (minimum for 32B payload in ESB@250KBPS) timeouts, to make
    // testing a little easier
    // WARNING: If this is ever lowered, either 250KBS mode with AA is broken or
    // maximum packet
    // sizes must never be used. See documentation for a more complete
    // explanation.
    this.write_register(consts.SETUP_RETR, (int('0100', 2) << consts.ARD) | (int('1111', 2) << consts.ARC));

    // Restore our default PA level
    this.setPALevel(consts.PA_MAX);

    // Determine if this is a p or non-p RF24 module and then
    // reset our data rate back to default value. This works
    // because a non-P variant won't allow the data rate to
    // be set to 250Kbps.
    if (this.setDataRate(consts.BR_250KBPS)) {
        this.p_variant = True;
    }
    // Then set the data rate to the slowest (and most reliable) speed supported
    // by all
    // hardware.
    this.setDataRate(consts.BR_1MBPS);

    // Initialize CRC and request 2-byte (16bit) CRC
    this.setCRCLength(consts.CRC_16);

    // Disable dynamic payloads, to match dynamic_payloads_enabled setting
    this.write_register(consts.DYNPD, 0);

    // Reset current status
    // Notice reset and flush is the last thing we do
    this.write_register(consts.STATUS, _BV(consts.RX_DR) | _BV(consts.TX_DS) | _BV(consts.MAX_RT));

    // Set up default configuration. Callers can always change it later.
    // This channel should be universally safe and not bleed over into adjacent
    // spectrum.
    this.setChannel(this.channel);

    // Flush buffers
    this.flush_rx();
    this.flush_tx();
};
nrf24.startListening = function () {
    this.write_register(consts.CONFIG, this.read_register(consts.CONFIG) | _BV(consts.PWR_UP) | _BV(consts.PRIM_RX));
    this.write_register(consts.STATUS, _BV(consts.RX_DR) | _BV(consts.TX_DS) | _BV(consts.MAX_RT));

    // Restore the pipe0 address, if exists
    if (this.pipe0_reading_address) {
        this.write_register(this.RX_ADDR_P0, this.pipe0_reading_address, 5);
    }
    // Go!
    this.ce(consts.HIGH);

    // wait for the radio to come up (130us actually only needed)
    time.sleep(130 / 1000000.0);
};
nrf24.stopListening = function () {
    this.ce(consts.LOW);
    this.flush_tx();
    this.flush_rx();
};
nrf24.powerDown = function () {
    this.write_register(consts.CONFIG, this.read_register(consts.CONFIG) & ~_BV(consts.PWR_UP));
};
nrf24.powerUp = function () {
    this.write_register(consts.CONFIG, this.read_register(consts.CONFIG) & _BV(consts.PWR_UP));
    time.sleep(150 / 1000000.0);
};
nrf24.write = function (buf) {
    // Begin the write
    this.startWrite(buf);

    timeout = this.getMaxTimeout(); // s to wait for timeout
    sent_at = time.time();

    while (True) {
        status = this.read_register(consts.OBSERVE_TX, 1);
        if ((status & (_BV(consts.TX_DS) | _BV(consts.MAX_RT))) || (time.time() - sent_at > timeout)) {
            break;
        }
        time.sleep(10 / 1000000.0);
    }
    what = this.whatHappened();

    result = what['tx_ok'];

    // Handle the ack packet
    if (what['rx_ready']) {
        this.ack_payload_length = this.getDynamicPayloadSize();
    }
    return result;
};
nrf24.startWrite = function (buf) {
    // Transmitter power-up
    this.write_register(consts.CONFIG, (this.read_register(consts.CONFIG) | _BV(consts.PWR_UP)) & ~_BV(consts.PRIM_RX));

    // Send the payload
    this.write_payload(buf);

    // Allons!
    this.ce(consts.HIGH);
    time.sleep(10 / 1000000.0);
    this.ce(consts.LOW);
};

nrf24.getDynamicPayloadSize = function () {
    return this.spidev.xfer2([consts.R_RX_PL_WID, consts.NOP])[1];
};
nrf24.available = function (pipe_num, irq_wait) {
    if (irq_wait == undefined) {
        irq_wait = false;
    }
    if (!pipe_num) {
        pipe_num = [];
    }
    status = this.get_status();
    result = False;

    if (irq_wait) {
        this.irqWait();
    }
    // Sometimes the radio specifies that there is data in one pipe but
    // doesn't set the RX flag...
    if ((status & _BV(consts.RX_DR)) || (status & parseInt('00001110',2) != parseInt('00001110',2))) {
        result = True;
    }
    if (result) {
        // If the caller wants the pipe number, include that
        if (len(pipe_num) >= 1) {
            pipe_num[0] = (status >> consts.RX_P_NO) & parseInt('00000111',2);
        }

    }
    // Clear the status bit

    // ??? Should this REALLY be cleared now? Or wait until we
    // actually READ the payload?
    this.write_register(consts.STATUS, _BV(consts.RX_DR));

    // Handle ack payload receipt
    if (status & _BV(consts.TX_DS)) {
        this.write_register(consts.STATUS, _BV(consts.TX_DS));
    }
    return result;
};
nrf24.read = function (buf) {
    // Fetch the payload
    this.read_payload(buf);

    // was this the last of the data available?
    return this.read_register(consts.FIFO_STATUS) & _BV(consts.RX_EMPTY);
};
nrf24.whatHappened = function () {
    // Read the status & reset the status in one easy call
    // Or is that such a good idea?
    status = this.write_register(consts.STATUS, _BV(consts.RX_DR) | _BV(consts.TX_DS) | _BV(consts.MAX_RT));

    // Report to the user what happened
    tx_ok = status & _BV(consts.TX_DS);
    tx_fail = status & _BV(consts.MAX_RT);
    rx_ready = status & _BV(consts.RX_DR);
    return {
        'tx_ok': tx_ok,
        "tx_fail": tx_fail,
        "rx_ready": rx_ready
    };
};
nrf24.openWritingPipe = function (value) {
    // Note that the NRF24L01(+)
    // expects it LSB first.

    this.write_register(consts.RX_ADDR_P0, value, 5);
    this.write_register(consts.TX_ADDR, value, 5);

    max_payload_size = 32;
    this.write_register(consts.RX_PW_P0, min(this.payload_size, max_payload_size));
};
nrf24.openReadingPipe = function (child, address) {
    // If this is pipe 0, cache the address. This is needed because
    // openWritingPipe() will overwrite the pipe 0 address, so
    // startListening() will have to restore it.
    if (child == 0) {
        this.pipe0_reading_address = address;
    }

    if (child <= 6) {
        // For pipes 2-5, only write the LSB
        if (child < 2) {
            this.write_register(consts.child_pipe[child], address, 5);
        } else {
            this.write_register(consts.child_pipe[child], address, 1);
        };
        this.write_register(consts.child_payload_size[child], this.payload_size);

        // Note it would be more efficient to set all of the bits for all open
        // pipes at once. However, I thought it would make the calling code
        // more simple to do it this way.
        this.write_register(consts.EN_RXADDR,
            this.read_register(consts.EN_RXADDR) | _BV(consts.child_pipe_enable[child]));
    };
};

nrf24.closeReadingPipe = function (pipe) {
    this.write_register(consts.EN_RXADDR,
        this.read_register(EN_RXADDR) & ~_BV(consts.child_pipe_enable[pipe]));
};

nrf24.toggle_features = function () {
    buf = [consts.ACTIVATE, 0x73];
    this.spidev.xfer2(buf);
};

nrf24.enableDynamicPayloads = function () {
    // Enable dynamic payload throughout the system
    this.write_register(consts.FEATURE, this.read_register(consts.FEATURE) | _BV(consts.EN_DPL));

    // If it didn't work, the features are not enabled
    if (!this.read_register(consts.FEATURE)) {
        // So enable them and try again
        this.toggle_features();
        this.write_register(consts.FEATURE, this.read_register(consts.FEATURE) | _BV(consts.EN_DPL));
    }
    // Enable dynamic payload on all pipes

    // Not sure the use case of only having dynamic payload on certain
    // pipes, so the library does not support it.
    this.write_register(consts.DYNPD, this.read_register(consts.DYNPD) | _BV(consts.DPL_P5) | _BV(consts.DPL_P4) | _BV(
        consts.DPL_P3) | _BV(consts.DPL_P2) | _BV(consts.DPL_P1) | _BV(consts.DPL_P0));

    this.dynamic_payloads_enabled = True;
};

nrf24.enableAckPayload = function () {
    // enable ack payload and dynamic payload features
    this.write_register(consts.FEATURE,
        this.read_register(consts.FEATURE) | _BV(consts.EN_ACK_PAY) | _BV(consts.EN_DPL));

    // If it didn't work, the features are not enabled
    if (!this.read_register(consts.FEATURE)) {
        // So enable them and try again
        this.toggle_features();
        this.write_register(consts.FEATURE,
            this.read_register(consts.FEATURE) | _BV(consts.EN_ACK_PAY) | _BV(consts.EN_DPL));
    }
    // Enable dynamic payload on pipes 0 & 1
    this.write_register(consts.DYNPD, this.read_register(consts.DYNPD) | _BV(consts.DPL_P1) | _BV(consts.DPL_P0));

};
nrf24.writeAckPayload = function (pipe, buf, buf_len) {
    txbuffer = [consts.W_ACK_PAYLOAD | (pipe & 0x7)];

    max_payload_size = 32;
    data_len = min(buf_len, max_payload_size);
    txbuffer.push.apply(txbuffer, buf.slice(0,data_len));
    // txbuffer.extend(buf[0: data_len]);

    this.spidev.xfer2(txbuffer);
};

nrf24.isAckPayloadAvailable = function () {
    result = this.ack_payload_available;
    this.ack_payload_available = False;
    return result;
};
nrf24.isPVariant = function () {
    return this.p_variant;
};

nrf24.setAutoAck = function (enable) {
    if (enable) {
        this.write_register(consts.EN_AA, int('111111', 2));
    } else {
        this.write_register(consts.EN_AA, 0);
    };
};
nrf24.setAutoAckPipe = function (pipe, enable) {
    if (pipe <= 6) {
        en_aa = this.read_register(consts.EN_AA);
        if (enable) {
            en_aa |= _BV(pipe);
        } else {
            en_aa &= ~_BV(pipe);
        }
    }
    this.write_register(consts.EN_AA, en_aa);
};
nrf24.testCarrier = function () {
    return this.read_register(consts.CD) & 1;
};
nrf24.testRPD = function () {
    return this.read_register(consts.RPD) & 1;
};
nrf24.setPALevel = function (level) {
    setup = this.read_register(consts.RF_SETUP);
    setup &= ~(_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));
    // switch uses RAM (evil!)
    if (level == consts.PA_MAX) {
        setup |= (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));
    } else if (level == consts.PA_HIGH) {
        setup |= _BV(consts.RF_PWR_HIGH);
    } else if (level == consts.PA_LOW) {
        setup |= _BV(consts.RF_PWR_LOW);
    } else if (level == consts.PA_MIN) {
        nop = 0;
    } else if (level == consts.PA_ERROR) {
        // On error, go to maximum PA
        setup |= (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));
    }
    this.write_register(consts.RF_SETUP, setup);
};

nrf24.getPALevel = function () {
    power = this.read_register(consts.RF_SETUP) & (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));

    if (power == (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH))) {
        return consts.PA_MAX;
    } else if (power == _BV(consts.RF_PWR_HIGH)) {
        return consts.PA_HIGH;
    } else if (power == _BV(consts.RF_PWR_LOW)) {
        return consts.PA_LOW;
    } else {
        return consts.PA_MIN;
    }
};
nrf24.setDataRate = function (speed) {
    result = False;
    setup = this.read_register(consts.RF_SETUP);

    // HIGH and LOW '00' is 1Mbs - our default
    this.wide_band = False;
    setup &= ~(_BV(consts.RF_DR_LOW) | _BV(consts.RF_DR_HIGH));

    if (speed == consts.BR_250KBPS) {
        // Must set the RF_DR_LOW to 1 RF_DR_HIGH (used to be RF_DR) is already
        // 0
        // Making it '10'.
        this.wide_band = False;
        setup |= _BV(consts.RF_DR_LOW);
    } else {
        // Set 2Mbs, RF_DR (RF_DR_HIGH) is set 1
        // Making it '01'
        if (speed == consts.BR_2MBPS) {
            this.wide_band = True;
            setup |= _BV(consts.RF_DR_HIGH);
        } else {
            // 1Mbs
            this.wide_band = False;
        }
    }
    this.write_register(consts.RF_SETUP, setup);

    // Verify our result
    if (this.read_register(consts.RF_SETUP) == setup) {
        result = True;
    } else {
        this.wide_band = False;
    }
    return result;
};
nrf24.getDataRate = function () {
    dr = this.read_register(consts.RF_SETUP) & (_BV(consts.RF_DR_LOW) | _BV(consts.RF_DR_HIGH));
    // Order matters in our case below
    if (dr == _BV(consts.RF_DR_LOW)) {
        // '10' = 250KBPS
        return consts.BR_250KBPS;
    } else if (dr == _BV(consts.RF_DR_HIGH)) {
        // '01' = 2MBPS
        return consts.BR_2MBPS;
    } else {
        // '00' = 1MBPS
        return consts.BR_1MBPS;
    };
};
nrf24.setCRCLength = function (length) {
    config = this.read_register(consts.CONFIG) & ~(_BV(consts.CRC_16) | _BV(consts.CRC_ENABLED));

    if (length == consts.CRC_DISABLED) {
        // Do nothing, we turned it off above.
        this.write_register(consts.CONFIG, config);
        return;
    } else {
        if (length == consts.CRC_8) {
            config |= _BV(consts.CRC_ENABLED);
            config |= _BV(consts.CRC_8);
        } else {
            config |= _BV(consts.CRC_ENABLED);
            config |= _BV(consts.CRC_16);
        }
    }
    this.write_register(consts.CONFIG, config);
};
nrf24.getCRCLength = function () {
    result = consts.CRC_DISABLED;
    config = this.read_register(consts.CONFIG) & (_BV(consts.CRCO) | _BV(consts.EN_CRC));

    if (config & _BV(consts.EN_CRC))
        if (config & _BV(consts.CRCO))
            result = consts.CRC_16;
        else
            result = consts.CRC_8;

    return result;
};
nrf24.disableCRC = function () {
    disable = this.read_register(consts.CONFIG) & ~_BV(consts.EN_CRC);
    this.write_register(consts.CONFIG, disable);
};
nrf24.setRetries = function (delay, count) {
    this.write_register(consts.SETUP_RETR, (delay & 0xf) << consts.ARD | (count & 0xf) << consts.ARC);

};
nrf24.getRetries = function getRetries() {
    return this.read_register(consts.SETUP_RETR);
};
nrf24.getMaxTimeout = function () {
    retries = this.getRetries();
    return ((250 + (250 * ((retries & 0xf0) >> 4))) * (retries & 0x0f)) / 1000000.0;
};


module.exports = nrf24;