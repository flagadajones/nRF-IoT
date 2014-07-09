'use strict';

var b = require('bonescript');
var consts = require('./nRF24L01');
var SPI = require('spi');
var q = require('queue-async');
var Q = require('q');
module.exports = (function () {

        var TIMING = {
            pd2stby: 150, // NOTE: varies dep. on crystal configuration, see p.24/p.19
            stby2a: 130,
            hce: 10,
            pece2csn: 5 //4
        };

        function blockMicroseconds(us) {
            var process = q(1);
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
        var rf24_pa_dbm_e = [consts.RF24_PA_MIN, consts.RF24_PA_LOW, consts.RF24_PA_HIGH, consts.RF24_PA_MAX, consts.RF24_PA_ERROR];

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
        var rf24_datarate_e = [consts.RF24_1MBPS, consts.RF24_2MBPS, consts.RF24_250KBPS];


        /**
         * CRC Length.  How big (if any) of a CRC is included.
         *
         * For use with setCRCLength()
         */
        //typedef enum { RF24_CRC_DISABLED = 0, RF24_CRC_8, RF24_CRC_16 }; rf24_crclength_e;
        var rf24_crclength_e = [consts.RF24_CRC_DISABLED, consts.RF24_CRC_8, consts.RF24_CRC_16];

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
        var wide_band; /* bool 2Mbs data rate in use? */
        var p_variant; /* bool False for RF24L01 and true for RF24L01P */
        var payload_size; /* uint8_t *< Fixed size of payloads */
        var ack_payload_available; /* bool *< Whether there is an ack payload waiting */
        var dynamic_payloads_enabled; /* bool *< Whether dynamic payloads are enabled. */
        var ack_payload_length; /* uint8_t *< Dynamic size of pending ack payload. */
        var pipe0_reading_address; /* uint64_t *< Last address set on pipe 0 for reading. */

        var nrf = {};
        var spi;

        function _BV(x) {
            return 1 << (x)
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
            b.digitalWrite(csnPin, b.HIGH);
        };

        function csnLow() {
            b.digitalWrite(csnPin, b.LOW);
        };


        /**
         * Set chip enable
         *
         * @param level HIGH to actively begin transmission or LOW to put in standby.  Please see data sheet
         * for a much more detailed description of this pin.
         */
        //void ce(int level)

        function ceHigh() {
            b.digitalWrite(cePin, b.HIGH);
        };

        function ceLow() {
            b.digitalWrite(cePin, b.LOW);
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
            this.csnLow();
            var buf1 = new Buffer(1 + val.length);
            buf1[0] = consts.READ_REGISTER | (consts.REGISTER_MASK & reg);

            for (var i = 0; i < val.length; i++) {
                buf1[i + 1] = val[i];
            }

            spi.transfer(buf1, new Buffer(buf1.length), function (device, buf) {
                var rBuf = new Buffer(buf.length - 1);
                for (var i = 1; i < buf.length; i++) {
                    rBuf[i - 1] = buf[i];
                }
                this.csnHigh();
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
            this.csnLow();
            var b = new Buffer(1 + buffer.length);
            b[0] = consts.WRITE_REGISTER | (consts.REGISTER_MASK & reg);

            for (var i = 0; i < buffer.length; i++) {
                b[i + 1] = buffer[i];
            }

            spi.write(b);
            this.csnHigh();
        };
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
    function write_payload(buf, len, writeType) {
        //TODO

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
    function read_payload(buf, len) {
        //TODO

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

        this.csnLow();
        spi.write(flushBuf);
        this.csnHigh();
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

        this.csnLow();
        spi.write(flushBuf);
        this.csnHigh();

    };

    /**
     * Retrieve the current status of the chip
     *
     * @return Current value of status register
     */
    //  uint8_t get_status(void);
    function get_status() {
        //TODO

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
        console.log("STATUS\t\t = 0x" + status + " RX_DR=" + (status & _BV(consts.RX_DR)) ? 1 : 0 + " TX_DS=" + (status & _BV(consts.TX_DS)) ? 1 : 0 + " MAX_RT=" + (status & _BV(consts.MAX_RT)) ? 1 : 0 + " RX_P_NO=" + ((status >> consts.RX_P_NO) & parseInt('111', 2)) + " TX_FULL=" + (status & _BV(consts.TX_FULL)) ? 1 : 0);
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
    function print_byte_register(name, reg, qty) {
        qty = typeof qty !== 'undefined' ? qty : 1;

        //TODO
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
    function print_address_register(name, reg, qty) {
        qty = typeof qty !== 'undefined' ? qty : 1;
        //TODO

    };

    /**
     * Turn on or off the special features of the chip
     *
     * The chip has certain 'features' which are only available when the 'features'
     * are enabled.  See the datasheet for details.
     */
    //void toggle_features(void);
    function toggle_features() {
        //TODO

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
    nrf.RF24 = function (spiDev, _cepin, _cspin) {
        //TODO
        ce_pin = _cepin;

        csn_pin = _cspin;


        wide_band = false;
        p_variant = false;
        payload_size = 32;
        ack_payload_available = false = ;
        dynamic_payloads_enabled = false;
        pipe0_reading_address = 0;
    };

    /**
     * Begin operation of the chip
     *
     * Call this in setup(), before calling any other methods.
     */
    //void begin(void);
    nrf.begin = function () {
        // Initialize pins
        b.pinMode(ce_pin, b.OUTPUT);
        b.pinMode(csn_pin, b.OUTPUT);

        // Initialize SPI bus
        spi = new SPI.Spi(spiDev);
        spi.maxSpeed(10000000);
        spi.open();

        this.ceLow();
        this.csnHigh();

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
            setPALevel(consts.RF24_PA_MAX, deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function () {
            var deferred = Q.defer();
            // Determine if this is a p or non-p RF24 module and then
            // reset our data rate back to default value. This works
            // because a non-P variant won't allow the data rate to
            // be set to 250Kbps.

            setDataRate(consts.RF24_250KBPS, deferred.makeNodeResolver());
            return deferred.promise;

        }).then(function (result) {
            var deferred = Q.defer();

            if (result) {
                p_variant = true;
            }
            // Then set the data rate to the slowest (and most reliable) speed supported by all
            // hardware.
            setDataRate(consts.RF24_1MBPS, deferred.makeNodeResolver());
            return deferred.promise;
        }).then(function (result) {
            var deferred = Q.defer();
            // Initialize CRC and request 2-byte (16bit) CRC
            setCRCLength(consts.RF24_CRC_16, deferred.makeNodeResolver());

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

            write_register(consts.STATUS, buf);

            // Set up default configuration.  Callers can always change it later.
            // This channel should be universally safe and not bleed over into adjacent
            // spectrum.
            setChannel(76);
            // Flush buffers
            flush_rx();
            flush_tx();

        });






    };

    /**
     * Start listening on the pipes opened for reading.
     *
     * Be sure to call openReadingPipe() first.  Do not call write() while
     * in this mode, without first calling stopListening().  Call
     * isAvailable() to check for incoming traffic, and read() to get it.
     */
    //void startListening(void);
    nrf.startListening = function () {
        //TODO

    };

    /**
     * Stop listening for incoming messages
     *
     * Do this before calling write().
     */
    //void stopListening(void);
    nrf.stopListening = function () {
        //TODO
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
    nrf.write = function (buf, len, multicast) {
        multicast = typeof multicast !== 'undefined' ? multicast : false;
        //TODO

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
    nrf.available = function (pipe_num) {
        //TODO
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
    nrf.read = function (buf, len) {
        //TODO
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
    nrf.openWritingPipe = function (address) {
        //TODO


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
    nrf.openReadingPipe = function (child, address) {
        //TODO
    };


    /**
     * Close a pipe after it has been previously opened.
     * Can be safely called without having previously opened a pipe.
     * @param pipe Which pipe # to close, 0-5.
     */
    //void closeReadingPipe( uint8_t pipe ) ;
    nrf.closeReadingPipe = function (pipe) {
        //TODO

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
    nrf.setRetries = function (delay, count) {
        //TODO
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
    nrf.getRetries = function () {
        //TODO
    };

    /**
     * Set RF communication channel
     *
     * @param channel Which RF channel to communicate on, 0-127
     */
    //void setChannel(uint8_t channel);
    nrf.setChannel = function (channel) {
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
    nrf.getChannel = function () {
        read_register(RF_CH);
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
    nrf.setPayloadSize = function (size) {
        var max_payload_size = 32;
        payload_size = min(size, max_payload_size);



    };

    /**
     * Get Static Payload Size
     *
     * @see setPayloadSize()
     *
     * @return The number of bytes in the payload
     */
    //uint8_t getPayloadSize(void);
    nrf.getPayloadSize = function () {
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
    nrf.getDynamicPayloadSize = function () {
        //TODO

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
    nrf.enableAckPayload = function () {
        //TODO
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
    nrf.enableDynamicPayloads = function () {
        //TODO
    };

    /**
     * Determine whether the hardware is an nRF24L01+ or not.
     *
     * @return true if the hardware is nRF24L01+ (or compatible) and false
     * if its not.
     */
    //bool isPVariant(void) ;
    nrf.isPVariant = function () {
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
    nrf.setAutoAck = function (pipe, enable) {
        //TODO
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
    nrf.setPALevel = function (level, cb) {
        var setup = readRegister(consts.RF_SETUP, new Buffer(1), function (result) {

            setup = result[0] & ~(_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));

            // switch uses RAM (evil!)
            if (level == consts.RF24_PA_MAX) {
                setup |= (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));
            } else if (level == consts.RF24_PA_HIGH) {
                setup |= _BV(consts.RF_PWR_HIGH);
            } else if (level == consts.RF24_PA_LOW) {
                setup |= _BV(consts.RF_PWR_LOW);
            } else if (level == consts.RF24_PA_MIN) {
                // nothing
            } else if (level == consts.RF24_PA_ERROR) {
                // On error, go to maximum PA
                setup |= (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));
            }

            var buf = new Buffer(1);
            buf[0] = setup;
            write_register(consts.RF_SETUP, buf);
            cb();
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
    nrf.getPALevel = function () {
        //TODO
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
    nrf.setDataRate = function (speed, cb) {


        var setup = readRegister(consts.RF_SETUP, new Buffer(1), function (resultSetup) {

            // HIGH and LOW '00' is 1Mbs - our default
            wide_band = false;
            setup = resultSetup & ~(_BV(consts.RF_DR_LOW) | _BV(consts.RF_DR_HIGH));
            if (speed == consts.RF24_250KBPS) {
                // Must set the RF_DR_LOW to 1; RF_DR_HIGH (used to be RF_DR) is already 0
                // Making it '10'.
                wide_band = false;
                setup = setup | _BV(consts.RF_DR_LOW);
            } else {
                // Set 2Mbs, RF_DR (RF_DR_HIGH) is set 1
                // Making it '01'
                if (speed == consts.RF24_2MBPS) {
                    wide_band = true;
                    setup = setup | _BV(consts.RF_DR_HIGH);
                } else {
                    // 1Mbs
                    wide_band = false;
                }
            }
            var buf = new Buffer(1);
            buf[0] = setup;
            writeRegister(consts.RF_SETUP, buf); //FIXME callback

            // Verify our result

            readRegister(consts.RF_SETUP, new Buffer(1), function (resultSetup2) {
                var result = false;
                if (resultSetup2 == setup) {
                    result = true;
                } else {
                    wide_band = false;
                }


                cb(result);
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
    nrf.getDataRate = function () {
        //TODO
    };

    /**
     * Set the CRC length
     *
     * @param length RF24_CRC_8 for 8-bit or RF24_CRC_16 for 16-bit
     */
    //void setCRCLength(rf24_crclength_e length);
    nrf.setCRCLength = function (length, cb) {
        var config = read_register(consts.CONFIG, new Buffer(1), function (result) {

            config = result & ~(_BV(consts.CRCO) | _BV(consts.EN_CRC));

            // switch uses RAM (evil!)
            if (length == consts.RF24_CRC_DISABLED) {
                // Do nothing, we turned it off above. 
            } else if (length == consts.RF24_CRC_8) {
                config = config | _BV(consts.EN_CRC);
            } else {
                config = config | _BV(consts.EN_CRC);
                config = config | _BV(consts.CRCO);
            }
            write_register(consts.CONFIG, config);
            cb();
        });
    };

    /**
     * Get the CRC length
     *
     * @return RF24_DISABLED if disabled or RF24_CRC_8 for 8-bit or RF24_CRC_16 for 16-bit
     */
    //rf24_crclength_e getCRCLength(void);
    nrf.getCRCLength = function () {
        //TODO
    };

    /**
     * Disable CRC validation
     *
     */
    //void disableCRC( void ) ;
    nrf.disableCRC = function () {
        //TODO
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
    nrf.printDetails = function () {
        //TODO

    };

    /**
     * Enter low-power mode
     *
     * To return to normal power mode, either write() some data or
     * startListening, or powerUp().
     */
    //void powerDown(void);
    nrf.powerDown = function () {
        //TODO
    };

    /**
     * Leave low-power mode - making radio more responsive
     *
     * To return to low power mode, call powerDown().
     */
    //void powerUp(void) ;
    nrf.powerUp = function () {
        //TODO
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
    nrf.startWrite = function (buf, len, multicast) {
        //TODO
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
    nrf.writeAckPayload = function (pipe, buf, len) {
        //TODO

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
    nrf.isAckPayloadAvailable = function () {
        //TODO
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
    nrf.whatHappened = function (tx_ok, tx_fail, rx_ready) {
        //TODO
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
    nrf.testCarrier = function () {
        //TODO
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
    nrf.testRPD = function () {
        //TODO
    };


    /**
     * Calculate the maximum timeout in us based on current hardware
     * configuration.
     *
     * @return us of maximum timeout; accounting for retries
     */
    // uint16_t getMaxTimeout(void) ;
    nrf.getMaxTimeout = function () {
        //TODO

    };

    //Initialization
    b.pinMode(ce_Pin, b.OUTPUT); b.pinMode(csn_Pin, b.OUTPUT); nrf.ceLow(); nrf.csnHigh();

    return nrf;


})();