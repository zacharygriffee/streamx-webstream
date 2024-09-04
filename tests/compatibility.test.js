import {test, solo} from 'brittle';
import { fromWeb } from '../lib/fromWeb.js';
import { toWeb } from '../lib/toWeb.js';
import { Readable, Writable, Duplex } from "streamx";
test('fromWeb(toWeb(ReadStream)) should retain functionality', async (t) => {
    t.plan(2);

    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode('hello'));
            controller.close();
        }
    });

    const readableStreamx = fromWeb({ readable: readableWebStream });
    const webStream = toWeb(readableStreamx);

    let result = '';
    const reader = webStream.getReader();
    let done = false;
    while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) {
            done = true;
        } else {
            result += new TextDecoder().decode(value);
        }
    }

    t.is(result, 'hello');
    t.pass();
});

test('toWeb(fromWeb(ReadStream)) should retain functionality', async (t) => {
    t.plan(2);

    const readableStreamx = new Readable({
        read(cb) {
            this.push(new TextEncoder().encode('world'));
            this.push(null);
            cb();
        }
    });

    const webStream = toWeb(readableStreamx);
    const streamx = fromWeb({ readable: webStream });

    let result = '';
    streamx.on('data', (chunk) => {
        result += new TextDecoder().decode(chunk);
    });

    await new Promise(resolve => streamx.on('end', resolve));

    t.is(result, 'world');
    t.pass();
});

test('fromWeb(toWeb(WriteStream)) should retain functionality', async (t) => {
    t.plan(2);

    let writtenData = '';
    const writableStreamx = new Writable({
        write(chunk, cb) {
            writtenData += new TextDecoder().decode(chunk);
            cb();
        }
    });

    const webStream = toWeb(writableStreamx);
    const streamx = fromWeb({ writable: webStream });

    streamx.write(new TextEncoder().encode('hello'));
    await new Promise(resolve => streamx.end(resolve));

    t.is(writtenData, 'hello');
    t.pass();
});

test('toWeb(fromWeb(WriteStream)) should retain functionality', async (t) => {
    t.plan(2);

    let writtenData = '';
    const writableWebStream = new WritableStream({
        write(chunk) {
            writtenData += new TextDecoder().decode(chunk);
        }
    });

    const streamx = fromWeb({ writable: writableWebStream });
    const webStream = toWeb(streamx);

    const writer = webStream.getWriter();
    await writer.write(new TextEncoder().encode('world'));
    await writer.close();

    setTimeout(() => {
        t.is(writtenData, 'world');
        t.pass();
    });
});

test('fromWeb(toWeb(DuplexStream)) should retain functionality', async (t) => {
    t.plan(3);

    const duplexStreamx = new Duplex({
        read(cb) {
            this.push(new TextEncoder().encode('hello'));
            this.push(null);
            cb();
        },
        write(chunk, cb) {
            this.receivedData = new TextDecoder().decode(chunk);
            cb();
        }
    });

    const webStream = toWeb(duplexStreamx);
    const streamx = fromWeb({ readable: webStream.readable, writable: webStream.writable });

    let result = '';
    streamx.on('data', (chunk) => {
        result += new TextDecoder().decode(chunk);
    });

    await new Promise(resolve => streamx.on('end', resolve));

    streamx.write(new TextEncoder().encode('response'));
    await new Promise(resolve => streamx.end(resolve));

    t.is(result, 'hello');
    t.is(duplexStreamx.receivedData, 'response');
    t.pass();
});

test('toWeb(fromWeb(DuplexStream)) should retain functionality', async (t) => {
    t.plan(3);

    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode('world'));
            controller.close();
        }
    });

    let writtenData = '';
    const writableWebStream = new WritableStream({
        write(chunk) {
            writtenData += new TextDecoder().decode(chunk);
        }
    });

    const webStream = { readable: readableWebStream, writable: writableWebStream };

    const duplexStreamx = fromWeb(webStream);
    const roundtripWebStream = toWeb(duplexStreamx);

    let result = '';
    const reader = roundtripWebStream.readable.getReader();
    let done = false;
    while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) {
            done = true;
        } else {
            result += new TextDecoder().decode(value);
        }
    }

    const writer = roundtripWebStream.writable.getWriter();
    await writer.write(new TextEncoder().encode('feedback'));
    await writer.close();

    setTimeout(() => {
        t.is(result, 'world');
        t.is(writtenData, 'feedback');
        t.pass();
    });
});


// Test to ensure that null push will end streams when converted from and to web
test('fromWeb(toWeb(ReadStream)) should handle null push properly', async (t) => {
    t.plan(2);

    const readableStreamx = new Readable({
        read(cb) {
            this.push(new TextEncoder().encode('hello'));
            this.push(null);
            cb();
        }
    });

    const webStream = toWeb(readableStreamx);
    const streamx = fromWeb({readable: webStream});

    let result = '';
    streamx.on('data', (chunk) => {
        result += new TextDecoder().decode(chunk);
    });

    await new Promise(resolve => streamx.on('end', resolve));

    t.is(result, 'hello');
    t.pass();
});

test('toWeb(fromWeb(ReadStream)) should handle null push properly', async (t) => {
    t.plan(2);

    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode('world'));
            controller.close();
        }
    });

    const streamx = fromWeb({readable: readableWebStream});
    const webStream = toWeb(streamx);

    const reader = webStream.getReader();
    let result = '';
    let done = false;

    while (!done) {
        const {value, done: readerDone} = await reader.read();
        if (readerDone) {
            done = true;
        } else {
            result += new TextDecoder().decode(value);
        }
    }

    t.is(result, 'world');
    t.pass();
});

// Test to ensure that null write will end streams when converted from and to web
test('fromWeb(toWeb(WriteStream)) should handle null write properly', async (t) => {
    t.plan(2);

    let writtenData = '';
    const writableStreamx = new Writable({
        write(chunk, cb) {
            if (chunk !== null) {
                writtenData += new TextDecoder().decode(chunk);
            }
            cb();
        }
    });

    const webStream = toWeb(writableStreamx);
    const streamx = fromWeb({writable: webStream});

    streamx.write(new TextEncoder().encode('hello'));
    streamx.write(null);
    await new Promise(resolve => streamx.end(resolve));

    t.is(writtenData, 'hello');
    t.pass();
});

test('fromWeb(toWeb(ReadableStream)) should handle null write properly', async (t) => {
    t.plan(2);
    let writtenData = '';

    const readableStreamx = new Readable({
        read(cb) {
            this.push(new TextEncoder().encode('hello'));
            this.push(null); // Signal end of stream
            cb();
        }
    });

    const webStream = toWeb(readableStreamx);
    const reader = webStream.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value !== null) {
            writtenData += new TextDecoder().decode(value);
        }
    }

    t.is(writtenData, 'hello');
    t.pass();
});

test('toWeb(fromWeb(ReadableStream)) should handle null write properly', async (t) => {
    t.plan(2);
    let writtenData = '';

    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode('world'));
            controller.close();
        }
    });

    const streamx = fromWeb({ readable: readableWebStream });
    streamx.on('data', (chunk) => {
        if (chunk !== null) {
            writtenData += new TextDecoder().decode(chunk);
        }
    });

    await new Promise(resolve => streamx.on('end', resolve));
    t.is(writtenData, 'world');
    t.pass();
});