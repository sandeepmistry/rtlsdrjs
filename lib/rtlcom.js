// Copyright 2013 Google Inc. All rights reserved.
// Copyright 2018 Sandeep Mistry All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

export class RtlCom {

    /**
     * Whether to log all USB transfers.
     */
    static VERBOSE = false;

    /**
     * Set in the control messages' index field for write operations.
     */
    static WRITE_FLAG = 0x10;

    /**
     * Commands for writeEach.
     */
    static CMD = {
        REG: 1,
        REGMASK: 2,
        DEMODREG: 3,
        I2CREG: 4
    };

    /**
     * Register blocks.
     */
    static BLOCK = {
        DEMOD: 0x000,
        USB: 0x100,
        SYS: 0x200,
        I2C: 0x600
    };

    /**
     * Device registers.
     */
    static REG = {
        SYSCTL: 0x2000,
        EPA_CTL: 0x2148,
        EPA_MAXPKT: 0x2158,
        DEMOD_CTL: 0x3000,
        DEMOD_CTL_1: 0x300b
    };

    #conn;

    /**
     * Low-level communications with the RTL2832U-based dongle.
     * @param {ConnectionHandle} conn The USB connection handle.
     * @constructor
     */
    constructor(conn) {
        this.#conn = conn;
    }

    demod = {
        readRegister: this.#readDemodReg.bind(this),
        writeRegister: this.#writeDemodReg.bind(this)
    }
    i2c = {
        open: this.#openI2C.bind(this),
        close: this.#closeI2C.bind(this),
        readRegister: this.#readI2CReg.bind(this),
        writeRegister: this.#writeI2CReg.bind(this),
        readRegBuffer: this.#readI2CRegBuffer.bind(this)
    }
    bulk = {
        readBuffer: this.#readBulk.bind(this)
    }
    iface = {
        claim: this.#claimInterface.bind(this),
        release: this.#releaseInterface.bind(this)
    };

