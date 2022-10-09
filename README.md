# 📡 rtlsdr.js

Turn your Realtek RTL2832U based device into an SDR (Software Defined Radio) receiver using JavaScript.

Supports [Node.js](https://nodejs.org/) and [WebUSB](https://wicg.github.io/webusb/) compatible browsers.

## Requirements

### Hardware

* Realtek RTL2832U based USB adapter with R820T tuner chip

### Software

* [Node.js](https://nodejs.org/) 8.x or later + [node-usb requirements](https://github.com/tessel/node-usb#installation)
* [Web browser that supports WebUSB](https://caniuse.com/#feat=webusb)

## Setup

### Node.js

Install: `npm i rtlsdrjs`

Import: `import {RtlSdr, nodejsUsb} from 'rtlsdrjs';`

### Browser

Import: `import {RtlSdr, webUsb} from 'rtlsdrjs';`

## Usage

```javascript
import {RtlSdr, webUsb} from 'rtlsdrjs';

let readSamples = true;

async function start() {
  //
  // request a device
  // - displays prompt in browser
  // - selects first device in Node.js
  //
  // RtlSdr.getDevices() can be used to get a list of all RTL SDR's attached to system
  //
  const sdr = await RtlSdr.requestDevice(usb);

  //
  // open the device
  //
  // supported options are:
  // - ppm: frequency correction factor, in parts per million (defaults to 0)
  // - gain: optional gain in dB, auto gain is used if not specified
  //
  await sdr.open({
    ppm: 0.5
  });

  //
  // set sample rate and center frequency in Hz
  // - returns the actual values set
  //
  const actualSampleRate = await sdr.setSampleRate(2000000);
  const actualCenterFrequency = await sdr.setCenterFrequency(1090000000);

  //
  // reset the buffer
  //
  await sdr.resetBuffer();

  while (readSamples) {
    //
    // read some samples
    // - returns an ArrayBuffer with the specified number of samples,
    //   data is interleaved in IQ format
    //
    const samples = await sdr.readSamples(16 * 16384);

    //
    // process the samples ...
    //
  }
}

```

## Acknowledgements

This library is based on [Jacobo Tarrío's (@jtarrio](https://github.com/jtarrio)) work in Google's [Radio Receiver Chrome app](https://github.com/google/radioreceiver), which used work from the [RTL-SDR project](http://sdr.osmocom.org/trac/wiki/rtl-sdr). The Chrome USB API layer has been replaced with [node-usb](https://github.com/tessel/node-usb) on Node.js and [WebUSB](https://wicg.github.io/webusb/) when running in the browser.

## License

Apache 2.0
