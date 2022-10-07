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

export function USB(device) {
  this._device = device;
}

USB.prototype.open = async function() {
  await this._device.open();
};

USB.prototype.selectConfiguration = async function(configuration) {
  await this._device.selectConfiguration(configuration);
};

USB.prototype.claimInterface = async function(deviceInterface) {
  await this._device.claimInterface(deviceInterface);
};

USB.prototype.releaseInterface = async function(deviceInterface) {
  await this._device.releaseInterface(deviceInterface);
};

USB.prototype.controlTransfer = async function(ti) {
  if (ti.direction === 'out') {
    await this._device.controlTransferOut(ti, ti.data);
  } else if (ti.direction === 'in') {
    const result = await this._device.controlTransferIn(ti, ti.length);

    return result.data.buffer;
  }
};

USB.prototype.bulkTransfer = async function(ti) {
  const result = await this._device.transferIn(ti.endpoint, ti.length);

  return result.data.buffer;
};

USB.prototype.close = async function() {
  await this._device.close();
};

USB.requestDevice = async function(filters) {
  const usbDevice = await navigator.usb.requestDevice({
    filters: filters
  });

  return new USB(usbDevice);
};

USB.getDevices = async function(filters) {
  const usbDevices = await navigator.usb.getDevices();
  const devices = [];

  usbDevices.forEach((usbDevice) => {
    filters.forEach((filter) => {
      if (filter.vendorId === usbDevice.vendorId && filter.productId === usbDevice.productId) {
        devices.push(new USB(usbDevice));
      }
    });
  });

  return devices;
};
