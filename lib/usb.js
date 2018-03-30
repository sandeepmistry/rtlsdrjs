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

const usb = require('usb');

function USB(device) {
  this._device = device;
}

USB.prototype.open = function(callback) {
  let err = null;

  try {
    this._device.open();
  } catch (e) {
    err = e;
  }

  callback(err);
};

USB.prototype.selectConfiguration = function(configuration, callback) {
  this._device.setConfiguration(configuration, callback);
};

USB.prototype.claimInterface = function(interface, callback) {
  let err = null;

  try {
    this._device.interface(interface).claim();
    this._interface = interface;
  } catch (e) {
    err = e;
  }

  callback(err);
};

USB.prototype.releaseInterface = function(interface, callback) {
  this._device.interface(interface).release(release);
};

USB.prototype.controlTransfer = function(ti, callback) {
  let requestType = 0;
  let lengthOrData = ti.length ? ti.length : Buffer.from(ti.data);

  if (ti.requestType === 'vendor') {
    requestType |= usb.LIBUSB_REQUEST_TYPE_VENDOR;
  }

  if (ti.recipient === 'device') {
    requestType |= usb.LIBUSB_RECIPIENT_DEVICE;
  }

  if (ti.direction === 'out') {
    requestType |= usb.LIBUSB_ENDPOINT_OUT;
  } else if (ti.direction === 'in') {
    requestType |= usb.LIBUSB_ENDPOINT_IN;
  }

  this._device.controlTransfer(requestType, ti.request, ti.value, ti.index, lengthOrData, (err, data) => {
    if (data) {
      data = Uint8Array.from(data).buffer;
    }

    callback(err, data);
  });
};

USB.prototype.bulkTransfer = function(ti, callback) {
  this._device.interface(this._interface).endpoints[ti.endpoint - 1].transfer(ti.length, (err, buffer) => {
    if (err) {
      return callback(err);
    }

    // convert Node.js Buffer to ArrayBuffer
    var data = Uint8Array.from(buffer).buffer;

    callback(null, data);
  });
};

USB.prototype.close = function(callback) {
  this._device.close(callback);
};

USB.requestDevice = function(filters, callback) {
  for (let i = 0; i < filters.length; i++) {
    const filter = filters[i];

    const usbDevice = usb.findByIds(filter.vendorId, filter.productId);

    if (usbDevice) {
      return callback(null, new USB(usbDevice));
    }
  }

  callback(new Error('No devices found!'));
};

USB.getDevices = function(filters, callback) {
  const usbDevices = usb.getDeviceList();
  const devices = [];

  usbDevices.forEach((usbDevice) => {
    filters.forEach((filter) => {
      if (filter.vendorId === usbDevice.deviceDescriptor.idVendor &&
          filter.productId === usbDevice.deviceDescriptor.idProduct) {
        devices.push(new USB(usbDevice));
      }
    });
  });

  callback(devices);
};

module.exports = USB;
