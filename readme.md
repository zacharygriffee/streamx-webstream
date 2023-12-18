# streamx-webstream

A toWeb/fromWeb wrapper for [streamx streams](https://github.com/mafintosh/streamx#readme).

Object mode not supported.

### Installation

```sh
npm install streamx-webstream --save
```

### Import
```ecmascript 6
import {fromWeb, toWeb} from "streamx-webstream";

// or treeshake

import {fromWeb} from "streamx-webstream/from";

// or treeshake

import {toWeb} from "streamx-webstream/to";

// or CDN (and can tree shake that too) 

import {fromWeb, toWeb} from "https://esm.run/streamx-webstream";
```


### streamx.Readable | streamx.Duplex = fromWeb(webStream, [options])

Create a [Readable Stream (streamx API)](https://www.npmjs.com/package/streamx#readable-stream) from a
[Readable Stream (WebAPI)](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)

##### options.write

- Pass a [write function](https://github.com/mafintosh/streamx/tree/master?tab=readme-ov-file#ws_writedata-callback) to become a [streamx.duplex](https://github.com/mafintosh/streamx/tree/master?tab=readme-ov-file#duplex-stream).
- Pass to the write function an unlocked[ WritableStream (WebAPI)](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream) and the [streamx.duplex](https://github.com/mafintosh/streamx/tree/master?tab=readme-ov-file#duplex-stream) will proxy writes to the [WritableStream (WebAPI)](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream) 
- Don't pass write option and the stream will be just a streamx.Readable

For all other `options`: [see options](https://github.com/mafintosh/streamx/tree/master?tab=readme-ov-file#readable-stream)

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

### ReadableStream = toWeb(streamx)

Create a [Readable Stream (WebAPI)](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) from [Readable Stream (streamx API)](https://www.npmjs.com/package/streamx#readable-stream).
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

### Roadmap

- Support object mode maybe

## Test

Run test.html with a web server.

## License

Distributed under the MIT license. See ``LICENSE`` for more information.
