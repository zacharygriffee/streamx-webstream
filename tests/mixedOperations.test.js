import test from 'brittle';
import { fromWeb } from '../lib/fromWeb.js';
import { toWeb } from '../lib/toWeb.js';
import { Duplex } from "streamx";

test('Mixed read and write operations on duplex stream', async (t) => {
    t.plan(3);

    const duplexStreamx = new Duplex({
        read(cb) {
            this.push(new TextEncoder().encode('read1'));
            this.push(new TextEncoder().encode('read2'));
            this.push(null);
            cb();
        },
        write(chunk, cb) {
            this.receivedData = this.receivedData || '';
            this.receivedData += new TextDecoder().decode(chunk);
            cb();
        }
    });

    const webStream = toWeb(duplexStreamx);
    const roundtripStream = fromWeb({ readable: webStream.readable, writable: webStream.writable });

    let result = '';
    roundtripStream.on('data', (chunk) => {
        result += new TextDecoder().decode(chunk);
    });

    await new Promise(resolve => roundtripStream.on('end', resolve));

    roundtripStream.write(new TextEncoder().encode('write1'));
    roundtripStream.write(new TextEncoder().encode('write2'));
    await new Promise(resolve => roundtripStream.end(resolve));

    t.is(result, 'read1read2');
    t.is(duplexStreamx.receivedData, 'write1write2');
    t.pass();
});