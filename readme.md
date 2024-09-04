# streamx-webstream

A wrapper for [streamx streams](https://github.com/mafintosh/streamx#readme) that provides toWeb/fromWeb functions.

Object mode not supported.

## Installation

```sh
npm install streamx-webstream --save
```

## Import

```javascript
import { fromWeb, toWeb } from "streamx-webstream";
// or
import { fromWeb } from "streamx-webstream/from";
// or
import { toWeb } from "streamx-webstream/to";
// or CDN
import { fromWeb, toWeb } from "https://esm.run/streamx-webstream";
```

## API

### `fromWeb`

#### Description:
The `fromWeb` function wraps Web Streams (`ReadableStream` & `WritableStream`) and converts them into `streamx` streams. This is specifically designed for `streamx` and is not intended for native Node.js streams.

#### Syntax:
```javascript
const streamx = fromWeb({ readable, writable });
// or
const streamx = fromWeb(readable);
// or
const streamx = fromWeb(writable);
```

#### Parameters:
- **readable** *(ReadableStream, optional)*: The readable stream to be wrapped.
- **writable** *(WritableStream, optional)*: The writable stream to be wrapped.

#### Returns:
- *(Streamx.Duplex | Streamx.Readable | Streamx.Writable)*: A `streamx.Duplex` stream if both readable and writable streams are provided. A `streamx.Readable` or `streamx.Writable` stream if only one is provided.

#### Example:

```javascript
import { fromWeb } from "streamx-webstream";
import b4a from "b4a";

const readableWebStream = new ReadableStream({
    start(controller) {
        controller.enqueue(b4a.from("hello"));
        controller.enqueue(b4a.from("world"));
        controller.close();
    }
});

const writableWebStream = new WritableStream({
    write(chunk) {
        console.log('Received chunk:', b4a.toString(chunk));
    }
});

const duplexStreamx = fromWeb({ readable: readableWebStream, writable: writableWebStream });

duplexStreamx.on('data', (chunk) => {
    console.log('Read data:', b4a.toString(chunk));
});

duplexStreamx.write(b4a.from('hello from write'));
duplexStreamx.end();
```

### `toWeb`

#### Description:
The `toWeb` function converts `streamx` streams into Web Streams (`ReadableStream` & `WritableStream`). This function is tailored for `streamx` streams and not for native Node.js streams.

#### Syntax:
```javascript
const webStream = toWeb(stream, asBytes);
// or
const webStream = toWeb({ readable: streamxReadable, writable: streamxWritable }, asBytes);
```

#### Parameters:
- **stream** *(Streamx stream | Object)*: The `streamx` stream or an object containing `readable`, `writable`, or both to be converted into Web Streams.
- **asBytes** *(boolean, optional)*: Indicates whether the stream should be handled as byte streams. Default is `false`.

#### Returns:
- *(ReadableStream | WritableStream | Object with ReadableStream and/or WritableStream)*: Returns Web Streams corresponding to the provided `streamx` stream:
    - **ReadableStream** if the provided `streamx` stream is readable.
    - **WritableStream** if the provided `streamx` stream is writable.
    - **Object containing both `ReadableStream` and `WritableStream`** if both are provided.

#### Example:

```javascript
import { toWeb } from "streamx-webstream";
import { Duplex } from "streamx";
import b4a from 'b4a';

const duplexStreamx = new Duplex({
  read(cb) {
    this.push(b4a.from('Streamx Duplex Readable Data'));
    this.push(null);
    cb();
  },
  write(chunk, cb) {
    console.log('Received duplex chunk:', b4a.toString(chunk));
    cb();
  }
});

const { readable, writable } = toWeb(duplexStreamx);
const reader = readable.getReader();
const writer = writable.getWriter();

reader.read().then(({ value, done }) => {
  if (!done) {
    console.log('Duplex Web Readable data:', b4a.toString(value));
  }
});

writer.write(b4a.from('Streamx Duplex Writable Data')).then(() => writer.close());
```

## Detailed API Documentation

For more detailed information on the API, refer to the [API Documentation](./API.md).

## License

Distributed under the MIT license. See `LICENSE` for more information.