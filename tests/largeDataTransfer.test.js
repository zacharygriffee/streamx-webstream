import test from 'brittle';
import { fromWeb } from '../lib/fromWeb.js';
import { toWeb } from '../lib/toWeb.js';

test('Large data transfer through streams', async (t) => {
    t.plan(2);

    const largeData = new TextEncoder().encode('a'.repeat(1_000_000));

    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.enqueue(largeData);
            controller.close();
        }
    });

    const readableStreamx = fromWeb({ readable: readableWebStream });
    const webStream = toWeb(readableStreamx);

    let result = new Uint8Array();
    const reader = webStream.getReader();
    let done = false;
    while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) {
            done = true;
        } else {
            const newResult = new Uint8Array(result.length + value.length);
            newResult.set(result);
            newResult.set(value, result.length);
            result = newResult;
        }
    }

    t.is(result.byteLength, largeData.byteLength);
    t.pass();
});