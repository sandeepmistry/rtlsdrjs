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

export class USB {
    #device;

    constructor(device) {
        this.#device = device;
    }

    static async requestDevice(filters) {
        const usbDevice = await navigator.usb.requestDevice({
            filters: filters
        });

        return new USB(usbDevice);
    }

    static async getDevices(filters) {
        const usbDevices = await navigator.usb.getDevices();

        return usbDevices
            .filter((usbDevice) => {
                return filters.some(filter => filter.vendorId === usbDevice.vendorId && filter.productId === usbDevice.productId);
            })
            .map(usbDevice => new USB(usbDevice));
    }

    async open() {
        await this.#device.open();
    }

    async selectConfiguration(configuration) {
        await this.#device.selectConfiguration(configuration);
    }

    async claimInterface(iface) {
        await this.#device.claimInterface(iface);
    }

    async releaseInterface(iface) {
        await this.#device.releaseInterface(iface);
    }

    async controlTransfer(ti) {
        if (ti.direction === 'out') {
            await this.#device.controlTransferOut(ti, ti.data);

        } else if (ti.direction === 'in') {
            const result = await this.#device.controlTransferIn(ti, ti.length);

            return result.data.buffer;
        }
    }

    async bulkTransfer(ti) {
        const result = await this.#device.transferIn(ti.endpoint, ti.length);

        return result.data.buffer;
    }

    async close() {
        await this.#device.close();
    }
}
