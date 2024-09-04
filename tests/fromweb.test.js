import test, {solo} from 'brittle';
import { fromWeb } from '../lib/fromWeb.js';


test('fromWeb should handle conversion of only ReadableStream', async (t) => {
    t.plan(2);

    // Create a ReadableStream
    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode('only readable'));
            controller.close();
        }
    });

    const readableStream = fromWeb(readableWebStream);

    let result = '';
    readableStream.on('data', (chunk) => {
        result += new TextDecoder().decode(chunk);
    });

    await new Promise(resolve => readableStream.on('end', resolve));

    // Verify the read data
    t.is(result, 'only readable');
    t.pass();
});

test('fromWeb should handle conversion of only WritableStream', async (t) => {
    t.plan(2);

    // WritableStream to accumulate data
    let writtenData = '';
    const writableWebStream = new WritableStream({
        write(chunk) {
            writtenData += new TextDecoder().decode(chunk);
        }
    });

    const writableStream = fromWeb(writableWebStream);

    // Write data to the writable stream
    writableStream.write(new TextEncoder().encode('only writable'));
    await new Promise(resolve => writableStream.end(resolve));

    // Verify the written data
    t.is(writtenData, 'only writable');
    t.pass();
});

test('fromWeb should handle conversion of both ReadableStream and WritableStream', async (t) => {
    t.plan(3);

    // Create a ReadableStream with a chunk of data
    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode('combined readable'));
            controller.close();
        }
    });

    // Create a WritableStream that accumulates written data
    let writtenData = '';
    const writableWebStream = new WritableStream({
        write(chunk) {
            writtenData += new TextDecoder().decode(chunk);
        }
    });

    // Combine readable and writable streams into a duplex
    const webStream = {readable: readableWebStream, writable: writableWebStream};
    const duplexStream = fromWeb(webStream);

    let dataRead = '';
    duplexStream.on('data', (chunk) => {
        dataRead += new TextDecoder().decode(chunk);
    });

    let errorOccurred = false;
    duplexStream.on('error', (err) => {
        console.error(`Stream error: ${err.stack || err}`);
        errorOccurred = true;
    });

    const finishPromise = new Promise(resolve => duplexStream.on('finish', resolve));

    // Write data to the writable stream part
    duplexStream.write(new TextEncoder().encode('combined writable'));
    duplexStream.end();

    // Wait for the finish event
    await finishPromise;

    // Verify that no errors occurred
    t.is(errorOccurred, false);

    // Verify the read and write operations
    t.is(dataRead, 'combined readable');
    t.is(writtenData, 'combined writable');
});

test('fromWeb function should create streamx streams from Web Streams API streams', async (t) => {
    t.plan(3);

    // Create a ReadableStream with a chunk of data
    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode('chunk'));
            controller.close();
        }
    });

    // Create a WritableStream that accumulates written data
    let writtenData = '';
    const writableWebStream = new WritableStream({
        write(chunk) {
            writtenData += new TextDecoder().decode(chunk);
        }
    });

    // Combine readable and writable streams into a duplex
    const webStream = { readable: readableWebStream, writable: writableWebStream };
    const duplexStream = fromWeb(webStream);

    let dataRead = '';
    duplexStream.on('data', (chunk) => {
        dataRead += new TextDecoder().decode(chunk);
    });

    let errorOccurred = false;
    duplexStream.on('error', (err) => {
        console.error(`Stream error: ${err.stack || err}`);
        errorOccurred = true;
    });

    const finishPromise = new Promise(resolve => duplexStream.on('finish', resolve));

    // Write data to the writable stream part
    duplexStream.write(new TextEncoder().encode('chunk again'));
    duplexStream.end();

    // Wait for the finish event
    await finishPromise;

    // Verify that no errors occurred
    t.is(errorOccurred, false);

    // Verify the read and write operations
    t.is(dataRead, 'chunk');
    t.is(writtenData, 'chunk again');
});

test('fromWeb should convert a ReadableStream to a streamx Readable', async (t) => {
    t.plan(2);

    // Create a ReadableStream
    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode('hello'));
            controller.close();
        }
    });

    const readableStream = fromWeb({ readable: readableWebStream });

    let result = '';
    readableStream.on('data', (chunk) => {
        result += new TextDecoder().decode(chunk);
    });

    await new Promise(resolve => readableStream.on('end', resolve));

    // Verify the read data
    t.is(result, 'hello');
    t.pass();
});

test('fromWeb should convert a WritableStream to a streamx Writable', async (t) => {
    t.plan(2);

    // WritableStream to accumulate data
    let writtenData = '';
    const writableWebStream = new WritableStream({
        write(chunk) {
            writtenData += new TextDecoder().decode(chunk);
        }
    });

    const writableStream = fromWeb({ writable: writableWebStream });

    // Write data to the writable stream
    writableStream.write(new TextEncoder().encode('world'));
    await new Promise(resolve => writableStream.end(resolve));

    // Verify the written data
    t.is(writtenData, 'world');
    t.pass();
});

test('fromWeb should handle errors in ReadableStream correctly', async (t) => {
    t.plan(2);

    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.error(new Error("Test error"));
        }
    });

    const readableStream = fromWeb({ readable: readableWebStream });

    readableStream.on('error', (err) => {
        t.is(err.message, "Test error");
        t.pass();
    });

    readableStream.read();
});

test('fromWeb should handle errors in WritableStream correctly', async (t) => {
    t.plan(2);

    const writableWebStream = new WritableStream({
        write() {
            throw new Error("Write error");
        }
    });

    const writableStream = fromWeb({ writable: writableWebStream });

    writableStream.on('error', (err) => {
        t.is(err.message, "Write error");
        t.pass();
    });

    writableStream.write(new TextEncoder().encode('data'));
});


test('fromWeb should signal end of streamx ReadableStream when Web ReadableStream pushes null', async (t) => {
    t.plan(2);

    // Create a ReadableStream that immediately pushes null to signal end-of-stream
    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.enqueue(null);
            controller.close();
        }
    });

    const readableStream = fromWeb({readable: readableWebStream});

    let result = '';
    readableStream.on('data', (chunk) => {
        result += new TextDecoder().decode(chunk);
    });

    await new Promise(resolve => readableStream.on('end', resolve));

    // Verify that the stream has ended
    t.is(result, '');
    t.pass();
});