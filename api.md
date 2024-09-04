# API Documentation

## fromWeb

### Description:
The `fromWeb` function wraps Web Streams (`ReadableStream` & `WritableStream`) and converts them into `streamx` streams. This is specifically designed for `streamx` and is not intended for native Node.js streams.

### Syntax:
```javascript
const streamx = fromWeb({ readable, writable });
```

### Parameters:
- **readable** *(ReadableStream, optional)*: The readable stream to be wrapped.
- **writable** *(WritableStream, optional)*: The writable stream to be wrapped.

### Returns:
- *(Streamx.Duplex | Streamx.Readable | Streamx.Writable)*: A `streamx.Duplex` stream if both readable and writable streams are provided. A `streamx.Readable` or `streamx.Writable` stream if only one is provided.

### Usage Examples:

#### Example 1: Converting a Readable Web Stream to a Streamx Readable Stream
```javascript
import { fromWeb } from './lib/fromWeb.js';

const readableWebStream = new ReadableStream({
    start(controller) {
        controller.enqueue(new TextEncoder().encode('Hello, World!'));
        controller.close();
    }
});

const streamxReadable = fromWeb({ readable: readableWebStream });

streamxReadable.on('data', (chunk) => {
    console.log('Received data:', new TextDecoder().decode(chunk));
});
```

#### Example 2: Converting a Writable Web Stream to a Streamx Writable Stream
```javascript
import { fromWeb } from './lib/fromWeb.js';

const writableWebStream = new WritableStream({
  write(chunk) {
    console.log('Received chunk:', new TextDecoder().decode(chunk));
  }
});

const streamxWritable = fromWeb({ writable: writableWebStream });

streamxWritable.write(new TextEncoder().encode('Hello, Writable!'));
streamxWritable.end();
```

#### Example 3: Converting Duplex Web Streams to Streamx Duplex Stream
```javascript
import { fromWeb } from './lib/fromWeb.js';

const readableWebStream = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode('Hello from Read!'));
    controller.close();
  }
});

const writableWebStream = new WritableStream({
  write(chunk) {
    console.log('Received chunk:', new TextDecoder().decode(chunk));
  }
});

const duplexStreamx = fromWeb({ readable: readableWebStream, writable: writableWebStream });

duplexStreamx.on('data', (chunk) => {
  console.log('Read data:', new TextDecoder().decode(chunk));
});

duplexStreamx.write(new TextEncoder().encode('Hello from Write!'));
duplexStreamx.end();
```

## toWeb

### Description:
The `toWeb` function converts `streamx` streams into Web Streams (`ReadableStream` & `WritableStream`). This function is tailored for `streamx` streams and not for native Node.js streams.

### Syntax:
```javascript
const webStream = toWeb(stream, asBytes);
```

### Parameters:
- **stream** *(Streamx stream | Object)*: The `streamx` stream or an object containing `readable`, `writable`, or both to be converted into Web Streams.
- **asBytes** *(boolean, optional)*: Indicates whether the stream should be handled as byte streams. Default is `false`.

### Returns:
- *(ReadableStream | WritableStream | Object with ReadableStream and/or WritableStream)*: Returns Web Streams corresponding to the provided `streamx` stream:
    - **ReadableStream** if provided `streamx` stream is readable.
    - **WritableStream** if provided `streamx` stream is writable.
    - **Object containing both `ReadableStream` and `WritableStream`** if both are provided.

### Usage Examples:

#### Example 1: Converting a Streamx Readable Stream to a Web Readable Stream
```javascript
import { toWeb } from './lib/toWeb.js';
import { Readable } from 'streamx';

const streamxReadable = new Readable({
  read(cb) {
    this.push(new TextEncoder().encode('Streamx Readable Data'));
    this.push(null);
    cb();
  }
});

const readableStream = toWeb(streamxReadable);
readableStream.getReader().read().then(({ value, done }) => {
  if (!done) {
    console.log('Web ReadableStream data:', new TextDecoder().decode(value));
  }
});
```

#### Example 2: Converting a Streamx Writable Stream to a Web Writable Stream
```javascript
import { toWeb } from './lib/toWeb.js';
import { Writable } from 'streamx';

const streamxWritable = new Writable({
  write(chunk, cb) {
    console.log('Received chunk:', new TextDecoder().decode(chunk));
    cb();
  }
});

const writableStream = toWeb(streamxWritable);
const writer = writableStream.getWriter();
writer.write(new TextEncoder().encode('Streamx Writable Data')).then(() => writer.close());
```

#### Example 3: Converting a Streamx Duplex Stream to Web Readable and Writable Streams
```javascript
import { toWeb } from './lib/toWeb.js';
import { Duplex } from 'streamx';

const streamxDuplex = new Duplex({
    read(cb) {
        this.push(new TextEncoder().encode('Streamx Duplex Readable Data'));
        this.push(null);
        cb();
    },
    write(chunk, cb) {
        console.log('Received duplex chunk:', new TextDecoder().decode(chunk));
        cb();
    }
});

const { readable, writable } = toWeb(streamxDuplex);
const reader = readable.getReader();
const writer = writable.getWriter();

reader.read().then(({ value, done }) => {
    if (!done) {
        console.log('Duplex Web Readable data:', new TextDecoder().decode(value));
    }
});

writer.write(new TextEncoder().encode('Streamx Duplex Writable Data')).then(() => writer.close());
```

## Notes:
- Ensure you handle error scenarios in both `fromWeb` and `toWeb` appropriately to avoid unexpected behavior.
- The `fromWeb` function is particularly useful when integrating Web Streams into environments where `streamx` is used instead of native Node.js streams.
- The `toWeb` function makes it easier to use `streamx` streams in web environments, providing interoperability between the two standards.

## Important:
- Both `fromWeb` and `toWeb` functions are specifically designed for `streamx` streams. These functions are not intended for use with native Node.js streams.