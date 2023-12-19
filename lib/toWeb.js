import b4a from "b4a";
import {Writable} from "streamx";

export function toWeb(readableStreamX, asBytes) {
    let writableStreamX;
    let destroyed = false;
    const e = {};

    if (readableStreamX && !isStreamx(readableStreamX)) {
        let duplex;
        ({
            readable: readableStreamX,
            writable: writableStreamX,
            duplex
        } = readableStreamX);
        if (duplex && !readableStreamX && !writableStreamX) {
            readableStreamX = duplex;
            writableStreamX = duplex;
        }
    }

    if (!readableStreamX && !writableStreamX) {
        throw new Error("Invalid stream");
    }

    let readableStreamWeb;
    let writableStreamWeb;

    if (readableStreamX) {
        readableStreamWeb = new ReadableStream({
            start: function (controller) {
                e['data'] = _data
                e['end'] = _data
                e['end'] = _destroy
                e['close'] = _destroy
                e['error'] = _destroy
                for (let name in e) readableStreamX.on(name, e[name])

                readableStreamX.pause()

                function _data(chunk) {
                    if (destroyed) return
                    controller.enqueue(typeof chunk === "string" ? b4a.from(chunk) : chunk)
                    readableStreamX.pause()
                }

                function _destroy(err) {
                    if (destroyed) return
                    destroyed = true

                    for (let name in e) readableStreamX.off(name, e[name])

                    if (err) controller.error(err)
                    else controller.close()
                }
            },
            pull: function () {
                if (destroyed) return
                readableStreamX.resume()
            },
            cancel: function () {
                destroyed = true

                for (let name in e) readableStreamX.off(name, e[name])

                readableStreamX.push(null)
                readableStreamX.pause()
                if (readableStreamX.destroy) readableStreamX.destroy()
                else if (readableStreamX.close) readableStreamX.close()
            },
            type: asBytes ? "bytes" : undefined
        });
        if (!writableStreamX) return readableStreamWeb;
    }

    if (writableStreamX) {
        writableStreamWeb = new WritableStream({
           async write(data) {
               if (!writableStreamX.write(typeof data === "string" ? b4a.from(data) : data))
                   await Writable.drained(writableStreamX)
           }
       });

        if (!readableStreamX) return writableStreamWeb;
    }

    return {
        readable: readableStreamWeb,
        writable: writableStreamWeb
    }
}

function isStreamx(stream) {
    return typeof stream._duplexState === "number" && isStream(stream);
}

function isStream(stream) {
    return !!stream._readableState || !!stream._writableState;
}