# streamx-webstream

A toWeb/fromWeb wrapper for [streamx streams](https://github.com/mafintosh/streamx#readme).

Object mode not supported.

---

### Support the cause towards decentralization

bitcoin: bc1q9fpu6muvmg5fj76pyzg3ffjrmksnvfj3c0xva6

---

## Installation

```sh
npm install streamx-webstream --save
```

## Import
```ecmascript 6
import {fromWeb, toWeb} from "streamx-webstream";

// or treeshake

import {fromWeb} from "streamx-webstream/from";

// or treeshake

import {toWeb} from "streamx-webstream/to";

// or CDN (and can tree shake that too) 

import {fromWeb, toWeb} from "https://esm.run/streamx-webstream";
```


## `fromWeb(webReadableStream, [options])`

* writev not supported at the moment

`options.write`

- Pass to the write option a [write function](https://github.com/mafintosh/streamx/tree/master?tab=readme-ov-file#ws_writedata-callback) to become a [streamx.duplex](https://github.com/mafintosh/streamx/tree/master?tab=readme-ov-file#duplex-stream).
- Pass to the write option an unlocked[ WritableStream (WebAPI)](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream) and the [streamx.duplex](https://github.com/mafintosh/streamx/tree/master?tab=readme-ov-file#duplex-stream) will proxy writes to the [WritableStream (WebAPI)](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream) 
- Don't pass write option and the stream will be just a [streamx.Readable](https://github.com/mafintosh/streamx#readable-stream)

`options.asTransform`

If set to true, in all cases where a duplex would be made via `options.write` will be a transform instead.

For all other `options`: [see options](https://github.com/mafintosh/streamx/tree/master?tab=readme-ov-file#readable-stream)


## `fromWeb({readable, writable}, [options])`

An alternative syntax of fromWeb. When `writable` is supplied, the `options.write` is ignored.

Writable can also be a [write function](https://github.com/mafintosh/streamx/tree/master?tab=readme-ov-file#ws_writedata-callback).

### fromWeb readable example:

```ecmascript 6
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

// Creates a lock on the readable web stream
const readableStreamX = fromWeb(readableWebStream, {
    // Add whatever streamx options you want.
    map(buffer) {
        return b4a.toString(buffer);
    },
    //write(value, cb) {
    // Adding a write function turns the returned stream into a duplex. 
    //}
});

readableStreamX.on("data", string => {
    buffered.push(string);
});

readableStreamX.once("close", () => {
    console.log(buffered); // hello, world 
});

// You have to make sure the underlying web stream is 
// unlocked even if streamx is already destroyed unless you 
// don't plan on using it again.
await readableStreamX.close(); 
```

## `toWeb(streamxReadableOrObject)`

* writev not supported at the moment

`streamxReadableOrObject`

- Pass a [streamx.Readable](https://github.com/mafintosh/streamx#readable-stream) and get a [ReadableStream (WebAPI)](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- Pass an object with the following options:
  - `readable`: [streamx.Readable](https://github.com/mafintosh/streamx#readable-stream) 
  - `writable`: [streamx.Writable](https://github.com/mafintosh/streamx#readable-stream)
  - `duplex`: [streamx.Duplex](https://github.com/mafintosh/streamx#duplex-stream) - Will be ignored if either `readable` or `writable` option is defined. You could also pass a [streamx.Transform](https://github.com/mafintosh/streamx#transform-stream) here.

`returns`

- If a [streamx.Duplex](https://github.com/mafintosh/streamx#duplex-stream) OR a pair streamx.Readable and streamx.Writable is supplied will return an object with WebAPI counterparts in this format: { readable, writable }
- If a [streamx.Readable](https://github.com/mafintosh/streamx#readable-stream) is supplied by itself, will return [ReadableStream (WebAPI)](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).
- If a [streamx.Writable](https://github.com/mafintosh/streamx#writable-stream) is suppled by itself, will return [WritableStream (WebAPI)](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream).

#### toWeb Simple readable example:

```ecmascript 6
import { toWeb } from "streamx-webstream";
import { Readable } from "streamx";
import b4a from "b4a";

const buffered = [];
const readable = new Readable();
readable.push('hello');
readable.push('world');
readable.push(null);

const webStreamReadable = toWeb(readable);
const reader = webStreamReadable.getReader();

while(true) {
    const {value, done} = await reader.read();
    if (value) buffered.push(b4a.toString(value));
    if (done) break;
}

console.log(buffered); // hello, world
```

#### toWeb Duplex example:

```ecmascript 6
const duplex = new Duplex({
    read(cb) {
        // read logic
    },
    write(data, cb) {
        // write logic
    }
});

const {readable, writable} = toWeb({duplex});

// Do webApi stuff with the readable and writable.
const writer = writable.getWriter();
const reader = readable.getReader();
```

#### toWeb Just write example:

```ecmascript 6
const duplex = new Duplex({
    write(data, cb) {
        // write logic
    }
});

const writable = toWeb({writable: duplex});

// Do webApi stuff with the writable.
const writer = writable.getWriter();
```

## Test

Run test.html with a web server.

If you're looking for performance time, test the html file without debugger tools open wait 10 seconds then open.

## License

Distributed under the MIT license. See ``LICENSE`` for more information.
