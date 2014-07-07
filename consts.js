var consts = {};


consts.MAX_CHANNEL = 127;
consts.MAX_PAYLOAD_SIZE = 32;

// PA Levels
consts.PA_MIN = 0;
consts.PA_LOW = 1;
consts.PA_HIGH = 2;
consts.PA_MAX = 3;
consts.PA_ERROR = 4;

// Bit rates
consts.BR_1MBPS = 0;
consts.BR_2MBPS = 1;
consts.BR_250KBPS = 2;

// CRC
consts.CRC_DISABLED = 0;
consts.CRC_8 = 1;
consts.CRC_16 = 2;
consts.CRC_ENABLED = 3;

// Registers
consts.CONFIG = 0x00;
consts.EN_AA = 0x01;
consts.EN_RXADDR = 0x02;
consts.SETUP_AW = 0x03;
consts.SETUP_RETR = 0x04;
consts.RF_CH = 0x05;
consts.RF_SETUP = 0x06;
consts.STATUS = 0x07;
consts.OBSERVE_TX = 0x08;
consts.CD = 0x09;
consts.RX_ADDR_P0 = 0x0A;
consts.RX_ADDR_P1 = 0x0B;
consts.RX_ADDR_P2 = 0x0C;
consts.RX_ADDR_P3 = 0x0D;
consts.RX_ADDR_P4 = 0x0E;
consts.RX_ADDR_P5 = 0x0F;
consts.TX_ADDR = 0x10;
consts.RX_PW_P0 = 0x11;
consts.RX_PW_P1 = 0x12;
consts.RX_PW_P2 = 0x13;
consts.RX_PW_P3 = 0x14;
consts.RX_PW_P4 = 0x15;
consts.RX_PW_P5 = 0x16;
consts.FIFO_STATUS = 0x17;
consts.DYNPD = 0x1C;
consts.FEATURE = 0x1D;


// Bit Mnemonics
consts.MASK_RX_DR = 6;
consts.MASK_TX_DS = 5;
consts.MASK_MAX_RT = 4;
consts.EN_CRC = 3;
consts.CRCO = 2;
consts.PWR_UP = 1;
consts.PRIM_RX = 0;
consts.ENAA_P5 = 5;
consts.ENAA_P4 = 4;
consts.ENAA_P3 = 3;
consts.ENAA_P2 = 2;
consts.ENAA_P1 = 1;
consts.ENAA_P0 = 0;
consts.ERX_P5 = 5;
consts.ERX_P4 = 4;
consts.ERX_P3 = 3;
consts.ERX_P2 = 2;
consts.ERX_P1 = 1;
consts.ERX_P0 = 0;
consts.AW = 0;
consts.ARD = 4;
consts.ARC = 0;
consts.PLL_LOCK = 4;
consts.RF_DR = 3;
consts.RF_PWR = 6;
consts.RX_DR = 6;
consts.TX_DS = 5;
consts.MAX_RT = 4;
consts.RX_P_NO = 1;
consts.TX_FULL = 0;
consts.PLOS_CNT = 4;
consts.ARC_CNT = 0;
consts.TX_REUSE = 6;
consts.FIFO_FULL = 5;
consts.TX_EMPTY = 4;
consts.RX_FULL = 1;
consts.RX_EMPTY = 0;
consts.DPL_P5 = 5;
consts.DPL_P4 = 4;
consts.DPL_P3 = 3;
consts.DPL_P2 = 2;
consts.DPL_P1 = 1;
consts.DPL_P0 = 0;
consts.EN_DPL = 2;
consts.EN_ACK_PAY = 1;
consts.EN_DYN_ACK = 0;

// Instruction Mnemonics
consts.R_REGISTER = 0x00;
consts.W_REGISTER = 0x20;
consts.REGISTER_MASK = 0x1F;
consts.ACTIVATE = 0x50;
consts.R_RX_PL_WID = 0x60;
consts.R_RX_PAYLOAD = 0x61;
consts.W_TX_PAYLOAD = 0xA0;
consts.W_ACK_PAYLOAD = 0xA8;
consts.FLUSH_TX = 0xE1;
consts.FLUSH_RX = 0xE2;
consts.REUSE_TX_PL = 0xE3;
consts.NOP = 0xFF;


// Non-P omissions
consts.LNA_HCURR = 0x00;

// P model memory Map
consts.RPD = 0x09;

// P model bit Mnemonics
consts.RF_DR_LOW = 5;
consts.RF_DR_HIGH = 3;
consts.RF_PWR_LOW = 1;
consts.RF_PWR_HIGH = 2;

// Signal Mnemonics
consts.LOW = 0;
consts.HIGH = 1;

consts.datarate_e_str_P = ["1MBPS", "2MBPS", "250KBPS"];
consts.model_e_str_P = ["nRF24L01", "nRF24l01+"];
consts.crclength_e_str_P = ["Disabled", "8 bits", "16 bits"];
consts.pa_dbm_e_str_P = ["PA_MIN", "PA_LOW", "PA_MED", "PA_HIGH"];
consts.child_pipe = [RX_ADDR_P0, RX_ADDR_P1, RX_ADDR_P2, RX_ADDR_P3, RX_ADDR_P4, RX_ADDR_P5];

consts.child_payload_size = [RX_PW_P0, RX_PW_P1, RX_PW_P2, RX_PW_P3, RX_PW_P4, RX_PW_P5];
consts.child_pipe_enable = [ERX_P0, ERX_P1, ERX_P2, ERX_P3, ERX_P4, ERX_P5];

module.exports = consts;