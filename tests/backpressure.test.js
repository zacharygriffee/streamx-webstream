import test, {solo} from 'brittle';
import { fromWeb } from '../lib/fromWeb.js';
import {toWeb} from "../lib/toWeb.js";
import {Readable} from "streamx";
import b4a from "b4a";

test('Backpressure handling in streams', async (t) => {
    t.plan(2);

    let backpressureTriggered = false;

    const readableWebStream = new ReadableStream({
        start(controller) {
            this.counter = 0;
        },
        pull(controller) {
            this.counter++;


            // Enqueue a new chunk of data into the stream
            controller.enqueue(new TextEncoder().encode(`Chunk ${this.counter}`));

            if (controller.desiredSize <= 0) {
                backpressureTriggered = true;
            }

            // If we've produced 50 chunks, close the stream
            if (this.counter >= 50) {
                controller.close();
            }
        },
        cancel(reason) {
            console.log(`Stream canceled: ${reason}`);
        }
    }, {
        highWaterMark: 1 // Lower highWaterMark to trigger backpressure sooner
    });

    const readableStreamx = fromWeb({ readable: readableWebStream });

    let readChunks = [];
    readableStreamx.on('data', (chunk) => {
        readChunks.push(new TextDecoder().decode(chunk));
    });

    await new Promise(resolve => {
        readableStreamx.on('end', resolve);
        readableStreamx.on('data', () => {
            setTimeout(() => {}, 500); // Simulate a slow consumer
        });
    });

    // Validate backpressure was observed
    t.ok(backpressureTriggered, 'Backpressure signal should be triggered');

    // Ensure data has been read correctly
    t.is(readChunks.length, 50, 'Should have read all 50 chunks');
});

test('Backpressure from Web to Node.js (fromWeb)', async (t) => {
    t.plan(3);

    let backpressureTriggered = false;

    const readableWebStream = new ReadableStream({
        start(controller) {
            this.counter = 0;
        },
        pull(controller) {
            this.counter++;
            console.log(`Producing chunk ${this.counter}`);

            // Enqueue a new chunk into the stream
            controller.enqueue(new TextEncoder().encode(`Chunk ${this.counter}`));

            if (controller.desiredSize <= 0) {
                backpressureTriggered = true;
            }

            // Close the stream after 50 chunks
            if (this.counter >= 50) {
                controller.close();
            }
        },
        cancel(reason) {
            console.log(`Stream canceled: ${reason}`);
        }
    }, {
        highWaterMark: 1 // Trigger backpressure sooner
    });

    const readableStreamx = fromWeb({ readable: readableWebStream });

    let readChunks = [];
    readableStreamx.on('data', (chunk) => {
        readChunks.push(new TextDecoder().decode(chunk));
    });

    await new Promise(resolve => {
        readableStreamx.on('end', resolve);
        readableStreamx.on('data', () => {
            setTimeout(() => {}, 500); // Slow consumption
        });
    });

    t.ok(backpressureTriggered, 'Backpressure signal should be triggered from Web to Node.js');
    t.is(readChunks.length, 50, 'Should have read all 50 chunks');
    t.is(readChunks[0], 'Chunk 1', 'First chunk should be "Chunk 1"');
});

test('Backpressure from Node.js to Web Stream (toWeb)', async (t) => {
    t.plan(3);

    let producedChunks = 0;
    let readChunks = [];
    let backpressureReported = false;

    const readableNodeStream = new Readable({
        read(cb) {
            if (producedChunks < 20) {
                this.push(`Chunk ${++producedChunks}`);
                cb();
            } else {
                this.push(null); // End the stream
                cb();
            }
        }
    });

    const webStream = toWeb(readableNodeStream);
    const monitoredWebStream = new MonitoredReadableStream(webStream);
    const reader = monitoredWebStream.getReader();

    async function consumeStream() {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            readChunks.push(new TextDecoder().decode(value));

            if (monitoredWebStream.isBackpressureDetected()) {
                console.log('Backpressure is currently being applied');
                backpressureReported = true;
            }

            await new Promise((resolve) => setTimeout(resolve, 300)); // Slower consumption
        }
    }

    await consumeStream();

    t.ok(backpressureReported, 'Backpressure signal should be triggered from Node.js to Web');
    t.is(readChunks.length, 20, 'Should have read all 20 chunks');
    t.is(readChunks[0], 'Chunk 1', 'First chunk should be "Chunk 1"');
});

test('Backpressure from Web Stream to Node.js streamx Readable (toNode)', async (t) => {
    t.plan(3);

    let producedChunks = 0;
    let readChunks = [];
    let backpressureReported = false;

    const webStream = new ReadableStream({
        async start(controller) {
            while (producedChunks < 20) {
                controller.enqueue(b4a.from(`Chunk ${++producedChunks}`));
                await new Promise(res => setTimeout(res, 500)); // Slow production
            }
            controller.close();
        }
    });

    const nodeStream = new MonitoredStreamxReadable(webStream);

    nodeStream.on('data', (chunk) => {
        readChunks.push(new TextDecoder().decode(chunk));

        if (nodeStream.isBackpressureDetected()) {
            backpressureReported = true;
        }
    });

    await new Promise((resolve) => nodeStream.on('end', resolve));

    t.ok(backpressureReported, 'Backpressure signal should be triggered from Web to Node.js');
    t.is(readChunks.length, 20, 'Should have read all 20 chunks');
    t.is(readChunks[0], 'Chunk 1', 'First chunk should be "Chunk 1"');
});

class MonitoredStreamxReadable extends Readable {
    constructor(webStream) {
        super();
        this.webStreamReader = webStream.getReader();
        this.lastReadTime = Date.now();
        this.backpressureDetected = false;
    }

    async _read(cb) {
        const now = Date.now();
        const timeSinceLastRead = now - this.lastReadTime;

        if (timeSinceLastRead > 200) { // Backpressure detection threshold in milliseconds
            this.backpressureDetected = true;
            console.log('Backpressure detected in streamx stream');
        } else {
            this.backpressureDetected = false;
        }

        this.lastReadTime = now;

        const { done, value } = await this.webStreamReader.read();

        if (done) {
            this.push(null); // End the stream
        } else {
            this.push(b4a.from(value));
        }
        cb();
    }

    isBackpressureDetected() {
        return this.backpressureDetected;
    }
}


class MonitoredReadableStream {
    constructor(webStream) {
        this.lastPullTime = Date.now();
        this.backpressureDetected = false;

        this.stream = new ReadableStream({
            start: (controller) => {
                this.controller = controller;
                this.reader = webStream.getReader();
            },
            pull: async (controller) => {
                const now = Date.now();
                const timeSinceLastPull = now - this.lastPullTime;
                if (timeSinceLastPull > 200) { // Slower consumption threshold in milliseconds
                    this.backpressureDetected = true;
                    console.log('Backpressure detected');
                } else {
                    this.backpressureDetected = false;
                }

                this.lastPullTime = now;

                const { done, value } = await this.reader.read();
                if (done) {
                    controller.close();
                    return;
                }

                controller.enqueue(value);
            },
            cancel: (reason) => {
                console.log(`Stream canceled: ${reason}`);
                this.reader.cancel(reason);
            }
        });
    }

    getReader() {
        return this.stream.getReader();
    }

    isBackpressureDetected() {
        return this.backpressureDetected;
    }
}
