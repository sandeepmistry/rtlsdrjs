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

import {usb as nodejsUsb} from 'usb';

export class USB {
    #device;
    #iface;

    constructor(device) {
        this.#device = device;
    }

    static async requestDevice(filters) {
        return new Promise((resolve, reject) => {
            for (let i = 0; i < filters.length; i++) {
                const filter = filters[i];

                const usbDevice = nodejsUsb.findByIds(filter.vendorId, filter.productId);

                if (usbDevice) {
                    return resolve(new USB(usbDevice));
                }
            }

            reject(new Error('No devices found!'));
        });
    }

    static async getDevices(filters) {
        return new Promise((resolve) => {
            const usbDevices = nodejsUsb.getDeviceList();

            const devices = usbDevices
                .filter((usbDevice) => {
                    return filters.some(filter => filter.vendorId === usbDevice.vendorId && filter.productId === usbDevice.productId);
                })
                .map(usbDevice => new USB(usbDevice));

            resolve(devices);
        });
    }

    async open() {
        return new Promise((resolve) => {
            this.#device.open();

            resolve();
        });
    }

    async selectConfiguration(configuration) {
        return new Promise((resolve, reject) => {
            this.#device.setConfiguration(configuration, (err) => {
                if (err) {
                    return reject(err);
                }

                resolve();
            });
        });
    }

    async claimInterface(iface) {
        return new Promise((resolve) => {
            this.#device.iface(iface).claim();
            this.#iface = iface;

            resolve();
        });
    }

    async releaseInterface(iface) {
        return new Promise((resolve, reject) => {
            this.#device.iface(iface)
                .release((error) => {
                    if (error) {
                        return reject(error);
                    }

                    resolve();
                });
        });
    }

    async controlTransfer(ti) {
        return new Promise((resolve, reject) => {
            let requestType = 0;
            let lengthOrData = ti.length ? ti.length : Buffer.from(ti.data);

            if (ti.requestType === 'vendor') {
                requestType |= nodejsUsb.LIBUSB_REQUEST_TYPE_VENDOR;
            }

            if (ti.recipient === 'device') {
                requestType |= nodejsUsb.LIBUSB_RECIPIENT_DEVICE;
            }

            if (ti.direction === 'out') {
                requestType |= nodejsUsb.LIBUSB_ENDPOINT_OUT;

            } else if (ti.direction === 'in') {
                requestType |= nodejsUsb.LIBUSB_ENDPOINT_IN;
            }

            this.#device.controlTransfer(requestType, ti.request, ti.value, ti.index, lengthOrData, (err, data) => {
                if (err) {
                    return reject(err);
                }

                if (data) {
                    return resolve(Uint8Array.from(data).buffer);
                }

                resolve();
            });
        });
    }

    async bulkTransfer(ti) {
        return new Promise((resolve, reject) => {
            this.#device.iface(this.#iface).endpoints[ti.endpoint - 1]
                .transfer(ti.length, (err, data) => {
                    if (err) {
                        return reject(err);
                    }

                    resolve(data.buffer);
                });
        });
    }

    async close() {
        return new Promise((resolve) => {
            this.#device.close(resolve);
        });
    }
}
