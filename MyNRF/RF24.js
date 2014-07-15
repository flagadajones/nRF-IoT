'use strict';

//var b = require('bonescript');
var consts = require('./nRF24L01');
var bone = require('./bone');
var SPI = require('spi');
var q = require('queue-async');
var Q = require('q');
var GPIO = require("./gpio");
var asap =require('asap');
module.exports = (function() {

    var TIMING = {
        pd2stby: 150, // NOTE: varies dep. on crystal configuration, see p.24/p.19
        stby2a: 130,
        hce: 10,
        pece2csn: 5 //4
    };

    function blockMicroseconds(us) {
        //var process = q(1);
        // NOTE: setImmediate/process.nextTick too slow (especially on Pi) so we just spinloop for µs
        var start = process.hrtime();
        while (1) {
            var diff = process.hrtime(start);
            if (diff[0] * 1e9 + diff[1] >= us * 1e3) break;
        }
        if (nrf._debug) console.log("blocked for " + us + "µs.");
    };

    /**
     * Power Amplifier level.
     *
     * For use with setPALevel()
     */
    //typedef enum { RF24_PA_MIN = 0,RF24_PA_LOW, RF24_PA_HIGH, RF24_PA_MAX, RF24_PA_ERROR  } rf24_pa_dbm_e ;

    var rf24_datarate_e_str_P = ["1MBPS", "2MBPS", "250KBPS"];
    var rf24_model_e_str_P = ["nRF24L01", "nRF24L01+"];
    var rf24_crclength_e_str_P = ["Disabled", "8 bits", "16 bits"];
    var rf24_pa_dbm_e_str_P = ["PA_MIN", "PA_LOW", "PA_HIGH", "PA_MAX"];

    /**
     * Data rate.  How fast data moves through the air.
     *
     * For use with setDataRate()
     */
    //typedef enum { RF24_1MBPS = 0, RF24_2MBPS, RF24_250KBPS } rf24_datarate_e;
   

    /**
     * CRC Length.  How big (if any) of a CRC is included.
     *
     * For use with setCRCLength()
     */
    //typedef enum { RF24_CRC_DISABLED = 0, RF24_CRC_8, RF24_CRC_16 }; rf24_crclength_e;
    
    //	static const uint8_t child_pipe[] PROGMEM ={  RX_ADDR_P0, RX_ADDR_P1, RX_ADDR_P2, RX_ADDR_P3, RX_ADDR_P4, RX_ADDR_P5};
    var child_pipe = [consts.RX_ADDR_P0, consts.RX_ADDR_P1, consts.RX_ADDR_P2, consts.RX_ADDR_P3, consts.RX_ADDR_P4, consts.RX_ADDR_P5];
    //static const uint8_t child_payload_size[] PROGMEM ={  RX_PW_P0, RX_PW_P1, RX_PW_P2, RX_PW_P3, RX_PW_P4, RX_PW_P5};
    var child_payload_size = [consts.RX_PW_P0, consts.RX_PW_P1, consts.RX_PW_P2, consts.RX_PW_P3, consts.RX_PW_P4, consts.RX_PW_P5];
    //static const uint8_t child_pipe_enable[] PROGMEM ={  ERX_P0, ERX_P1, ERX_P2, ERX_P3, ERX_P4, ERX_P5};
    var child_pipe_enable = [consts.ERX_P0, consts.ERX_P1, consts.ERX_P2, consts.ERX_P3, consts.ERX_P4, consts.ERX_P5];


    /**
     * Driver for nRF24L01(+) 2.4GHz Wireless Transceiver
     */
    var ce_pin; /*  uint8_t *< "Chip Enable" pin, activates the RX or TX role */
    var csn_pin; /* uint8_t *< SPI Chip select */
	
	var ceGPIO;
	var csnGPIO;
	
    var wide_band; /* bool 2Mbs data rate in use? */
    var p_variant; /* bool False for RF24L01 and true for RF24L01P */
    var payload_size; /* uint8_t *< Fixed size of payloads */
    var ack_payload_available; /* bool *< Whether there is an ack payload waiting */
    var dynamic_payloads_enabled; /* bool *< Whether dynamic payloads are enabled. */
    var ack_payload_length; /* uint8_t *< Dynamic size of pending ack payload. */
    var pipe0_reading_address; /* uint64_t *< Last address set on pipe 0 for reading. */

    var spiDev;
    var nrf = {};
    var spi;


    function _BV(x) {
        return 1 << (x)
    };

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

    /**
     * Set chip select pin
     *
     * Running SPI bus at PI_CLOCK_DIV2 so we don't waste time transferring data
     * and best of all, we make use of the radio's FIFO buffers. A lower speed
     * means we're less likely to effectively leverage our FIFOs and pay a higher
     * AVR runtime cost as toll.
     *
     * @param mode HIGH to take this unit off the SPI bus, LOW to put it on
     */
    //void csn(int mode)


    function csnHigh() {
        //b.digitalWrite(csn_pin, b.HIGH);
		csnGPIO.value(1);
    };

    function csnLow() {
        //b.digitalWrite(csn_pin, b.LOW);
		csnGPIO.value(0);
    };


    /**
     * Set chip enable
     *
     * @param level HIGH to actively begin transmission or LOW to put in standby.  Please see data sheet
     * for a much more detailed description of this pin.
     */
    //void ce(int level)

    function ceHigh() {
        //b.digitalWrite(ce_pin, b.HIGH);
		ceGPIO.value(1);
    };

    function ceLow() {
        //b.digitalWrite(ce_pin, b.LOW);
		ceGPIO.value(0);
    };

    /**
     * Read a chunk of data in from a register
     *
     * @param reg Which register. Use constants from nRF24L01.h
     * @param buf Where to put the data
     * @param len How many bytes of data to transfer
     * @return Current value of status register
     */
    //uint8_t read_register(uint8_t reg, uint8_t* buf, uint8_t len);
    /**
     * Read single byte from a register
     *
     * @param reg Which register. Use constants from nRF24L01.h
     * @return Current value of register @p reg
     */
    //uint8_t read_register(uint8_t reg);

    function readRegister(reg, val, callback) {
        //console.log(reg);
        //   console.log(val);
        csnLow();
        var buf1 = new Buffer(1 + val.length);
        buf1[0] = consts.READ_REGISTER | (consts.REGISTER_MASK & reg);


        for (var i = 0; i < val.length; i++) {
            buf1[i + 1] = 0xff; //val[i];
        }
        //console.log(buf1);
        spi.transfer(buf1, buf1, function(device, buf) {
          //  console.log(device);
        //    console.log(buf);

            var rBuf = new Buffer(buf.length - 1);
            for (var i = 1; i < buf.length; i++) {
                rBuf[buf.length - i-1] = buf[i];
            }
            csnHigh();
            
            callback(rBuf);
        });
    };

    /**
     * Write a single byte to a register
     *
     * @param reg Which register. Use constants from nRF24L01.h
     * @param value The new value to write
     * @return Current value of status register
     */
    //uint8_t writeRegister(uint8_t reg, uint8_t value);
    function writeRegister(reg, buffer) {
    //    console.log("reg "+reg);
     //   console.log(buffer);
        csnLow();
        var b = new Buffer(1 + buffer.length);
        b[0] = consts.W_REGISTER | (consts.REGISTER_MASK & reg);
//console.log(consts.W_REGISTER);
//console.log(consts.REGISTER_MASK);
//console.log("reg2="+b[0]);
        for (var i = 0; i < buffer.length; i++) {
            b[(buffer.length ) -i] = buffer[i];//ecriture inversée des bytes
        }
//console.log(b);
        spi.write(b);
        csnHigh();
    };


    /**
     * Write the transmit payload
     *
     * The size of data written is the fixed payload size, see getPayloadSize()
     *
     * @param buf Where to get the data
     * @param len Number of bytes to be sent
     * @return Current value of status register
     */
    //uint8_t write_payload(const void* buf, uint8_t len, const uint8_t writeType);
    function write_payload(bufIn, writeType, callback) {

        var data_len = Math.min(bufIn.length, payload_size);


        //printf("[Writing %u bytes %u blanks]",data_len,blank_len);

        var buf = new Buffer(1 + data_len);
        buf[0] = writeType;
        for (var i = 0; i < bufIn.length; i++) {
            buf[i + 1] = bufIn[i];
        }
        csnLow();

        spi.transfer(buf1, new Buffer(buf1.length), function(device, buf) {
            csnHigh();
            callback();
        });
    };

    /**
     * Read the receive payload
     *
     * The size of data read is the fixed payload size, see getPayloadSize()
     *
     * @param buf Where to put the data
     * @param len Maximum number of bytes to read
     * @return Current value of status register
     */
    //uint8_t read_payload(void* buf, uint8_t len);
    function read_payload(data_len,callback) {
        //printf("[Reading %u bytes %u blanks]",data_len,blank_len);
        var buf = new Buffer(1 + data_len);
        buf[0] = consts.R_RX_PAYLOAD;

        csnLow();
        spi.transfer(buf, buf, function(device, buf) {
            csnHigh();
            callback(buf);
        });
    };

    /**
     * Empty the receive buffer
     *
     * @return Current value of status register
     */
    //uint8_t flush_rx(void);
    function flush_rx() {
        var flushBuf = new Buffer(1);
        flushBuf[0] = consts.FLUSH_RX;

        csnLow();
        spi.write(flushBuf);
        csnHigh();
    };

    /**
     * Empty the transmit buffer
     *
     * @return Current value of status register
     */
    //uint8_t flush_tx(void);
    function flush_tx() {
        var flushBuf = new Buffer(1);
        flushBuf[0] = consts.FLUSH_TX;

        csnLow();
        spi.write(flushBuf);
        csnHigh();

    };

    /**
     * Retrieve the current status of the chip
     *
     * @return Current value of status register
     */
    //  uint8_t get_status(void);
    function get_status(callback) {
        csnLow();
        
        var buf1 = new Buffer(1);
        buf1[0] = consts.NOP;

        spi.transfer(buf1, new Buffer(1), function(device, buf) {
            csnHigh();
            callback(null,buf[0]);
        });

    };

    /**
     * Decode and print the given status to stdout
     *
     * @param status Status value to print
     *
     * @warning Does nothing if stdout is not defined.  See fdevopen in stdio.h
     */
    //void print_status(uint8_t status);
    function print_status(status) {
        console.log("STATUS\t\t = 0x" + ("00"+status.toString(16)).substr(-2) + " RX_DR=" + ((status & _BV(consts.RX_DR)) ? 1 : 0 )+ " TX_DS=" + ((status & _BV(consts.TX_DS)) ? 1 : 0 )+ " MAX_RT=" + ((status & _BV(consts.MAX_RT)) ? 1 : 0)
        + " RX_P_NO=" + ((status >> consts.RX_P_NO) & parseInt('111', 2)) + " TX_FULL=" + ((status & _BV(consts.TX_FULL)) ? 1 : 0));
    };


    /**
     * Decode and print the given 'observe_tx' value to stdout
     *
     * @param value The observe_tx value to print
     *
     * @warning Does nothing if stdout is not defined.  See fdevopen in stdio.h
     */
    //void print_observe_tx(uint8_t value);
    function print_observe_tx(value) {
        console.log("OBSERVE_TX=" + value + ": POLS_CNT=" + (value >> consts.PLOS_CNT) & parseInt('1111', 2) + " ARC_CNT=" + (value >> consts.ARC_CNT) & parseInt('1111', 2));


    };

    /**
     * Print the name and value of an 8-bit register to stdout
     *
     * Optionally it can print some quantity of successive
     * registers on the same line.  This is useful for printing a group
     * of related registers on one line.
     *
     * @param name Name of the register
     * @param reg Which register. Use constants from nRF24L01.h
     * @param qty How many successive registers to print
     */
    //void print_byte_register(const char* name, uint8_t reg, uint8_t qty = 1);
    function print_byte_register(name, regs, callback) {
        var extra_tab = name.length < 8 ? '\t' : '';
        var numReg = 0;
        var max = regs.length;
        var string = '';
        promiseWhile(function() {
    
            return numReg < max;
        }, function() {
            string += ' 0x';
    
            readRegister(regs[numReg], new Buffer(1), function(result) {
                string += ("00"+result[0].toString(16)).substr(-2);
    
                numReg++;
                return Q.delay(15);
            });
    
    
        }).then(function() {
            console.log(name + "\t" + extra_tab + " =" + string);
            callback();
        });
    
    };
    
    /**
     * Print the name and value of a 40-bit address register to stdout
     *
     * Optionally it can print some quantity of successive
     * registers on the same line.  This is useful for printing a group
     * of related registers on one line.
     *
     * @param name Name of the register
     * @param reg Which register. Use constants from nRF24L01.h
     * @param qty How many successive registers to print
     */
    //void print_address_register(const char* name, uint8_t reg, uint8_t qty = 1);
    //nrf.print_address_register = function(name, regs, callback) {

            function print_address_register(name, regs, callback) {
        var extra_tab = name.length < 8 ? '\t' : '';
        var numReg = 0;
        var max = regs.length;
        var string='';
        promiseWhile(function() {

            return numReg < max;
        }, function() {
            string+=' 0x';
            readRegister(regs[numReg], new Buffer(5), function(result) {
                for (var i = 0; i < result.length; i++) {
                    string += ("00"+result[i].toString(16)).substr(-2);
                }
                numReg++;
                return Q.delay(15);
            });


        }).then(function() {
            console.log(name + "\t" + extra_tab + " =" + string);
            callback();
        });


    };

    /**
     * Turn on or off the special features of the chip
     *
     * The chip has certain 'features' which are only available when the 'features'
     * are enabled.  See the datasheet for details.
     */
    //void toggle_features(void);
    function toggle_features(callback) {
        csnLow();
        spi.transfer(ACTIVATE);
        Q().then(function() {
            var deferred = Q.defer();
            var buf = new Buffer(1);
            buf[0] = consts.ACTIVATE;
            spi.transfer(buf, new Buffer(buf.length), deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            var buf = new Buffer(1);
            buf[0] = 0x73;
            spi.transfer(buf, new Buffer(buf.length), deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function() {
            csnHigh();
            callback();
        });
    };



    /**
     * Constructor
     *
     * Creates a new instance of this driver.  Before using, you create an instance
     * and send in the unique pins that this chip is connected to.
     *
     * @param _cepin The pin attached to Chip Enable on the RF module
     * @param _cspin The pin attached to Chip Select
     */
    //RF24(uint8_t _cepin, uint8_t _cspin);
    nrf.RF24 = function(_spiDev, _cepin, _cspin) {

        ce_pin = _cepin;

        csn_pin = _cspin;

        spiDev = _spiDev;
        wide_band = false;
        p_variant = false;
        payload_size = 32;
        ack_payload_available = false;
        dynamic_payloads_enabled = false;
        pipe0_reading_address = 0;
    };

    /**
     * Begin operation of the chip
     *
     * Call this in setup(), before calling any other methods.
     */
    //void begin(void);
    nrf.begin = function() {
        // Initialize pins
       // b.pinMode(ce_pin, b.OUTPUT);
       // b.pinMode(csn_pin, b.OUTPUT);
		ceGPIO=GPIO.connect(bone.pins[ce_pin].gpio);
		ceGPIO.mode('out');
		
		csnGPIO=GPIO.connect(bone.pins[csn_pin].gpio);
		csnGPIO.mode('out');

        // Initialize SPI bus
        console.log(spiDev);
        spi = new SPI.Spi(spiDev, {'mode': SPI.MODE['MODE_0'],});
        
        spi.maxSpeed(10000000);
        spi.bitOrder(false);
        spi.open();


        ceLow();
        csnHigh();

        // Must allow the radio time to settle else configuration bits will not necessarily stick.
        // This is actually only required following power up but some settling time also appears to
        // be required after resets too. For full coverage, we'll always assume the worst.
        // Enabling 16b CRC is by far the most obvious case if the wrong timing is used - or skipped.
        // Technically we require 4.5ms + 14us as a worst case. We'll just call it 5ms for good measure.
        // WARNING: Delay is based on P-variant whereby non-P *may* require different timing.
        //delay(5);
        blockMicroseconds(TIMING["pece2csn"]);

            // Set 1500uS (minimum for 32B payload in ESB@250KBPS) timeouts, to make testing a little easier
        // WARNING: If this is ever lowered, either 250KBS mode with AA is broken or maximum packet
        // sizes must never be used. See documentation for a more complete explanation.
        var buf = new Buffer(1);
        buf[0] = (parseInt('0101', 2) << consts.ARD) | (parseInt('1111', 2) << consts.ARC);
        writeRegister(consts.SETUP_RETR, buf);

        Q().then(function () {
            var deferred = Q.defer();
            // Restore our default PA level

            nrf.setPALevel(consts.RF24_PA_MAX, deferred.makeNodeResolver());

            return deferred.promise;
        }).then(function () {
            var deferred = Q.defer();
            // Determine if this is a p or non-p RF24 module and then
            // reset our data rate back to default value. This works
            // because a non-P variant won't allow the data rate to
            // be set to 250Kbps.

            nrf.setDataRate(consts.RF24_250KBPS, deferred.makeNodeResolver());
            return deferred.promise;

        }).then(function (result) {
            var deferred = Q.defer();
          // Then set the data rate to the slowest (and most reliable) speed supported by all
            // hardware.
            nrf.getDataRate(deferred.makeNodeResolver());
            return deferred.promise;
        })
        .then(function (result) {
            var deferred = Q.defer();

            if (result ==consts.RF24_250KBPS) {
                p_variant = true;
            }
            // Then set the data rate to the slowest (and most reliable) speed supported by all
            // hardware.
            nrf.setDataRate(consts.RF24_250KBPS, deferred.makeNodeResolver());
            return deferred.promise;
        })
        
        .then(function (result) {
            var deferred = Q.defer();
            // Initialize CRC and request 2-byte (16bit) CRC
            nrf.setCRCLength(consts.RF24_CRC_16, deferred.makeNodeResolver());

            return deferred.promise;

            ;
        }).then(function () {

            // Disable dynamic payloads, to match dynamic_payloads_enabled setting
            buf = new Buffer(1);
            buf[0] = 0;
            writeRegister(consts.DYNPD, buf);

            // Reset current status
            // Notice reset and flush is the last thing we do
            buf = new Buffer(1);
            buf[0] = _BV(consts.RX_DR) | _BV(consts.TX_DS) | _BV(consts.MAX_RT);

            writeRegister(consts.STATUS, buf);

            // Set up default configuration.  Callers can always change it later.
            // This channel should be universally safe and not bleed over into adjacent
            // spectrum.
            //nrf.setChannel(76);
              nrf.setChannel(37);
            // Flush buffers
            flush_rx();
            flush_tx();

          //  nrf.printDetails();
        }).catch(function (error) {
              console.log("error");
            console.log(error);
        })
            .done();






    };

    /**
     * Start listening on the pipes opened for reading.
     *
     * Be sure to call openReadingPipe() first.  Do not call write() while
     * in this mode, without first calling stopListening().  Call
     * isAvailable() to check for incoming traffic, and read() to get it.
     */
    //void startListening(void);
    nrf.startListening = function(callback) {
        var config = readRegister(consts.CONFIG, new Buffer(1), function(resultConfig) {
            console.log("config ");
            console.log(resultConfig);
            ;
            var buf = new Buffer(1);
            buf[0] = resultConfig[0] | _BV(consts.PWR_UP) | _BV(consts.PRIM_RX);
            writeRegister(consts.CONFIG, buf);
            var buf1 = new Buffer(1);
            buf1[0] = _BV(consts.RX_DR) | _BV(consts.TX_DS) | _BV(consts.MAX_RT);
            writeRegister(consts.STATUS, buf1);

            // Restore the pipe0 adddress, if exists
            if (pipe0_reading_address) {
                var buf2 = new Buffer(5);
                for (var i = 0; i < buf2.length; i++) {
                    buf[i] = pipe0_reading_address[i];
                }
                writeRegister(consts.RX_ADDR_P0, buf2);
            }

            //FIXME ACTIF OU NON  ? 
            //#if 0
            // Flush buffers
            flush_rx();
            flush_tx();
            //#endif

            // Go!
            ceHigh();

            // wait for the radio to come up (130us actually only needed)
            blockMicroseconds(TIMING['stby2a']);
            callback();
        });
    };

    /**
     * Stop listening for incoming messages
     *
     * Do this before calling write().
     */
    //void stopListening(void);
    nrf.stopListening = function() {
        ceLow();
        flush_tx();
        flush_rx();
    };

    /**
     * Write to the open writing pipe
     *
     * Be sure to call openWritingPipe() first to set the destination
     * of where to write to.
     *
     * This blocks until the message is successfully acknowledged by
     * the receiver or the timeout/retransmit maxima are reached.  In
     * the current configuration, the max delay here is 60ms.
     *
     * The maximum size of data written is the fixed payload size, see
     * getPayloadSize().  However, you can write less, and the remainder
     * will just be filled with zeroes.
     *
     * @param buf Pointer to the data to be sent
     * @param len Number of bytes to be sent
     * @param multicast true or false. True, buffer will be multicast; ignoring retry/timeout
     * @return True if the payload was delivered successfully false if not
     * for multicast payloads, true only means it was transmitted.
     */
    //bool write( const void* buf, uint8_t len, const bool multicast=false );
    nrf.write = function(buf, multicast, callback) {
        var result = false;

        // Begin the write
        startWrite(buf, multicast, function() {

            // ------------
            // At this point we could return from a non-blocking write, and then call
            // the rest after an interrupt

            // Instead, we are going to block here until we get TX_DS (transmission completed and ack'd)
            // or MAX_RT (maximum retries, transmission failed).  Also, we'll timeout in case the radio
            // is flaky and we get neither.

            // IN the end, the send should be blocking.  It comes back in 60ms worst case.
            // Generally much faster.
            var observe_tx;
            var hrTime = process.hrtime();
            var sent_at = hrTime[0] * 1000000 + hrTime[1] / 1000;

            getMaxTimeout(function(timeoutResult) {
                //us to wait for timeout
                var timeout = timeoutResult;
                promiseWhile(function() {
                    var hrTime = process.hrtime();
                    var micro = hrTime[0] * 1000000 + hrTime[1] / 1000;
                    return (!((_BV(consts.TX_DS) | _BV(consts.MAX_RT))) && (micro - sent_at < timeout));
                }, function() {
                    // Monitor the send
                    readRegister(consts.OBSERVE_TX, new Buffer(1), function(result) {
                        observe_tx = result;
                        return Q.delay(10);
                    });

                }).then(function() {

                    // The part above is what you could recreate with your own interrupt handler,
                    // and then call this when you got an interrupt
                    // ------------

                    // Call this when you get an interrupt
                    // The status tells us three things
                    // * The send was successful (TX_DS)
                    // * The send failed, too many retries (MAX_RT)
                    // * There is an ack packet waiting (RX_DR)

                    whatHappened(function(what) {

                        //printf("%u%u%u\r\n",tx_ok,tx_fail,ack_payload_available);

                        result = what.tx_ok;
                        var ack_payload_available = what.rx_ready;
                        //IF_SERIAL_DEBUG(Serial.print(result ? "...OK." : "...Failed"));

                        // Handle the ack packet
                        if (ack_payload_available) {
                            ack_payload_length = getDynamicPayloadSize(

                            function(ack_size) {
                                ack_payload_length = ack_size;
                                callback(result);
                                //IF_SERIAL_DEBUG(Serial.print("[AckPacket]/"));
                                //IF_SERIAL_DEBUG(Serial.println(ack_payload_length, DEC));    
                            });

                        }
                        else {

                            calback(result);
                        }
                    });
                }).done();
            });
        });
    };

    /**
     * Test whether there are bytes available to be read
     *
     * @return True if there is a payload available, false if none is
     */
    /**
     * Test whether there are bytes available to be read
     *
     * Use this version to discover on which pipe the message
     * arrived.
     *
     * @param[out] pipe_num Which pipe has the payload available
     * @return True if there is a payload available, false if none is
     */
    //bool available(uint8_t* pipe_num);
    //bool available(void);
    nrf.available = function(callback) {
        get_status(function(err,status) {
            // Too noisy, enable if you really want lots o data!!
            //IF_SERIAL_DEBUG(print_status(status));

            var result = (status & _BV(consts.RX_DR));
  
if (result) {

                // Clear the status bit

                // ??? Should this REALLY be cleared now?  Or wait until we
                // actually READ the payload?

                var buf = new Buffer(1);
                buf[0] = _BV(consts.RX_DR);
                writeRegister(consts.STATUS, buf);

                // Handle ack payload receipt
                if (status & _BV(consts.TX_DS)) {
                    var buf = new Buffer(1);
                    buf[0] = _BV(consts.TX_DS);
                    writeRegister(consts.STATUS, buf);
                }
            }

            callback(null,result);
        });
    };

    /**
     * Read the payload
     *
     * Return the last payload received
     *
     * The size of data read is the fixed payload size, see getPayloadSize()
     *
     * @note I specifically chose 'void*' as a data type to make it easier
     * for beginners to use.  No casting needed.
     *
     * @param buf Pointer to a buffer where the data should be written
     * @param len Maximum number of bytes to read into the buffer
     * @return True if the payload was delivered successfully false if not
     */
    //bool read( void* buf, uint8_t len );
    nrf.read = function(size,callback) {
        read_payload(size,function(buf) {
            readRegister(consts.FIFO_STATUS, new Buffer(1), function(resultFIFO) {
                // was this the last of the data available?  
                var result={};
                result.done=resultFIFO[0] & _BV(consts.RX_EMPTY);
                var buf2=buf.slice(1);
              //  console.log(buf2);
                result.buf=new Buffer(size);
                
                for(var i =0;i<buf.length;i++){
                    result.buf[i]=buf2[buf.length-2-i];
                    
                
                }
                result.buf=buf2;
              //  console.log(result.buf);
                callback(null,result);
            });
        });

    };



    /**
     * Open a pipe for writing
     *
     * Only one pipe can be open at once, but you can change the pipe
     * you'll listen to.  Do not call this while actively listening.
     * Remember to stopListening() first.
     *
     * Addresses are 40-bit hex values, e.g.:
     *
     * @code
     *   openWritingPipe(0xF0F0F0F0F0);
     * @endcode
     *
     * @param address The 40-bit address of the pipe to open.  This can be
     * any value whatsoever, as long as you are the only one writing to it
     * and only one other radio is listening to it.  Coordinate these pipe
     * addresses amongst nodes on the network.
     */
    //void openWritingPipe(uint64_t address);
    nrf.openWritingPipe = function(address) {
        // Note that AVR 8-bit uC's store this LSB first, and the NRF24L01(+)
        // expects it LSB first too, so we're good.
        var buf = new Buffer(5);
        for (var i = 0; i < address.length; i++) {
            buf[i] = address[i];
        }
        writeRegister(consts.RX_ADDR_P0, buf);
        writeRegister(consts.TX_ADDR, buf);

        var max_payload_size = 32;
        var bufPay = new Buffer(1);
        bufPay[0] = Math.min(payload_size, max_payload_size);
        writeRegister(consts.RX_PW_P0, bufPay);
    };

    /**
     * Open a pipe for reading
     *
     * Up to 6 pipes can be open for reading at once.  Open all the
     * reading pipes, and then call startListening().
     *
     * @see openWritingPipe
     *
     * @warning Pipes 1-5 should share the first 32 bits.
     * Only the least significant byte should be unique, e.g.
     * @code
     *   openReadingPipe(1,0xF0F0F0F0AA);
     *   openReadingPipe(2,0xF0F0F0F066);
     * @endcode
     *
     * @warning Pipe 0 is also used by the writing pipe.  So if you open
     * pipe 0 for reading, and then startListening(), it will overwrite the
     * writing pipe.  Ergo, do an openWritingPipe() again before write().
     *
     * @warning Pipe 0 is also used as the multicast address pipe. Pipe 1
     * is the unicast pipe address.
     *
     * @todo Enforce the restriction that pipes 1-5 must share the top 32 bits
     *
     * @param number Which pipe# to open, 0-5.
     * @param address The 40-bit address of the pipe to open.
     */
    //void openReadingPipe(uint8_t number, uint64_t address);
    nrf.openReadingPipe = function(child, address, callback) {
        // If this is pipe 0, cache the address.  This is needed because
        // openWritingPipe() will overwrite the pipe 0 address, so
        // startListening() will have to restore it.
        
        if (child == 0) pipe0_reading_address = address;

        if (child <= 6) {
            // For pipes 2-5, only write the LSB
            if (child < 2) {
                var buf = new Buffer(5);
                for (var i = 0; i < address.length; i++) {
                    buf[i] = address[i];
                }
                console.log(buf);
                console.log(child_pipe[child]);
                writeRegister(child_pipe[child], buf);
            }
            else {
                var buf = new Buffer(1);
                //FIXME voir si c'est le Premier ou de dernier octet qui doit etre passé
                buf[0] = address[4];
                writeRegister(child_pipe[child], buf);
            }
            var buf = new Buffer(1);
            buf[0] = payload_size;
            writeRegister(child_payload_size[child], buf);

            // Note it would be more efficient to set all of the bits for all open
            // pipes at once.  However, I thought it would make the calling code
            // more simple to do it this way.
            readRegister(consts.EN_RXADDR, new Buffer(1), function(resultRX) {
                var buf = new Buffer(1);
                console.log("res");
                console.log(resultRX);
                console.log(child);
                console.log(child_pipe_enable[child]);
                
                buf[0] = resultRX[0] | _BV(child_pipe_enable[child]);
                buf[0] =3;
                writeRegister(consts.EN_RXADDR, buf);
                console.log("buf");
                console.log(buf);
                callback();
            });
        }
    };


    /**
     * Close a pipe after it has been previously opened.
     * Can be safely called without having previously opened a pipe.
     * @param pipe Which pipe # to close, 0-5.
     */
    //void closeReadingPipe( uint8_t pipe ) ;
    nrf.closeReadingPipe = function(pipe, callback) {
        readRegister(consts.EN_RXADDR, new Buffer(1), function(resultRX) {
            var buf = new Buffer(1);
            buf[0] = resultRX & ~_BV(child_pipe_enable[pipe]);
            writeRegister(consts.EN_RXADDR, buf);
            callback();
        });


    };

    /**@ //TODO
 
};*/
    /**
     * @name Optional Configurators
     *
     *  Methods you can use to get or set the configuration of the chip.
     *  None are required.  Calling begin() sets up a reasonable set of
     *  defaults.
     */
    /**@{*/
    /**
     * Set the number and delay of retries upon failed submit
     *
     * @param delay How long to wait between each retry, in multiples of 250us,
     * max is 15.  0 means 250us, 15 means 4000us.
     * @param count How many retries before giving up, max 15
     */
    //void setRetries(uint8_t delay, uint8_t count);
    nrf.setRetries = function(delay, count) {
        var buf = new Buffer(1);
        buf[0] = (delay & 0xf) << consts.ARD | (count & 0xf) << consts.ARC;
        writeRegister(consts.SETUP_RETR, buf);
    };

    /**@{*/
    /**
     * Get delay and count values of the radio
     *
     * @param high and low nibbles of delay and count as currently configured on
     * the radio. Valid ranges for both nibbles are 0x00-0x0f. The delay nibble
     * translates as 0=250us, 15=4000us, in bit multiples of 250us.
     */
    //uint8_t getRetries( void ) ;
    nrf.getRetries = function(callback) {

        readRegister(consts.SETUP_RETR, new Buffer(1), function(resultRetr) {
            callback(resultRetr[0]);
        });
    };

    /**
     * Set RF communication channel
     *
     * @param channel Which RF channel to communicate on, 0-127
     */
    //void setChannel(uint8_t channel);
    nrf.setChannel = function(channel) {
        // TODO: This method could take advantage of the 'wide_band' calculation
        // done in setChannel() to require certain channel spacing.


        var channelBuf = new Buffer(1);
        channelBuf[0] = channel;
        writeRegister(consts.RF_CH, channelBuf);
    };

    /**
     * Get RF communication channel
     *
     * @param channel To which RF channel radio is current tuned, 0-127
     */
    //uint8_t getChannel(void);
    nrf.getChannel = function(callback) {

        readRegister(consts.RF_CH, new Buffer(1), function(resultCH) {
            callback(resultCH[0]);
        });
    };

    /**
     * Set Static Payload Size
     *
     * This implementation uses a pre-stablished fixed payload size for all
     * transmissions.  If this method is never called,  the driver will always
     * transmit the maximum payload size (32 bytes), no matter how much
     * was sent to write().
     *
     * @todo Implement variable-sized payloads feature
     *
     * @param size The number of bytes in the payload
     */
    //void setPayloadSize(uint8_t size);
    nrf.setPayloadSize = function(size) {
        var max_payload_size = 32;
        payload_size = Math.min(size, max_payload_size);



    };

    /**
     * Get Static Payload Size
     *
     * @see setPayloadSize()
     *
     * @return The number of bytes in the payload
     */
    //uint8_t getPayloadSize(void);
    nrf.getPayloadSize = function() {
        return payload_size;

    };

    /**
     * Get Dynamic Payload Size
     *
     * For dynamic payloads, this pulls the size of the payload off
     * the chip
     *
     * @return Payload length of last-received dynamic payload
     */
    //uint8_t getDynamicPayloadSize(void);
    nrf.getDynamicPayloadSize = function(callback) {

        var buf = new Buffer(2);
        buf[0] = consts.R_RX_PL_WID;
        buf[1]=0xff;
        csnLow();
        spi.transfer(buf, new Buffer(2), function(device, bufRes) {
            csnHigh();
            callback(null,bufRes[1]);
        

        });

    };

    /**
     * Enable custom payloads on the acknowledge packets
     *
     * Ack payloads are a handy way to return data back to senders without
     * manually changing the radio modes on both units.
     *
     * @warning Do note, multicast payloads will not trigger ack payloads.
     *
     * @see examples/pingpair_pl/pingpair_pl.pde
     */
    //void enableAckPayload(void);
    nrf.enableAckPayload = function(callback) {
        //
        // enable ack payload and dynamic payload features
        //
        readRegister(consts.FEATURE, new Buffer(1), function(featureResult) {
            var buf = new Buffer(1);
            buf[0] = featureResult | _BV(consts.EN_DYN_ACK) | _BV(consts.EN_ACK_PAY) | _BV(consts.EN_DPL);
            writeRegister(consts.FEATURE, buf);

            // If it didn't work, the features are not enabled
            //FIXME : comment gerer ce cas
            /*
        if (!read_register(FEATURE)) {
            // So enable them and try again
            toggle_features();
            write_register(FEATURE, read_register(FEATURE) | _BV(EN_DYN_ACK) | _BV(EN_ACK_PAY) | _BV(EN_DPL));
        }
*/

            //IF_SERIAL_DEBUG(printf("FEATURE=%i\r\n", read_register(FEATURE)));

            //
            // Enable dynamic payload on pipes 0 & 1
            //
            readRegister(consts.DYNPD, new Buffer(1), function(dynPDResult) {
                var buf = new Buffer(1);
                buf[0] = dynPDResult | _BV(consts.DPL_P1) | _BV(consts.DPL_P0);
                write_register(consts.DYNPD, buf);
                callback();
            });
        });
    };

    /**
     * Enable dynamically-sized payloads
     *
     * This way you don't always have to send large packets just to send them
     * once in a while.  This enables dynamic payloads on ALL pipes.
     *
     * @see examples/pingpair_pl/pingpair_dyn.pde
     */
    //void enableDynamicPayloads(void);
    nrf.enableDynamicPayloads = function(callback) {
        // Enable dynamic payload throughout the system
        readRegister(consts.FEATURE, new Buffer(1), function(featureResult) {
            var buf = new Buffer(1);
            buf[0] = featureResult | _BV(consts.EN_DPL);
            writeRegister(consts.FEATURE, buf);

            //FIXME : comment gerer ce cas
            /*
        // If it didn't work, the features are not enabled
        if (!read_register(FEATURE)) {
            // So enable them and try again
            toggle_features();
            write_register(FEATURE, read_register(FEATURE) | _BV(EN_DPL));
        }
*/
            //   IF_SERIAL_DEBUG(printf("FEATURE=%i\r\n", read_register(FEATURE)));

            // Enable dynamic payload on all pipes
            //
            // Not sure the use case of only having dynamic payload on certain
            // pipes, so the library does not support it.
            readRegister(consts.DYNPD, new Buffer(1), function(dynPDResult) {
                var buf = new Buffer(1);
                buf[0] = dynPDResult | _BV(consts.DPL_P5) | _BV(consts.DPL_P4) | _BV(consts.DPL_P3) | _BV(consts.DPL_P2) | _BV(consts.DPL_P1) | _BV(consts.DPL_P0);
                writeRegister(consts.DYNPD, buf);

                dynamic_payloads_enabled = true;
                callback();
            });
        });
    };

    /**
     * Determine whether the hardware is an nRF24L01+ or not.
     *
     * @return true if the hardware is nRF24L01+ (or compatible) and false
     * if its not.
     */
    //bool isPVariant(void) ;
    nrf.isPVariant = function() {
        return p_variant;

    };

    /**
     * Enable or disable auto-acknowlede packets
     *
     * This is enabled by default, so it's only needed if you want to turn
     * it off for some reason.
     *
     * @param enable Whether to enable (true) or disable (false) auto-acks
     */
    //void setAutoAck(bool enable);

    /**
     * Enable or disable auto-acknowlede packets on a per pipeline basis.
     *
     * AA is enabled by default, so it's only needed if you want to turn
     * it off/on for some reason on a per pipeline basis.
     *
     * @param pipe Which pipeline to modify
     * @param enable Whether to enable (true) or disable (false) auto-acks
     */
    //void setAutoAck( uint8_t pipe, bool enable ) ;
    nrf.setAutoAck = function(pipe, enable, callback) {
        //cas setAutoAck(bool enable);
        if (callback == undefined) {
            callback = enable;
            enable = pipe;
            var buf = new Buffer(1)
            if (enable) buf[0] = parseInt('111111', 2);
            else buf[0] = 0;

            writeRegister(consts.EN_AA, buf);
            callback();
        }
        else {
            //cas //void setAutoAck( uint8_t pipe, bool enable ) ;
            if (pipe <= 6) {

                var en_aa = readRegister(consts.EN_AA, new Buffer(1), function(resultEnAA) {
                    if (enable) {
                        en_aa = resultEnAA[0] | _BV(pipe);
                    }
                    else {
                        en_aa = resultEnAA[0] & ~_BV(pipe);
                    }
                    var buf = new Buffer(1);
                    buf[0] = en_aa;
                    writeRegister(consts.EN_AA, buf);
                    callback();
                });
            }

        }
    };

    /**
     * Set Power Amplifier (PA) level to one of four levels.
     * Relative mnemonics have been used to allow for future PA level
     * changes. According to 6.5 of the nRF24L01+ specification sheet,
     * they translate to: RF24_PA_MIN=-18dBm, RF24_PA_LOW=-12dBm,
     * RF24_PA_HIGH=-6dBM, and RF24_PA_MAX=0dBm.
     *
     * @param level Desired PA level.
     */
    //void setPALevel( rf24_pa_dbm_e level ) ;
    nrf.setPALevel = function(level, callback) {
console.log(level);
        var setup = readRegister(consts.RF_SETUP, new Buffer(1), function(result) {
console.log(result);
            setup = result[0] & ~ (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));
console.log(setup);
            // switch uses RAM (evil!)
            if (level == consts.RF24_PA_MAX) {
                setup = setup | (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));
            }
            else if (level == consts.RF24_PA_HIGH) {
                setup = setup | _BV(consts.RF_PWR_HIGH);
            }
            else if (level == consts.RF24_PA_LOW) {
                console.log("LOW");
                setup = setup | _BV(consts.RF_PWR_LOW);
console.log(setup);
            }
            else if (level == consts.RF24_PA_MIN) {
                // nothing
            }
            else if (level == consts.RF24_PA_ERROR) {
                // On error, go to maximum PA
                setup = setup | (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));
            }

            var buf = new Buffer(1);
            buf[0] = setup;
            console.log(buf);
            writeRegister(consts.RF_SETUP, buf);
            callback(null);
        });

    };

    /**
     * Fetches the current PA level.
     *
     * @return Returns a value from the rf24_pa_dbm_e enum describing
     * the current PA setting. Please remember, all values represented
     * by the enum mnemonics are negative dBm. See setPALevel for
     * return value descriptions.
     */
    //rf24_pa_dbm_e getPALevel( void ) ;
    nrf.getPALevel = function(callback) {
        readRegister(consts.RF_SETUP, new Buffer(1), function(resultSetup) {
            var result = consts.RF24_PA_ERROR;
            var power = resultSetup[0] & (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));

            // switch uses RAM (evil!)
            if (power == (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH))) {
                result = consts.RF24_PA_MAX;
            }
            else if (power == _BV(consts.RF_PWR_HIGH)) {
                result = consts.RF24_PA_HIGH;
            }
            else if (power == _BV(consts.RF_PWR_LOW)) {
                result = consts.RF24_PA_LOW;
            }
            else {
                result = consts.RF24_PA_MIN;
            }

            callback(null,result);
        });
    };

    /**
     * Set the transmission data rate
     *
     * @warning setting RF24_250KBPS will fail for non-plus units
     *
     * @param speed RF24_250KBPS for 250kbs, RF24_1MBPS for 1Mbps, or RF24_2MBPS for 2Mbps
     * @return true if the change was successful
     */
    //bool setDataRate(rf24_datarate_e speed);
    nrf.setDataRate = function(speed, callback) {


        var setup = readRegister(consts.RF_SETUP, new Buffer(1), function(resultSetup) {

            // HIGH and LOW '00' is 1Mbs - our default
            wide_band = false;
            setup = resultSetup[0] & ~ (_BV(consts.RF_DR_LOW) | _BV(consts.RF_DR_HIGH));
            if (speed == consts.RF24_250KBPS) {
                // Must set the RF_DR_LOW to 1; RF_DR_HIGH (used to be RF_DR) is already 0
                // Making it '10'.
                wide_band = false;
                setup = setup | _BV(consts.RF_DR_LOW);
            }
            else {
                // Set 2Mbs, RF_DR (RF_DR_HIGH) is set 1
                // Making it '01'
                if (speed == consts.RF24_2MBPS) {
                    wide_band = true;
                    setup = setup | _BV(consts.RF_DR_HIGH);
                }
                else {
                    // 1Mbs
                    wide_band = false;
                }
            }
            var buf = new Buffer(1);
            buf[0] = setup;
            writeRegister(consts.RF_SETUP, buf); //FIXME callback

            // Verify our result

            readRegister(consts.RF_SETUP, new Buffer(1), function(resultSetup2) {
                var result = false;
                if (resultSetup2[0] == setup) {
                    result = true;
                }
                else {
                    wide_band = false;
                }


                callback(null,result);
            });
        });
    };

    /**
     * Fetches the transmission data rate
     *
     * @return Returns the hardware's currently configured datarate. The value
     * is one of 250kbs, RF24_1MBPS for 1Mbps, or RF24_2MBPS, as defined in the
     * rf24_datarate_e enum.
     */
    //rf24_datarate_e getDataRate( void ) ;
    nrf.getDataRate = function(callback) {
        readRegister(consts.RF_SETUP, new Buffer(1), function(resultSetup) {
     //       console.log("###");
      //      console.log(resultSetup[0]);
            var result;
            var dr = resultSetup[0] & (_BV(consts.RF_DR_LOW) | _BV(consts.RF_DR_HIGH));
        //    console.log(dr);
            // switch uses RAM (evil!)
            // Order matters in our case below
            if (dr == _BV(consts.RF_DR_LOW)) {
                // '10' = 250KBPS
          //      console.log("250");
                result = consts.RF24_250KBPS;
            //console.log(result);
            }
            else if (dr == _BV(consts.RF_DR_HIGH)) {
            //    console.log("2M");
                // '01' = 2MBPS
                result = consts.RF24_2MBPS;
            }
            else {
             //   console.log("1M");
                // '00' = 1MBPS
                result = consts.RF24_1MBPS;
            }
        //    console.log(result);
            callback(null,result);
        });
    };

    /**
     * Set the CRC length
     *
     * @param length RF24_CRC_8 for 8-bit or RF24_CRC_16 for 16-bit
     */
    //void setCRCLength(rf24_crclength_e length);
    nrf.setCRCLength = function(length, callback) {
        var config = readRegister(consts.CONFIG, new Buffer(1), function(result) {

            config = result[0] & ~ (_BV(consts.CRCO) | _BV(consts.EN_CRC));

            // switch uses RAM (evil!)
            if (length == consts.RF24_CRC_DISABLED) {
                // Do nothing, we turned it off above. 
            }
            else if (length == consts.RF24_CRC_8) {
                config = config | _BV(consts.EN_CRC);
            }
            else {
                config = config | _BV(consts.EN_CRC);
                config = config | _BV(consts.CRCO);
            }
            var buf = new Buffer(1);
            buf[0] = config;
            writeRegister(consts.CONFIG, buf);
            callback(null);
        });
    };

    /**
     * Get the CRC length
     *
     * @return RF24_DISABLED if disabled or RF24_CRC_8 for 8-bit or RF24_CRC_16 for 16-bit
     */
    //rf24_crclength_e getCRCLength(void);
    nrf.getCRCLength = function(callback) {
        readRegister(consts.CONFIG, new Buffer(1), function(resultConfig) {
            var result = consts.RF24_CRC_DISABLED;
            var config = resultConfig[0] & (_BV(consts.CRCO) | _BV(consts.EN_CRC));

            if (config & _BV(consts.EN_CRC)) {
                if (config & _BV(consts.CRCO)) result = consts.RF24_CRC_16;
                else result = consts.RF24_CRC_8;
            }

            callback(null,result);
        });
    };

    /**
     * Disable CRC validation
     *
     */
    //void disableCRC( void ) ;
    nrf.disableCRC = function(callback) {
        readRegister(consts.CONFIG, new Buffer(1), function(resultConfig) {
            var disable = resultConfig[0] & ~_BV(consts.EN_CRC);
            var buf = new Buffer(1);
            buf[0] = disable;
            writeRegister(consts.CONFIG, buf);
        });
    };

    /**@ //TODO
 
};*/
    /**
     * @name Advanced Operation
     *
     *  Methods you can use to drive the chip in more advanced ways
     */
    /**@{*/

    /**
     * Print a giant block of debugging information to stdout
     *
     * @warning Does nothing if stdout is not defined.  See fdevopen in stdio.h
     */
    //void printDetails(void);
    nrf.printDetails = function() {

        Q().then(function() {
            var deferred = Q.defer();
            get_status(deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function(status) {
            var deferred = Q.defer();
            
            print_status(status);
            deferred.resolve();
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            print_address_register("RX_ADDR_P0-1", [consts.RX_ADDR_P0,consts.RX_ADDR_P1], deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            print_byte_register("RX_ADDR_P2-5", [consts.RX_ADDR_P2,consts.RX_ADDR_P3,consts.RX_ADDR_P4,consts.RX_ADDR_P5], deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            print_address_register("TX_ADDR", [consts.TX_ADDR], deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            print_byte_register("RX_PW_P0-5", [consts.RX_PW_P0, consts.RX_PW_P1, consts.RX_PW_P2, consts.RX_PW_P3, consts.RX_PW_P4, consts.RX_PW_P5], deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            print_byte_register("EN_AA", [consts.EN_AA], deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            print_byte_register("EN_RXADDR", [consts.EN_RXADDR], deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            print_byte_register("RF_CH", [consts.RF_CH], deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            print_byte_register("RF_SETUP", [consts.RF_SETUP], deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            print_byte_register("CONFIG", [consts.CONFIG], deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            print_byte_register("DYNPD/FEATURE", [consts.DYNPD,consts.FEATURE], deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            nrf.getDataRate(deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function(dataRate) {
            var deferred = Q.defer();
            console.log("Data Rate\t = " + rf24_datarate_e_str_P[dataRate]);
            deferred.resolve();
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            console.log("Model\t\t = " + rf24_model_e_str_P[nrf.isPVariant()?1:0]);
            deferred.resolve();
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            nrf.getCRCLength(deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function(crc) {
            var deferred = Q.defer();
            console.log("CRC Length\t = " + rf24_crclength_e_str_P[crc]);
            deferred.resolve();
            return deferred.promise;
        }).then(function() {
            var deferred = Q.defer();
            nrf.getPALevel(deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function(pa) {
            var deferred = Q.defer();
            console.log("PA Power\t = " + rf24_pa_dbm_e_str_P[pa]);
            deferred.resolve();
            return deferred.promise;
        }).
        catch (function(error) {
            console.log("kkk");console.log(error);
        }).done();



    };

    /**
     * Enter low-power mode
     *
     * To return to normal power mode, either write() some data or
     * startListening, or powerUp().
     */
    //void powerDown(void);
    nrf.powerDown = function(callback) {
        readRegister(consts.CONFIG, new Buffer(1), function(configResult) {
            var buf = new Buffer(1);
            buf[0] = configResult[0] & ~_BV(consts.PWR_UP);
            writeRegister(consts.CONFIG, buf);
            callback();
        });

    };

    /**
     * Leave low-power mode - making radio more responsive
     *
     * To return to low power mode, call powerDown().
     */
    //void powerUp(void) ;
    nrf.powerUp = function(callback) {
        readRegister(consts.CONFIG, new Buffer(1), function(configResult) {
            var buf = new Buffer(1);
            buf[0] = configResult[0] | _BV(consts.PWR_UP);
            writeRegister(consts.CONFIG, buf);
            blockMicroseconds(TIMING['pd2stby']);
            callback();
        });
    };



    /**
     * Non-blocking write to the open writing pipe
     *
     * Just like write(), but it returns immediately. To find out what happened
     * to the send, catch the IRQ and then call whatHappened().
     *
     * @see write()
     * @see whatHappened()
     *
     * @param buf Pointer to the data to be sent
     * @param len Number of bytes to be sent
     * @param multicast true or false. True, buffer will be multicast; ignoring retry/timeout
     */
    //void startWrite( const void* buf, uint8_t len, const bool multicast=false );
    nrf.startWrite = function(bufIn, multicast, callback) {
        readRegister(consts.CONFIG, new Buffer(1), function(resultConfig) {
            // Transmitter power-up
            var buf = new Buffer(1);
            buf[0] = (resultConfig | _BV(consts.PWR_UP)) & ~_BV(consts.PRIM_RX);
            writeRegister(consts.CONFIG, buf);

            // Send the payload - Unicast (W_TX_PAYLOAD) or multicast (W_TX_PAYLOAD_NO_ACK)
            write_payload(bufIn,
            multicast ? consts.W_TX_PAYLOAD_NO_ACK : consts.W_TX_PAYLOAD, function(result) {

                // Allons!
                ceHigh();
                blockMicroseconds(TIMING["hce"]);
                ceLow();
                callback();
            });


        });
    };

    /**
     * Write an ack payload for the specified pipe
     *
     * The next time a message is received on @p pipe, the data in @p buf will
     * be sent back in the acknowledgement.
     *
     * @warning Do note, multicast payloads will not trigger ack payloads.
     *
     * @warning According to the data sheet, only three of these can be pending
     * at any time.  I have not tested this.
     *
     * @param pipe Which pipe# (typically 1-5) will get this response.
     * @param buf Pointer to data that is sent
     * @param len Length of the data to send, up to 32 bytes max.  Not affected
     * by the static payload set by setPayloadSize().
     */
    //void writeAckPayload(uint8_t pipe, const void* buf, uint8_t len);
    nrf.writeAckPayload = function(pipe, buf, callback) {
        csnLow();
        var buf1 = new Buffer(1 + buf.length);
        buf1[0] = consts.W_ACK_PAYLOAD | (pipe & parseInt('111', 2));

        for (var i = 0; i < buf.length; i++) {
            buf1[i + 1] = buf[i];
        };
        spi.transfer(buf1, new Buffer(buf1.length), function(device, rBuf) {
            csnHigh();
            callback(rBuf);
        });



    };

    /**
     * Determine if an ack payload was received in the most recent call to
     * write().
     *
     * Call read() to retrieve the ack payload.
     *
     * @warning Calling this function clears the internal flag which indicates
     * a payload is available.  If it returns true, you must read the packet
     * out as the very next interaction with the radio, or the results are
     * undefined.
     *
     * @return True if an ack payload is available.
     */
    //bool isAckPayloadAvailable(void);
    nrf.isAckPayloadAvailable = function() {
        var result = ack_payload_available;
        ack_payload_available = false;
        return result;
    };

    /**
     * Call this when you get an interrupt to find out why
     *
     * Tells you what caused the interrupt, and clears the state of
     * interrupts.
     *
     * @param[out] tx_ok The send was successful (TX_DS)
     * @param[out] tx_fail The send failed, too many retries (MAX_RT)
     * @param[out] rx_ready There is a message waiting to be read (RX_DS)
     */
    // void whatHappened(bool& tx_ok,bool& tx_fail,bool& rx_ready);
    nrf.whatHappened = function(callback) {
        // Read the status & reset the status in one easy call
        // Or is that such a good idea?
        var buf = new Buffer(1);
        buf[0] = _BV(consts.RX_DR) | _BV(consts.TX_DS) | _BV(consts.MAX_RT);
        writeRegister(consts.STATUS, buf);

        readRegister(consts.STATUS, new Buffer(1), function(resultStatus) {

            // Report to the user what happened
            callback({
                tx_ok: resultStatus & _BV(consts.TX_DS),
                tx_fail: resultStatus & _BV(consts.MAX_RT),
                rx_ready: resultStatus & _BV(consts.RX_DR)
            });

        });
    };

    /**
     * Test whether there was a carrier on the line for the
     * previous listening period.
     *
     * Useful to check for interference on the current channel.
     *
     * @return true if was carrier, false if not
     */
    //bool testCarrier(void);
    nrf.testCarrier = function(callback) {
        readRegister(consts.CD, new Buffer(1), function(resultCD) {
            callback(resultCD[0] & 1);
        });

    };

    /**
     * Test whether a signal (carrier or otherwise) greater than
     * or equal to -64dBm is present on the channel. Valid only
     * on nRF24L01P (+) hardware. On nRF24L01, use testCarrier().
     *
     * Useful to check for interference on the current channel and
     * channel hopping strategies.
     *
     * @return true if signal => -64dBm, false if not
     */
    //bool testRPD(void) ;
    nrf.testRPD = function(callback) {
        readRegister(consts.RPD, new Buffer(1), function(resultRPD) {
            callback(resultRPD[0] & 1);
        });
    };


    /**
     * Calculate the maximum timeout in us based on current hardware
     * configuration.
     *
     * @return us of maximum timeout; accounting for retries
     */
    // uint16_t getMaxTimeout(void) ;
    nrf.getMaxTimeout = function(callback) {
        var retries = getRetries(function(resultRetries) {
            var to = ((250 + (250 * ((resultRetries & 0xf0) >> 4))) * (resultRetries & 0x0f));

            callback(to)
        });
    };


    return nrf;


})();