    /**
     * Writes a buffer into a dongle's register.
     * @param {number} block The register's block number.
     * @param {number} reg The register number.
     * @param {ArrayBuffer} buffer The buffer to write.
     */
    async #writeRegBuffer(block, reg, buffer) {
        await this.#writeCtrlMsg(reg, block | RtlCom.WRITE_FLAG, buffer);
    }

    /**
     * Reads a buffer from a dongle's register.
     * @param {number} block The register's block number.
     * @param {number} reg The register number.
     * @param {number} length The length in bytes of the buffer to read.
     * @return {ArrayBuffer} The read buffer.
     */
    async #readRegBuffer(block, reg, length) {
        return this.#readCtrlMsg(reg, block, length);
    }

    /**
     * Writes a value into a dongle's register.
     * @param {number} block The register's block number.
     * @param {number} reg The register number.
     * @param {number} value The value to write.
     * @param {number} length The width in bytes of this value.
     */
    async writeRegister(block, reg, value, length) {
        await this.#writeCtrlMsg(reg, block | RtlCom.WRITE_FLAG, RtlCom.numberToBuffer(value, length));
    }

    /**
     * Reads a value from a dongle's register.
     * @param {number} block The register's block number.
     * @param {number} reg The register number.
     * @param {number} length The width in bytes of the value to read.
     * @return {number} The decoded value.
     */
    async readRegister(block, reg, length) {
        return RtlCom.bufferToNumber(await this.#readCtrlMsg(reg, block, length));
    }

    /**
     * Writes a masked value into a dongle's register.
     * @param {number} block The register's block number.
     * @param {number} reg The register number.
     * @param {number} value The value to write.
     * @param {number} mask The mask for the value to write.
     */
    async writeRegMask(block, reg, value, mask) {
        if (mask === 0xff) {
            await this.writeRegister(block, reg, value, 1);
        } else {
            let old = this.readRegister(block, reg, 1);
            value &= mask;
            old &= ~mask;
            value |= old;
            await this.writeRegister(block, reg, value, 1);
        }
    }

    /**
     * Reads a value from a demodulator register.
     * @param {number} page The register page number.
     * @param {number} addr The register's address.
     * @return {number} The decoded value.
     */
    async #readDemodReg(page, addr) {
        return this.readRegister(page, (addr << 8) | 0x20, 1);
    }

    /**
     * Writes a value into a demodulator register.
     * @param {number} page The register page number.
     * @param {number} addr The register's address.
     * @param {number} value The value to write.
     * @param {number} len The width in bytes of this value.
     */
    async #writeDemodReg(page, addr, value, len) {
        await this.#writeRegBuffer(page, (addr << 8) | 0x20, RtlCom.numberToBuffer(value, len, true));
        return this.#readDemodReg(0x0a, 0x01);
    }

    /**
     * Opens the I2C repeater.
     */
    async #openI2C() {
        await this.#writeDemodReg(1, 1, 0x18, 1);
    }

    /**
     * Closes the I2C repeater.
     */
    async #closeI2C() {
        await this.#writeDemodReg(1, 1, 0x10, 1);
    }

    /**
     * Reads a value from an I2C register.
     * @param {number} addr The device's address.
     * @param {number} reg The register number.
     */
    async #readI2CReg(addr, reg) {
        await this.#writeRegBuffer(RtlCom.BLOCK.I2C, addr, new Uint8Array([reg]).buffer);
        return this.readRegister(RtlCom.BLOCK.I2C, addr, 1);
    }

    /**
     * Writes a value to an I2C register.
     * @param {number} addr The device's address.
     * @param {number} reg The register number.
     * @param {number} value The value to write.
     */
    async #writeI2CReg(addr, reg, value) {
        await this.#writeRegBuffer(RtlCom.BLOCK.I2C, addr, new Uint8Array([reg, value]).buffer);
    }

    /**
     * Reads a buffer from an I2C register.
     * @param {number} addr The device's address.
     * @param {number} reg The register number.
     * @param {number} len The number of bytes to read.
     */
    async #readI2CRegBuffer(addr, reg, len) {
        await this.#writeRegBuffer(RtlCom.BLOCK.I2C, addr, new Uint8Array([reg]).buffer);
        return this.#readRegBuffer(RtlCom.BLOCK.I2C, addr, len);
    }

    /**
     * Writes a buffer to an I2C register.
     * @param {number} addr The device's address.
     * @param {number} reg The register number.
     * @param {ArrayBuffer} buffer The buffer to write.
     */
    async #writeI2CRegBuffer(addr, reg, buffer) {
        const data = new Uint8Array(buffer.byteLength + 1);
        data[0] = reg;
        data.set(new Uint8Array(buffer), 1);
        await this.#writeRegBuffer(RtlCom.BLOCK.I2C, addr, data.buffer);
    }

    /**
     * Decodes a buffer as a little-endian number.
     * @param {ArrayBuffer} buffer The buffer to decode.
     * @return {number} The decoded number.
     */
    static bufferToNumber(buffer) {
        let len = buffer.byteLength;
        const dv = new DataView(buffer);
        if (len === 0) {
            return null;
        } else if (len === 1) {
            return dv.getUint8(0);
        } else if (len === 2) {
            return dv.getUint16(0, true);
        } else if (len === 4) {
            return dv.getUint32(0, true);
        }

        throw new Error('Cannot parse ' + len + '-byte number');
    }

    /**
     * Encodes a number into a buffer.
     * @param {number} value The number to encode.
     * @param {number} len The number of bytes to encode into.
     * @param {boolean=} opt_bigEndian Whether to use a big-endian encoding.
     */
    static numberToBuffer(value, len, opt_bigEndian) {
        const buffer = new ArrayBuffer(len);
        const dv = new DataView(buffer);
        if (len === 1) {
            dv.setUint8(0, value);
        } else if (len === 2) {
            dv.setUint16(0, value, !opt_bigEndian);
        } else if (len === 4) {
            dv.setUint32(0, value, !opt_bigEndian);
        } else {
            throw new Error('Cannot write ' + len + '-byte number');
        }
        return buffer;
    }

    /**
     * Sends a USB control message to read from the device.
     * @param {number} value The value field of the control message.
     * @param {number} index The index field of the control message.
     * @param {number} length The number of bytes to read.
     */
    async #readCtrlMsg(value, index, length) {
        const ti = {
            'requestType': 'vendor',
            'recipient': 'device',
            'direction': 'in',
            'request': 0,
            'value': value,
            'index': index,
            'length': Math.max(8, length)
        };
        try {
            let data = await this.#conn.controlTransfer(ti);
            data = data.slice(0, length);
            if (RtlCom.VERBOSE) {
                console.log('IN value 0x' + value.toString(16) + ' index 0x' +
                    index.toString(16));
                console.log('    read -> ' + this.#dumpBuffer(data));
            }

            return data;
        } catch (error) {
            const msg = 'USB read failed (value 0x' + value.toString(16) +
                ' index 0x' + index.toString(16) + '), message="' + error.message + '"';
            throw new Error(msg);
        }
    }

    /**
     * Sends a USB control message to write to the device.
     * @param {number} value The value field of the control message.
     * @param {number} index The index field of the control message.
     * @param {ArrayBuffer} buffer The buffer to write to the device.
     */
    async #writeCtrlMsg(value, index, buffer) {
        const ti = {
            'requestType': 'vendor',
            'recipient': 'device',
            'direction': 'out',
            'request': 0,
            'value': value,
            'index': index,
            'data': buffer
        };
        try {
            await this.#conn.controlTransfer(ti);
            if (RtlCom.VERBOSE) {
                console.log('OUT value 0x' + value.toString(16) + ' index 0x' +
                    index.toString(16) + ' data ' + this.#dumpBuffer(buffer));
            }
        } catch (error) {
            const msg = 'USB write failed (value 0x' + value.toString(16) +
                ' index 0x' + index.toString(16) + ' data ' + this.#dumpBuffer(buffer) +
                ') message="' +
                error.message + '"';
            throw new Error(msg);
        }
    }

    /**
     * Does a bulk transfer from the device.
     * @param {number} length The number of bytes to read.
     * @return {ArrayBuffer} The received buffer.
     */
    async #readBulk(length) {
        const ti = {
            'direction': 'in',
            'endpoint': 1,
            'length': length
        };
        try {
            const data = await this.#conn.bulkTransfer(ti);
            if (RtlCom.VERBOSE) {
                console.log('IN BULK requested ' + length + ' received ' + data.byteLength);
            }
            return data;
        } catch (error) {
            const msg = 'USB bulk read failed (length 0x' + length.toString(16) +
                '), error="' +
                error.message + '"';
            throw new Error(msg);
        }
    }

    /**
     * Claims the USB interface.
     */
    async #claimInterface() {
        await this.#conn.claimInterface(0);
    }

    /**
     * Releases the USB interface.
     */
    async #releaseInterface() {
        await this.#conn.releaseInterface(0);
    }

    /**
     * Performs several write operations as specified in an array.
     * @param {Array.<Array.<number>>} array The operations to perform.
     */
    async writeEach(array) {
        for (const element of array) {
            const line = element;
            if (line[0] === RtlCom.CMD.REG) {
                await this.writeRegister(line[1], line[2], line[3], line[4]);
            } else if (line[0] === RtlCom.CMD.REGMASK) {
                await this.writeRegMask(line[1], line[2], line[3], line[4]);
            } else if (line[0] === RtlCom.CMD.DEMODREG) {
                await this.#writeDemodReg(line[1], line[2], line[3], line[4]);
            } else if (line[0] === RtlCom.CMD.I2CREG) {
                await this.#writeI2CReg(line[1], line[2], line[3]);
            } else {
                throw new Error('Unsupported operation [' + line + ']');
            }
        }
    }

    /**
     * Returns a string representation of a buffer.
     * @param {ArrayBuffer} buffer The buffer to display.
     * @return {string} The string representation of the buffer.
     */
    #dumpBuffer(buffer) {
        const bytes = [];
        const arr = new Uint8Array(buffer);
        for (let i = 0; i < arr.length; ++i) {
            bytes.push('0x' + arr[i].toString(16));
        }
        return '[' + bytes + ']';
    }
}
