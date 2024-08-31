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

## `fromWeb(webReadableStream, [options])`

Convert Web ReadableStream to streamx.

### Options

- `options.write`: Function or WritableStream. Converts to streamx.duplex.
- `options.asTransform`: Boolean. If true, converts to transform stream.

### Example

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

const buffered = [];
const readableStreamX = fromWeb(readableWebStream, {
    map(buffer) {
        return b4a.toString(buffer);
    }
});

readableStreamX.on("data", string => {
    buffered.push(string);
});

readableStreamX.once("close", () => {
    console.log(buffered); // hello, world
});

await readableStreamX.close();
```

## `toWeb(streamxReadableOrObject)`

Convert streamx to Web Readable/WritableStream.

### Example

```javascript
import { toWeb } from "streamx-webstream";
import { Readable } from "streamx";
import b4a from "b4a";

const readable = new Readable();
readable.push('hello');
readable.push('world');
readable.push(null);

const webStreamReadable = toWeb(readable);
const reader = webStreamReadable.getReader();

const buffered = [];
while (true) {
    const { value, done } = await reader.read();
    if (value) buffered.push(b4a.toString(value));
    if (done) break;
}

console.log(buffered); // hello, world
```

## License

Distributed under the MIT license. See `LICENSE` for more information.
