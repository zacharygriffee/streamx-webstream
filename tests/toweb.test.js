import { test } from 'brittle';
import { Readable, Writable, Duplex } from 'streamx';
import { toWeb } from '../lib/toWeb.js';

// Test readable stream
class ReadableTest extends Readable {
    _read(cb) {
        this.push('chunk');
        this.push(null);
        cb();
    }
}

// Test writable stream
class WritableTest extends Writable {
    _write(chunk, callback) {
        this.data = (this.data || '') + chunk.toString();
        callback();
    }
}

// Test duplex stream
class DuplexTest extends Duplex {
    _read(cb) {
        this.push('chunk');
        this.push(null);
        cb();
    }

    _write(chunk, callback) {
        this.data = (this.data || '') + chunk.toString();
        callback();
    }
}

test('should convert a Readable stream to a ReadableStream', (t) => {
    const readable = new ReadableTest();
    const webStream = toWeb(readable);
    t.ok(webStream instanceof ReadableStream);
});

test('should convert a Writable stream to a WritableStream', (t) => {
    const writable = new WritableTest();
    const webStream = toWeb(writable);
    t.ok(webStream instanceof WritableStream);
});

test('should convert a Duplex stream to { readable: ReadableStream, writable: WritableStream }', (t) => {
    const duplex = new DuplexTest();
    const webStream = toWeb(duplex);
    t.ok(webStream.readable instanceof ReadableStream);
    t.ok(webStream.writable instanceof WritableStream);
});

test('should handle a stream with readable and writable parts separately', (t) => {
    const readable = new ReadableTest();
    const writable = new WritableTest();
    const webStream = toWeb({ readable, writable });
    t.ok(webStream.readable instanceof ReadableStream);
    t.ok(webStream.writable instanceof WritableStream);
});

test('should throw an error for invalid streams', (t) => {
    t.exception(() => toWeb({}), 'Invalid stream');
});

test('should end the stream on null push from a readable stream', async (t) => {
    t.plan(1);

    class NullPushReadable extends Readable {
        _read(cb) {
            this.push(null); // Push null to end the stream
            cb();
        }
    }

    const readable = new NullPushReadable();
    const webStream = toWeb(readable);

    const reader = webStream.getReader();
    reader.read().then(({ done }) => {
        t.ok(done, 'Stream should be done');
    });
});

test('should end the stream on null push from a duplex readable stream', async (t) => {
    t.plan(1);

    class NullPushDuplex extends Duplex {
        _read(cb) {
            this.push(null); // Push null to end the readable part of the stream
            cb();
        }

        _write(chunk, callback) {
            callback();
        }
    }

    const duplex = new NullPushDuplex();
    const { readable } = toWeb(duplex);

    const reader = readable.getReader();
    reader.read().then(({ done }) => {
        t.ok(done, 'Stream should be done');
    });
});

/**
 * Reminders for future updates and tests:
 * - Ensure `_read` methods in streamx classes call the provided `cb()` after pushing data.
 * - `_write` methods in streamx classes do not include an `encoding` argument.
 * - Handle `null` pushes properly to close readable streams.
 * - Ensure we test both standalone readable and writable streamx streams, as well as combined duplex streams.
 */
