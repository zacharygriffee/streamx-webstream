import { test, solo } from 'brittle';
import { fromWeb } from '../lib/fromWeb.js';
import { toWeb } from '../lib/toWeb.js';

test('Error propagation in readable stream', async (t) => {
    t.plan(1);

    const expectedError = new Error('Test Error');
    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode('data'));
            controller.error(expectedError);
        }
    });

    const readableStreamx = fromWeb({ readable: readableWebStream });

    const readError = await new Promise(resolve => {
        readableStreamx.on('error', resolve);
    });

    t.is(readError, expectedError);
});

test('Error propagation in writable stream', async (t) => {
    t.plan(1);

    const expectedError = new Error('Test Error');
    const writableWebStream = new WritableStream({
        write() {
            throw expectedError;
        }
    });

    const writableStreamx = fromWeb({ writable: writableWebStream });

    const writeError = await new Promise(resolve => {
        writableStreamx.on('error', resolve);
        writableStreamx.write(new TextEncoder().encode('data'));
    });

    t.is(writeError, expectedError);
});

test('Error propagation in duplex stream', async (t) => {
    t.plan(1); // Expecting only one assertion

    const expectedError = new Error('Test Error');
    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.error(expectedError);
        }
    });

    let writtenData = '';
    const writableWebStream = new WritableStream({
        write(chunk) {
            writtenData += new TextDecoder().decode(chunk);
        }
    });

    const duplexStreamx = fromWeb({ readable: readableWebStream, writable: writableWebStream });

    const closePromise = new Promise(resolve => {
        duplexStreamx.on('close', resolve);
    });

    const readErrorPromise = new Promise(resolve => {
        duplexStreamx.on('error', resolve);
    });

    const readError = await readErrorPromise;
    t.is(readError, expectedError);

    // Ensure hidden non-final assertions
    await closePromise;

    // No need to attempt writing data after the error
    // The test should focus on verifying the error propagation and closure
});