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

USB.prototype.open = async function() {
  return new Promise((resolve) => {
    this._device.open();
    for (let i = 0; i < 2; i++) {
      if (this._device.interfaces[i].isKernelDriverActive()) {
        this._device.interfaces[i].detachKernelDriver();
      }
    }

    resolve();
  });
};

USB.prototype.selectConfiguration = async function(configuration) {
  return new Promise((resolve, reject) => {
    this._device.setConfiguration(configuration, (err) => {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  });
};

USB.prototype.claimInterface = async function(iface) {
  return new Promise((resolve) => {
    this._device.interface(iface).claim();
    this._interface = interface;

    resolve();
  });
};

USB.prototype.releaseInterface = async function(iface) {
  return new Promise((resolve) => {
    this._device.interface(iface).release((error) => {
      if (error) {
        return reject(error);
      }

      resolve();
    });
  });
};

USB.prototype.controlTransfer = async function(ti) {
  return new Promise((resolve, reject) => {
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
      if (err) {
        return reject(err);
      }

      if (data) {
        return resolve(Uint8Array.from(data).buffer);
      }

      resolve();
    });
  });
};

USB.prototype.bulkTransfer = async function(ti) {
  return new Promise((resolve, reject) => {
    this._device.interface(this._interface).endpoints[ti.endpoint - 1].transfer(ti.length, (err, data) => {
      if (err) {
        return reject(err);
      }

      resolve(data.buffer);
    });
  });
};

USB.prototype.close = async function() {
  return new Promise((resolve) => {
    this._device.close(resolve);
  });
};

USB.requestDevice = async function(filters) {
  return new Promise((resolve, reject) => {
    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i];

      const usbDevice = usb.findByIds(filter.vendorId, filter.productId);

      if (usbDevice) {
        return resolve(new USB(usbDevice));
      }
    }

    reject(new Error('No devices found!'));
  });
};

USB.getDevices = async function(filters) {
  return new Promise((resolve) => {
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

    resolve(devices);
  });
};

module.exports = USB;
