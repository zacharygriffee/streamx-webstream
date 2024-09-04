import test from 'brittle';
import { fromWeb } from '../lib/fromWeb.js';
import { toWeb } from '../lib/toWeb.js';

test('Empty readable stream', async (t) => {
    t.plan(2);

    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.close();
        }
    });

    const readableStreamx = fromWeb({ readable: readableWebStream });
    const webStream = toWeb(readableStreamx);

    let result = '';
    const reader = webStream.getReader();
    const { value, done } = await reader.read();

    t.is(value, undefined);
    t.is(done, true);
});

test('Empty writable stream', async (t) => {
    t.plan(1);

    let writtenData = '';
    const writableWebStream = new WritableStream({
        write(chunk) {
            writtenData += new TextDecoder().decode(chunk);
        }
    });

    const writableStreamx = fromWeb({ writable: writableWebStream });
    const webStream = toWeb(writableStreamx);

    await webStream.getWriter().close();

    t.is(writtenData, '');
});

test('Empty duplex stream', async (t) => {
    t.plan(3);

    const readableWebStream = new ReadableStream({
        start(controller) {
            controller.close();
        }
    });

    let writtenData = '';
    const writableWebStream = new WritableStream({
        write(chunk) {
            writtenData += new TextDecoder().decode(chunk);
        }
    });

    const duplexStreamx = fromWeb({ readable: readableWebStream, writable: writableWebStream });
    const webStream = toWeb(duplexStreamx);

    const reader = webStream.readable.getReader();
    const { value, done } = await reader.read();

    const writer = webStream.writable.getWriter();
    await writer.close();

    t.is(value, undefined);
    t.is(done, true);
    t.is(writtenData, '');
});