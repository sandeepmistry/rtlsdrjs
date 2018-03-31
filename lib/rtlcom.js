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

/**
 * Low-level communications with the RTL2832U-based dongle.
 * @param {ConnectionHandle} conn The USB connection handle.
 * @constructor
 */
function RtlCom(conn) {

  /**
   * Whether to log all USB transfers.
   */
  var VERBOSE = false;

  /**
   * Set in the control messages' index field for write operations.
   */
  var WRITE_FLAG = 0x10;

  /**
   * Writes a buffer into a dongle's register.
   * @param {number} block The register's block number.
   * @param {number} reg The register number.
   * @param {ArrayBuffer} buffer The buffer to write.
   */
  async function writeRegBuffer(block, reg, buffer) {
    await writeCtrlMsg(reg, block | WRITE_FLAG, buffer);
  }

  /**
   * Reads a buffer from a dongle's register.
   * @param {number} block The register's block number.
   * @param {number} reg The register number.
   * @param {number} length The length in bytes of the buffer to read.
   * @return {ArrayBuffer} The read buffer.
   */
  async function readRegBuffer(block, reg, length) {
    return await readCtrlMsg(reg, block, length);
  }

  /**
   * Writes a value into a dongle's register.
   * @param {number} block The register's block number.
   * @param {number} reg The register number.
   * @param {number} value The value to write.
   * @param {number} length The width in bytes of this value.
   */
  async function writeReg(block, reg, value, length) {
    await writeCtrlMsg(reg, block | WRITE_FLAG, numberToBuffer(value, length));
  }

  /**
   * Reads a value from a dongle's register.
   * @param {number} block The register's block number.
   * @param {number} reg The register number.
   * @param {number} length The width in bytes of the value to read.
   * @return {number} The decoded value.
   */
  async function readReg(block, reg, length) {
    return bufferToNumber(await readCtrlMsg(reg, block, length));
  }

  /**
   * Writes a masked value into a dongle's register.
   * @param {number} block The register's block number.
   * @param {number} reg The register number.
   * @param {number} value The value to write.
   * @param {number} mask The mask for the value to write.
   */
  async function writeRegMask(block, reg, value, mask) {
    if (mask == 0xff) {
      await writeReg(block, reg, value, 1);
    } else {
      var old = await readReg(block, reg, 1);
      value &= mask;
      old &= ~mask;
      value |= old;
      await writeReg(block, reg, value, 1);
    }
  }

  /**
   * Reads a value from a demodulator register.
   * @param {number} page The register page number.
   * @param {number} addr The register's address.
   * @return {number} The decoded value.
   */
  async function readDemodReg(page, addr) {
    return await readReg(page, (addr << 8) | 0x20, 1);
  }

  /**
   * Writes a value into a demodulator register.
   * @param {number} page The register page number.
   * @param {number} addr The register's address.
   * @param {number} value The value to write.
   * @param {number} len The width in bytes of this value.
   */
  async function writeDemodReg(page, addr, value, len) {
    await writeRegBuffer(page, (addr << 8) | 0x20, numberToBuffer(value, len, true));
    return await readDemodReg(0x0a, 0x01);
  }

  /**
   * Opens the I2C repeater.
   */
  async function openI2C() {
    await writeDemodReg(1, 1, 0x18, 1);
  }

  /**
   * Closes the I2C repeater.
   */
  async function closeI2C() {
    await writeDemodReg(1, 1, 0x10, 1);
  }

  /**
   * Reads a value from an I2C register.
   * @param {number} addr The device's address.
   * @param {number} reg The register number.
   */
  async function readI2CReg(addr, reg) {
    await writeRegBuffer(BLOCK.I2C, addr, new Uint8Array([reg]).buffer);
    return await readReg(BLOCK.I2C, addr, 1);
  }

  /**
   * Writes a value to an I2C register.
   * @param {number} addr The device's address.
   * @param {number} reg The register number.
   * @param {number} value The value to write.
   * @param {number} len The width in bytes of this value.
   */
  async function writeI2CReg(addr, reg, value) {
    await writeRegBuffer(BLOCK.I2C, addr, new Uint8Array([reg, value]).buffer);
  }

  /**
   * Reads a buffer from an I2C register.
   * @param {number} addr The device's address.
   * @param {number} reg The register number.
   * @param {number} len The number of bytes to read.
   */
  async function readI2CRegBuffer(addr, reg, len) {
    await writeRegBuffer(BLOCK.I2C, addr, new Uint8Array([reg]).buffer);
    return await readRegBuffer(BLOCK.I2C, addr, len);
  }

  /**
   * Writes a buffer to an I2C register.
   * @param {number} addr The device's address.
   * @param {number} reg The register number.
   * @param {ArrayBuffer} buffer The buffer to write.
   */
  async function writeI2CRegBuffer(addr, reg, buffer) {
    var data = new Uint8Array(buffer.byteLength + 1);
    data[0] = reg;
    data.set(new Uint8Array(buffer), 1);
    await writeRegBuffer(BLOCK.I2C, addr, data.buffer);
  }

  /**
   * Decodes a buffer as a little-endian number.
   * @param {ArrayBuffer} buffer The buffer to decode.
   * @return {number} The decoded number.
   */
  function bufferToNumber(buffer) {
    var len = buffer.byteLength;
    var dv = new DataView(buffer);
    if (len == 0) {
      return null;
    } else if (len == 1) {
      return dv.getUint8(0);
    } else if (len == 2) {
      return dv.getUint16(0, true);
    } else if (len == 4) {
      return dv.getUint32(0, true);
    }
    throw 'Cannot parse ' + len + '-byte number';
  }

  /**
   * Encodes a number into a buffer.
   * @param {number} value The number to encode.
   * @param {number} len The number of bytes to encode into.
   * @param {boolean=} opt_bigEndian Whether to use a big-endian encoding.
   */
  function numberToBuffer(value, len, opt_bigEndian) {
    var buffer = new ArrayBuffer(len);
    var dv = new DataView(buffer);
    if (len == 1) {
      dv.setUint8(0, value);
    } else if (len == 2) {
      dv.setUint16(0, value, !opt_bigEndian);
    } else if (len == 4) {
      dv.setUint32(0, value, !opt_bigEndian);
    } else {
      throw 'Cannot write ' + len + '-byte number';
    }
    return buffer;
  }

  /**
   * Sends a USB control message to read from the device.
   * @param {number} value The value field of the control message.
   * @param {number} index The index field of the control message.
   * @param {number} length The number of bytes to read.
   */
  async function readCtrlMsg(value, index, length) {
    var ti = {
      'requestType': 'vendor',
      'recipient': 'device',
      'direction': 'in',
      'request': 0,
      'value': value,
      'index': index,
      'length': Math.max(8, length)
    };
    try {
      var data = await conn.controlTransfer(ti);
      data = data.slice(0, length);
      if (VERBOSE) {
        console.log('IN value 0x' + value.toString(16) + ' index 0x' +
            index.toString(16));
        console.log('    read -> ' + dumpBuffer(data));
      }

      return data;
    } catch (error) {
      var msg = 'USB read failed (value 0x' + value.toString(16) +
            ' index 0x' + index.toString(16) + '), message="' + error.message + '"';
    };
  }

  /**
   * Sends a USB control message to write to the device.
   * @param {number} value The value field of the control message.
   * @param {number} index The index field of the control message.
   * @param {ArrayBuffer} buffer The buffer to write to the device.
   */
  async function writeCtrlMsg(value, index, buffer) {
    var ti = {
      'requestType': 'vendor',
      'recipient': 'device',
      'direction': 'out',
      'request': 0,
      'value': value,
      'index': index,
      'data': buffer
    };
    try {
      await conn.controlTransfer(ti);
      if (VERBOSE) {
        console.log('OUT value 0x' + value.toString(16) + ' index 0x' +
            index.toString(16) + ' data ' + dumpBuffer(buffer));
      }
    } catch (error) {
      var msg = 'USB write failed (value 0x' + value.toString(16) +
          ' index 0x' + index.toString(16) + ' data ' + dumpBuffer(buffer) +
          ') message="' +
          error.message + '"';
      throw msg;
    };
  }

  /**
   * Does a bulk transfer from the device.
   * @param {number} length The number of bytes to read.
   * @return {ArrayBuffer} The received buffer.
   */
  async function readBulk(length) {
    var ti = {
      'direction': 'in',
      'endpoint': 1,
      'length': length
    };
    try {
      var data = await conn.bulkTransfer(ti);
      if (VERBOSE) {
        console.log('IN BULK requested ' + length + ' received ' + data.byteLength);
      }
      return data;
    } catch(error) {
      var msg = 'USB bulk read failed (length 0x' + length.toString(16) +
            '), error="' +
            error.message + '"';
      throw msg;
    }
  }

  /**
   * Claims the USB interface.
   */
  async function claimInterface() {
    await conn.claimInterface(0);
  }

  /**
   * Releases the USB interface.
   */
  async function releaseInterface() {
    await conn.releaseInterface(0);
  }

  /**
   * Performs several write operations as specified in an array.
   * @param {Array.<Array.<number>>} array The operations to perform.
   */
  async function writeEach(array) {
    for (var index = 0; index < array.length; index++) {
      var line = array[index];
      if (line[0] == CMD.REG) {
        await writeReg(line[1], line[2], line[3], line[4]);
      } else if (line[0] == CMD.REGMASK) {
        await writeRegMask(line[1], line[2], line[3], line[4]);
      } else if (line[0] == CMD.DEMODREG) {
        await writeDemodReg(line[1], line[2], line[3], line[4]);
      } else if (line[0] == CMD.I2CREG) {
        await writeI2CReg(line[1], line[2], line[3]);
      } else {
        throw 'Unsupported operation [' + line + ']';
      }
    }
  }

  /**
   * Returns a string representation of a buffer.
   * @param {ArrayBuffer} buffer The buffer to display.
   * @return {string} The string representation of the buffer.
   */
  function dumpBuffer(buffer) {
    var bytes = [];
    var arr = new Uint8Array(buffer);
    for (var i = 0; i < arr.length; ++i) {
      bytes.push('0x' + arr[i].toString(16));
    }
    return '[' + bytes + ']';
  }


  return {
    writeRegister: writeReg,
    readRegister: readReg,
    writeRegMask: writeRegMask,
    demod: {
      readRegister: readDemodReg,
      writeRegister: writeDemodReg
    },
    i2c: {
      open: openI2C,
      close: closeI2C,
      readRegister: readI2CReg,
      writeRegister: writeI2CReg,
      readRegBuffer: readI2CRegBuffer
    },
    bulk: {
      readBuffer: readBulk
    },
    iface: {
      claim: claimInterface,
      release: releaseInterface
    },
    writeEach: writeEach
  };
}

/**
 * Commands for writeEach.
 */
var CMD = {
  REG: 1,
  REGMASK: 2,
  DEMODREG: 3,
  I2CREG: 4
};

/**
 * Register blocks.
 */
var BLOCK = {
  DEMOD: 0x000,
  USB: 0x100,
  SYS: 0x200,
  I2C: 0x600
};

/**
 * Device registers.
 */
var REG = {
  SYSCTL: 0x2000,
  EPA_CTL: 0x2148,
  EPA_MAXPKT: 0x2158,
  DEMOD_CTL: 0x3000,
  DEMOD_CTL_1: 0x300b
};

RtlCom.CMD = CMD;
RtlCom.BLOCK = BLOCK;
RtlCom.REG = REG;

module.exports = RtlCom;
