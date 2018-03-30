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

function USB(device) {
  this._device = device;
}

USB.prototype.open = function(callback) {
  this._device.open()
    .then(() => {
      callback(null);
    })
    .catch((err) => {
      callback(err);
    });
};

USB.prototype.selectConfiguration = function(configuration, callback) {
  this._device.selectConfiguration(configuration)
    .then(() => {
      callback(null);
    })
    .catch((err) => {
      callback(err);
    });
};

USB.prototype.claimInterface = function(interface, callback) {
  this._device.claimInterface(interface)
    .then(() => {
      callback(null);
    })
    .catch((err) => {
      callback(err);
    });
};

USB.prototype.releaseInterface = function(interface, callback) {
  this._device.releaseInterface(interface)
    .then(() => {
      callback(null);
    })
    .catch((err) => {
      callback(err);
    });
};

USB.prototype.controlTransfer = function(ti, callback) {
  if (ti.direction === 'out') {
    this._device.controlTransferOut(ti, ti.data)
      .then(() => {
        callback(null);
      })
      .catch((err) => {
        callback(err);
      });
  } else if (ti.direction === 'in') {
    this._device.controlTransferIn(ti, ti.length)
      .then((result) => {
        callback(null, result.data.buffer);
      })
      .catch((err) => {
        callback(err);
      });
  }
};

USB.prototype.bulkTransfer = function(ti, callback) {
  this._device.transferIn(ti.endpoint, ti.length)
    .then((result) => {
      callback(null, result.data.buffer);
    })
    .catch((err) => {
      callback(err);
    });
};

USB.prototype.close = function(callback) {
  this._device.close()
    .then(() => {
      callback(null);
    })
    .catch((err) => {
      callback(err);
    });
};

USB.requestDevice = function(filters, callback) {
  navigator.usb.requestDevice({
    filters: filters
  })
    .then((usbDevice) => {
      callback(null, new USB(usbDevice));
    })
    .catch((err) => {
      callback(err);
    });
};

USB.getDevices = function(filters, callback) {
  navigator.usb.getDevices()
    .then((usbDevices) => {
      const devices = [];

      usbDevices.forEach((usbDevice) => {
        filters.forEach((filter) => {
          if (filter.vendorId === usbDevice.vendorId &&
              filter.productId === usbDevice.productId) {
            devices.push(new USB(usbDevice));
          }
        });
      });

      callback(devices);
    })
    .catch((err) => {
      callback(err);
    });
};

module.exports = USB;
