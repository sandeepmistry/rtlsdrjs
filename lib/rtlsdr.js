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
import {RTL2832U} from './rtl2832u';

export class RtlSdr {
    static FILTERS = [
        {
            vendorId: 0x0bda,
            productId: 0x2832
        },
        {
            vendorId: 0x0bda,
            productId: 0x2838
        }
    ];

    #usbDevice;
    #rtl2832u = null;

    constructor(usbDevice) {
        this.#usbDevice = usbDevice;
    }

    /**
     * Use import {USB} from './web-usb'; or import {USB} from './usb'
     * @param usb
     * @returns {Promise<*>}
     */
    static requestDevice = async function (usb) {
        let usbDevice = await usb.requestDevice(RtlSdr.FILTERS);

        return new RtlSdr(usbDevice);
    };

    /**
     * Use import {USB} from './web-usb'; or import {USB} from './usb'
     * @param usb
     * @returns {Promise<*>}
     */
    static getDevices = async function (usb) {
        let usbDevices = await usb.getDevices(RtlSdr.FILTERS);

        return usbDevices.map((usbDevice) => new RtlSdr(usbDevice));
    };

     async open({ppm, gain}) {
        await this.#usbDevice.open();
        await this.#usbDevice.selectConfiguration(1);

        this.#rtl2832u = new RTL2832U(this.#usbDevice, ppm, gain);

        await this.#rtl2832u.open();
    }

     async setSampleRate(sampleRate) {
        return this.#rtl2832u.setSampleRate(sampleRate);
    }

     async setCenterFrequency(centerFrequency) {
        return this.#rtl2832u.setCenterFrequency(centerFrequency);
    }

     async resetBuffer() {
        return this.#rtl2832u.resetBuffer();
    }

     async readSamples(length) {
        return this.#rtl2832u.readSamples(length);
    }

     async close() {
        await this.#rtl2832u.close();
        await this.#usbDevice.close();
    }
}
