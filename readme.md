# streamx-webstream

A toWeb/fromWeb wrapper for streamx streams.

Object mode not supported.

### Installation

```sh
npm install streamx-webstream --save
```

### Import
```ecmascript 6
import {fromWeb, toWeb} from "streamx-webstream";

// or

import {fromWeb} from "streamx-webstream/from";

// or

import {toWeb} from "streamx-webstream/to";
```


### fromWeb(webStream, [options])

Create a [Readable Stream (streamx API)](https://www.npmjs.com/package/streamx#readable-stream) from a
[Readable Stream (WebAPI)](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)

options: [see options](https://github.com/mafintosh/streamx/tree/master?tab=readme-ov-file#readable-stream) 

```ecmascript 6
import { fromWeb } from "streamx-webstream";
import b4a from "b4a";

// Creates a lock on the readable web stream
const readableWebStream = new ReadableStream({
    start(controller) {
        controller.enqueue(b4a.from("hello"));
        controller.enqueue(b4a.from("world"));
        controller.close();
    }
});

const buffered = [];
const readableStreamX = fromWeb(readableWebStream, {
    // Add whatever streamx options you want.
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

// You have to make sure the underlying web stream is 
// unlocked even if streamx is already destroyed unless you 
// don't plan on using it again.
await readableStreamX.close(); 
```

### toWeb(streamx)

Create a [Readable Stream (WebAPI)](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) from [Readable Stream (streamx API)](https://www.npmjs.com/package/streamx#readable-stream).
```ecmascript 6
import { toWeb } from "streamx-webstream";
import { Readable } from "streamx";
import b4a from "b4a";

const buffered = [];
const readable = new Readable();
r.push('hello');
r.push('world');
r.push(null);

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