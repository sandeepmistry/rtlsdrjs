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

const usb = require('./usb');
const RTL2832U = require('./rtl2832u');

const FILTERS = [
  {
    vendorId: 0x0bda,
    productId: 0x2832
  },
  {
    vendorId: 0x0bda,
    productId: 0x2838
  }
];

function RtlSdr(usbDevice) {
  this._usbDevice = usbDevice;
  this._rtl2832u = null;
}

RtlSdr.prototype.open = function(options, callback) {
  if (arguments.length === 1) {
    callback = options;
  }

  this._usbDevice.open((error) => {
    if (error) {
      return callback(error);
    }

    this._usbDevice.selectConfiguration(1, (error) => {
      if (error) {
        return callback(error);
      }

      this._rtl2832u = new RTL2832U(this._usbDevice, options.ppm || 0, options.gain || null);

      try {
        this._rtl2832u.open(() => {
          callback();
        });
      } catch (e) {
        return callback(e);
      }
    });
  });
};

RtlSdr.prototype.setSampleRate = function(sampleRate, callback) {
  try {
    this._rtl2832u.setSampleRate(sampleRate, (actualSampleRate) => {
      callback(null, actualSampleRate);
    });
  } catch (e) {
    return callback(e);
  }
};

RtlSdr.prototype.setCenterFrequency = function(centerFrequency, callback) {
  try {
    this._rtl2832u.setCenterFrequency(centerFrequency, (actualCenterFrequency) => {
      callback(null, actualCenterFrequency);
    });
  } catch (e) {
    return callback(e);
  }
};

RtlSdr.prototype.setGain = function(gain, callback) {
  try {
    this._rtl2832u.setGain(gain, () => {
      callback(null);
    });
  } catch (e) {
    return callback(e);
  }
};

RtlSdr.prototype.resetBuffer = function(callback) {
  try {
    this._rtl2832u.resetBuffer(() => {
      callback(null);
    });
  } catch (e) {
    return callback(e);
  }
};

RtlSdr.prototype.readSamples = function(length, callback) {
  try {
    this._rtl2832u.readSamples(length, (samples) => {
      callback(null, samples);
    });
  } catch (e) {
    return callback(e);
  }
};

RtlSdr.prototype.close = function(callback) {
  this._rtl2832u.close(() => {
    this._usbDevice(callback);
  });
};

RtlSdr.requestDevice = function(callback) {
  usb.requestDevice(FILTERS, (error, usbDevice) => {
    if (error) {
      return callback(error);
    }

    callback(null, new RtlSdr(usbDevice));
  });
};

RtlSdr.getDevices = function(callback) {
  usb.getDevices(FILTERS, (usbDevices) => {
    const sdrs = [];

    usbDevices.forEach((usbDevice) => {
      sdrs.push(new RtlSdr(usbDevice));
    });

    callback(sdrs);
  });
};

module.exports = RtlSdr;
