'use strict';

//var b = require('bonescript');
var consts = require('./nRF24L01');
//var SPI = require('spi');

module.exports = (function () {

    /**
     * Power Amplifier level.
     *
     * For use with setPALevel()
     */
    //typedef enum { RF24_PA_MIN = 0,RF24_PA_LOW, RF24_PA_HIGH, RF24_PA_MAX, RF24_PA_ERROR  } rf24_pa_dbm_e ;
    var rf24_pa_dbm_e = [consts.RF24_PA_MIN, consts.RF24_PA_LOW, consts.RF24_PA_HIGH, consts.RF24_PA_MAX, consts.RF24_PA_ERROR];

	var rf24_datarate_e_str_P=[
  "1MBPS",
  "2MBPS",
  "250KBPS",
];
var rf24_model_e_str_P[
  "nRF24L01",
  "nRF24L01+",
];
var rf24_crclength_e_str_P[
  "Disabled",
   "8 bits",
  "16 bits",
];
var rf24_pa_dbm_e_str_P[
  "PA_MIN",
  "PA_LOW",
  "PA_HIGH",
  "PA_MAX",
];
	
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
    function csn(mode) {
        //TODO
    };;

    /**
     * Set chip enable
     *
     * @param level HIGH to actively begin transmission or LOW to put in standby.  Please see data sheet
     * for a much more detailed description of this pin.
     */
    //void ce(int level)
    function ce(level) {
        //TODO

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
    function read_register(reg, buf, len) {
        //TODO

    };

    /**
     * Read single byte from a register
     *
     * @param reg Which register. Use constants from nRF24L01.h
     * @return Current value of register @p reg
     */
    //uint8_t read_register(uint8_t reg);
    function read_register(reg) {
        //TODO

    };

    /**
     * Write a chunk of data to a register
     *
     * @param reg Which register. Use constants from nRF24L01.h
     * @param buf Where to get the data
     * @param len How many bytes of data to transfer
     * @return Current value of status register
     */
    //uint8_t write_register(uint8_t reg, const uint8_t* buf, uint8_t len);
    function write_register(reg, buf, len) {
        //TODO

    };

    /**
     * Write a single byte to a register
     *
     * @param reg Which register. Use constants from nRF24L01.h
     * @param value The new value to write
     * @return Current value of status register
     */
    //uint8_t write_register(uint8_t reg, uint8_t value);
    function write_register(reg, value) {
        //TODO

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
        //TODO

    };

    /**
     * Empty the transmit buffer
     *
     * @return Current value of status register
     */
    //uint8_t flush_tx(void);
    function flush_tx() {
        //TODO

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

        var extra_tab = strlen_P(name) < 8 ? '\t' : '';
        var string = name + "\t" + extra_tab + " =";
        while (qty) {
            string = string + " 0x" + read_register(reg++);
            qty--;
        }
        console.log(string);

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
    nrf.RF24 = function (_cepin, _cspin) {
        //TODO

    };

    /**
     * Begin operation of the chip
     *
     * Call this in setup(), before calling any other methods.
     */
    //void begin(void);
    nrf.begin = function () {
        //TODO

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
        write_register(consts.CONFIG, read_register(consts.CONFIG) | _BV(consts.PWR_UP) | _BV(consts.PRIM_RX));
        write_register(consts.STATUS, _BV(consts.RX_DR) | _BV(consts.TX_DS) | _BV(consts.MAX_RT));

        // Restore the pipe0 adddress, if exists
        if (pipe0_reading_address)
            write_register(consts.RX_ADDR_P0, pipe0_reading_address, 5);

        //FIXME a faire ce if ? 
        //#if 0
        // Flush buffers
        flush_rx();
        flush_tx();
        //#endif

        // Go!
        ce(consts.HIGH);

        // wait for the radio to come up (130us actually only needed)
        delayMicroseconds(130);

    };

    /**
     * Stop listening for incoming messages
     *
     * Do this before calling write().
     */
    //void stopListening(void);
    nrf.stopListening = function () {
        ce(consts.LOW);
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
        var status = get_status();

        // Too noisy, enable if you really want lots o data!!
        //IF_SERIAL_DEBUG(print_status(status));

        var result = (status & _BV(consts.RX_DR));

        if (result) {
            // If the caller wants the pipe number, include that
            if (pipe_num)
            //*pipe_num = ( status >> RX_P_NO ) & B111;
                pipe_num = (status >> consts.RX_P_NO) & parseInt('111', 2);

            // Clear the status bit

            // ??? Should this REALLY be cleared now?  Or wait until we
            // actually READ the payload?

            write_register(consts.STATUS, _BV(consts.RX_DR));

            // Handle ack payload receipt
            if (status & _BV(consts.TX_DS)) {
                write_register(consts.STATUS, _BV(consts.TX_DS));
            }
        }

        return result;

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
        // Fetch the payload
        read_payload(buf, len);

        // was this the last of the data available?
        return read_register(consts.FIFO_STATUS) & _BV(consts.RX_EMPTY);

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
        // Note that AVR 8-bit uC's store this LSB first, and the NRF24L01(+)
        // expects it LSB first too, so we're good.

        write_register(consts.RX_ADDR_P0, address, 5);
        write_register(consts.TX_ADDR, address, 5);

        var max_payload_size = 32;
        write_register(consts.RX_PW_P0, min(payload_size, max_payload_size));

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
        // If this is pipe 0, cache the address.  This is needed because
        // openWritingPipe() will overwrite the pipe 0 address, so
        // startListening() will have to restore it.
        if (child == 0)
            pipe0_reading_address = address;

        if (child <= 6) {
            // For pipes 2-5, only write the LSB
            if (child < 2)
            //write_register(child_pipe[child], reinterpret_cast<const uint8_t*>(&address), 5);
                write_register(child_pipe[child], address, 5);
            else
            //write_register(child_pipe[child], reinterpret_cast<const uint8_t*>(&address), 1);
                write_register(child_pipe[child], address, 1);

            write_register(child_payload_size[child], payload_size);

            // Note it would be more efficient to set all of the bits for all open
            // pipes at once.  However, I thought it would make the calling code
            // more simple to do it this way.
            write_register(consts.EN_RXADDR, read_register(consts.EN_RXADDR) | _BV(child_pipe_enable[child]));
        }

    };


    /**
     * Close a pipe after it has been previously opened.
     * Can be safely called without having previously opened a pipe.
     * @param pipe Which pipe # to close, 0-5.
     */
    //void closeReadingPipe( uint8_t pipe ) ;
    nrf.closeReadingPipe = function (pipe) {
        write_register(consts.EN_RXADDR, read_register(consts.EN_RXADDR) & ~_BV(child_pipe_enable[pipe]));

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
        write_register(consts.SETUP_RETR, (delay & 0xf) << consts.ARD | (count & 0xf) << consts.ARC);
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
        return read_register(consts.SETUP_RETR);
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

        var max_channel = 127;
        write_register(consts.RF_CH, min(channel, max_channel));

    };

    /**
     * Get RF communication channel
     *
     * @param channel To which RF channel radio is current tuned, 0-127
     */
    //uint8_t getChannel(void);
    nrf.getChannel = function () {
        return read_register(consts.RF_CH);

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
        //
        // enable ack payload and dynamic payload features
        //

        write_register(consts.FEATURE, read_register(consts.FEATURE) | _BV(consts.EN_DYN_ACK) | _BV(consts.EN_ACK_PAY) | _BV(consts.EN_DPL));

        // If it didn't work, the features are not enabled
        if (!read_register(consts.FEATURE)) {
            // So enable them and try again
            toggle_features();
            write_register(consts.FEATURE, read_register(consts.FEATURE) | _BV(consts.EN_DYN_ACK) | _BV(consts.EN_ACK_PAY) | _BV(consts.EN_DPL));
        }

        console.log("FEATURE=\t" + read_register(consts.FEATURE));

        //
        // Enable dynamic payload on pipes 0 & 1
        //

        write_register(consts.DYNPD, read_register(consts.DYNPD) | _BV(consts.DPL_P1) | _BV(consts.DPL_P0));

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
        // Enable dynamic payload throughout the system
        write_register(consts.FEATURE, read_register(consts.FEATURE) | _BV(consts.EN_DPL));

        // If it didn't work, the features are not enabled
        if (!read_register(consts.FEATURE)) {
            // So enable them and try again
            toggle_features();
            write_register(consts.FEATURE, read_register(consts.FEATURE) | _BV(consts.EN_DPL));
        }

        console.log("FEATURE=\t" + read_register(consts.FEATURE));

        // Enable dynamic payload on all pipes
        //
        // Not sure the use case of only having dynamic payload on certain
        // pipes, so the library does not support it.
        write_register(consts.DYNPD, read_register(consts.DYNPD) | _BV(consts.DPL_P5) | _BV(consts.DPL_P4) | _BV(consts.DPL_P3) | _BV(consts.DPL_P2) | _BV(consts.DPL_P1) | _BV(consts.DPL_P0));

        dynamic_payloads_enabled = true;

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

        if (enable == undefined) {
            //cas (enable)        
            enable = pipe;
            if (enable)
                write_register(consts.EN_AA, parseInt('111111', 2));
            else
                write_register(consts.EN_AA, 0);

        } else {
            //cas (pipe, enable)
            if (pipe <= 6) {
                var en_aa = read_register(consts.EN_AA);
                if (enable) {
                    en_aa = en_aa | _BV(pipe);
                } else {
                    en_aa = en_aa & ~_BV(pipe);
                }
                write_register(consts.EN_AA, en_aa);
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
    nrf.setPALevel = function (level) {
        var setup = read_register(consts.RF_SETUP);
        var setup = setup & ~(_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));

        // switch uses RAM (evil!)
        if (level == consts.RF24_PA_MAX) {
            setup = setup | (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));
        } else if (level == consts.RF24_PA_HIGH) {
            setup = setup | _BV(consts.RF_PWR_HIGH);
        } else if (level == consts.RF24_PA_LOW) {
            setup = setup | _BV(consts.RF_PWR_LOW);
        } else if (level == consts.RF24_PA_MIN) {
            // nothing
        } else if (level == consts.RF24_PA_ERROR) {
            // On error, go to maximum PA
            setup = setup | (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));
        }

        write_register(consts.RF_SETUP, setup);

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
        var result = consts.RF24_PA_ERROR;
        var power = read_register(consts.RF_SETUP) & (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH));

        // switch uses RAM (evil!)
        if (power == (_BV(consts.RF_PWR_LOW) | _BV(consts.RF_PWR_HIGH))) {
            result = consts.RF24_PA_MAX;
        } else if (power == _BV(consts.RF_PWR_HIGH)) {
            result = consts.RF24_PA_HIGH;
        } else if (power == _BV(consts.RF_PWR_LOW)) {
            result = consts.RF24_PA_LOW;
        } else {
            result = consts.RF24_PA_MIN;
        }

        return result;

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
    nrf.setDataRate = function (speed) {
        var result = false;
        var setup = read_register(consts.RF_SETUP);

        // HIGH and LOW '00' is 1Mbs - our default
        var wide_band = false;
        var setup = setup & ~(_BV(consts.RF_DR_LOW) | _BV(consts.RF_DR_HIGH));
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
        write_register(consts.RF_SETUP, setup);

        // Verify our result
        if (read_register(consts.RF_SETUP) == setup) {
            result = true;
        } else {
            wide_band = false;
        }

        return result;

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
        var result;
        var dr = read_register(consts.RF_SETUP) & (_BV(consts.RF_DR_LOW) | _BV(consts.RF_DR_HIGH));

        // switch uses RAM (evil!)
        // Order matters in our case below
        if (dr == _BV(consts.RF_DR_LOW)) {
            // '10' = 250KBPS
            result = consts.RF24_250KBPS;
        } else if (dr == _BV(consts.RF_DR_HIGH)) {
            // '01' = 2MBPS
            result = consts.RF24_2MBPS;
        } else {
            // '00' = 1MBPS
            result = consts.RF24_1MBPS;
        }
        return result;

    };

    /**
     * Set the CRC length
     *
     * @param length RF24_CRC_8 for 8-bit or RF24_CRC_16 for 16-bit
     */
    //void setCRCLength(rf24_crclength_e length);
    nrf.setCRCLength = function (length) {
        var config = read_register(consts.CONFIG) & ~(_BV(consts.CRCO) | _BV(consts.EN_CRC));

        // switch uses RAM (evil!)
        if (length == consts.RF24_CRC_DISABLED) {
            //FIXME ? 
            // Do nothing, we turned it off above. 
        } else if (length == consts.RF24_CRC_8) {
            config |= _BV(consts.EN_CRC);
        } else {
            config |= _BV(consts.EN_CRC);
            config |= _BV(consts.CRCO);
        }
        write_register(consts.CONFIG, config);

    };

    /**
     * Get the CRC length
     *
     * @return RF24_DISABLED if disabled or RF24_CRC_8 for 8-bit or RF24_CRC_16 for 16-bit
     */
    //rf24_crclength_e getCRCLength(void);
    nrf.getCRCLength = function () {
        var result = consts.RF24_CRC_DISABLED;
        var config = read_register(consts.CONFIG) & (_BV(consts.CRCO) | _BV(consts.EN_CRC));

        if (config & _BV(consts.EN_CRC)) {
            if (config & _BV(consts.CRCO))
                result = consts.RF24_CRC_16;
            else
                result = consts.RF24_CRC_8;
        }

        return result;

    };

    /**
     * Disable CRC validation
     *
     */
    //void disableCRC( void ) ;
    nrf.disableCRC = function () {
        var disable = read_register(consts.CONFIG) & ~_BV(consts.EN_CRC);
        write_register(consts.CONFIG, disable);

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
        print_status(get_status());

        print_address_register("RX_ADDR_P0-1", consts.RX_ADDR_P0, 2);
        print_byte_register("RX_ADDR_P2-5", consts.RX_ADDR_P2, 4);
        print_address_register("TX_ADDR", consts.TX_ADDR);

        print_byte_register("RX_PW_P0-6", consts.RX_PW_P0, 6);
        print_byte_register("EN_AA", consts.EN_AA);
        print_byte_register("EN_RXADDR", consts.EN_RXADDR);
        print_byte_register("RF_CH", consts.RF_CH);
        print_byte_register("RF_SETUP", consts.RF_SETUP);
        print_byte_register("CONFIG", consts.CONFIG);
        print_byte_register("DYNPD/FEATURE", consts.DYNPD, 2);

        console.log("Data Rate\t = " + rf24_datarate_e_str_P[getDataRate()]);
        console.log("Model\t\t = " + rf24_model_e_str_P[isPVariant()]);
        console.log("CRC Length\t = " + rf24_crclength_e_str_P[getCRCLength()]);
        console.log("PA Power\t = " + rf24_pa_dbm_e_str_P[getPALevel()]);


    };

    /**
     * Enter low-power mode
     *
     * To return to normal power mode, either write() some data or
     * startListening, or powerUp().
     */
    //void powerDown(void);
    nrf.powerDown = function () {
        write_register(consts.CONFIG, read_register(consts.CONFIG) & ~_BV(consts.PWR_UP));

    };

    /**
     * Leave low-power mode - making radio more responsive
     *
     * To return to low power mode, call powerDown().
     */
    //void powerUp(void) ;
    nrf.powerUp = function () {
        write_register(consts.CONFIG, read_register(consts.CONFIG) | _BV(consts.PWR_UP));
        delayMicroseconds(150);

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
        multicast = typeof multicast !== 'undefined' ? multicast : false;

        // Transmitter power-up
        write_register(consts.CONFIG, (read_register(consts.CONFIG) | _BV(consts.PWR_UP)) & ~_BV(consts.PRIM_RX));

        // Send the payload - Unicast (W_TX_PAYLOAD) or multicast (W_TX_PAYLOAD_NO_ACK)
        write_payload(buf, len,
            multicast ? consts.W_TX_PAYLOAD_NO_ACK : consts.W_TX_PAYLOAD);

        // Allons!
        ce(HIGH);
        delayMicroseconds(10);
        ce(LOW);

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
    nrf.whatHappened = function (tx_ok, tx_fail, rx_ready) {
        //FIXME  les données doivent etre en mode OUT
        // Read the status & reset the status in one easy call
        // Or is that such a good idea?
        var status = write_register(consts.STATUS, _BV(consts.RX_DR) | _BV(consts.TX_DS) | _BV(consts.MAX_RT));

        // Report to the user what happened
        tx_ok = status & _BV(consts.TX_DS);
        tx_fail = status & _BV(consts.MAX_RT);
        rx_ready = status & _BV(consts.RX_DR);

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
        return (read_register(consts.CD) & 1);

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
        return (read_register(consts.RPD) & 1);

    };


    /**
     * Calculate the maximum timeout in us based on current hardware
     * configuration.
     *
     * @return us of maximum timeout; accounting for retries
     */
    // uint16_t getMaxTimeout(void) ;
    nrf.getMaxTimeout = function () {
        var retries = this.getRetries();
        var to = ((250 + (250 * ((retries & 0xf0) >> 4))) * (retries & 0x0f));

        return to;

    };


    return nrf;


})();