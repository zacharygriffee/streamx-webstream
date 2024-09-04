// testFlushOnEnd.js
import { test } from 'brittle';
import { fromWeb } from '../lib/fromWeb.js';
import { toWeb } from '../lib/toWeb.js';
import { Writable } from 'streamx';

// Helper to create a Writable stream with end flushing checks
class FlushingWritable extends Writable {
    constructor() {
        super();
        this.chunks = [];
        this.finished = false;
    }

    _write(chunk, cb) {
        this.chunks.push(chunk);
        cb();
    }

    _final(cb) {
        this.finished = true;
        cb();
    }
}

test('writable stream operations are flushed when end is called', async t => {
    // Create a FlushingWritable stream
    const flushingWritable = new FlushingWritable();

    // Convert it to a web stream
    const webWritable = toWeb(flushingWritable);

    // Convert back to StreamX writable
    const streamXWritable = fromWeb(webWritable);

    // Write the first chunk and ensure async completion
    streamXWritable.write('first chunk');

    // Since _write is async, give it a tick to process
    await new Promise(resolve => setImmediate(resolve));
    t.is(flushingWritable.chunks.length, 1, 'First chunk should be flushed');

    // Write the second chunk and ensure async completion
    streamXWritable.write('second chunk');

    // Since _write is async, give it a tick to process
    await new Promise(resolve => setImmediate(resolve));
    t.is(flushingWritable.chunks.length, 2, 'Second chunk should be flushed');

    // End the stream with the final chunk and ensure async completion
    streamXWritable.end('final chunk');

    // Wait for the 'finish' event to ensure all chunks are processed
    await new Promise(resolve => flushingWritable.on('finish', resolve));

    // Check the state after calling end
    t.is(flushingWritable.chunks.length, 3, 'Final chunk should be flushed after end');
    t.is(flushingWritable.chunks[2].toString(), 'final chunk', 'Final chunk should be the last one');
    t.is(flushingWritable.finished, true, 'Stream should be marked as finished');
});