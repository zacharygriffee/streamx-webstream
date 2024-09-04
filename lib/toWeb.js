import {
    isStreamx,
    isReadableStream,
    isWritableStream
} from "./isStream.js";
import {drained} from "./drained.js";
import b4a from "b4a";

function handleReadable(stream, asBytes) {
    let destroyed = false;
    const eventHandlers = {};

    return new ReadableStream({
        start(controller) {
            eventHandlers['data'] = onData;
            eventHandlers['end'] = onClose;
            eventHandlers['close'] = onClose;
            eventHandlers['error'] = onError;

            for (const eventName in eventHandlers) {
                stream.on(eventName, eventHandlers[eventName]);
            }

            stream.pause();

            function onData(chunk) {
                if (destroyed) return;
                if (chunk === null) {
                    onClose();
                } else {
                    controller.enqueue(typeof chunk === 'string' ? b4a.from(chunk) : chunk);
                    stream.pause();
                }
            }

            function onClose() {
                cleanup();
                controller.close();
            }

            function onError(err) {
                cleanup();
                controller.error(err);
            }

            function cleanup() {
                if (destroyed) return;
                destroyed = true;
                for (const eventName in eventHandlers) {
                    stream.off(eventName, eventHandlers[eventName]);
                }
            }
        },
        pull() {
            if (!destroyed) stream.resume();
        },
        cancel() {
            destroyed = true;
            for (const eventName in eventHandlers) {
                stream.off(eventName, eventHandlers[eventName]);
            }
            if (stream.destroy) {
                stream.destroy();
            } else if (stream.close) {
                stream.close();
            }
        },
        type: asBytes ? 'bytes' : undefined
    });
}

function handleWritable(writableStreamX) {
    return new WritableStream({
        async write(data) {
            try {
                const chunk = typeof data === "string" ? b4a.from(data) : data;
                if (!writableStreamX.write(chunk)) {
                    await drained(writableStreamX, false);
                }
            } catch (error) {
                writableStreamX.destroy(error); // Propagate error
                setTimeout(() => writableStreamX.emit('error', error), 0);
            }
        },
        async close() {
            if (writableStreamX.end) {
                writableStreamX.end();
            }
        },
        abort(err) {
            if (writableStreamX.destroy) {
                writableStreamX.destroy(err);
            }
            setTimeout(() => writableStreamX.emit('error', err), 0);
        }
    });
}

export function toWeb(stream, asBytes) {
    let writableStreamX;

    if (stream && !isStreamx(stream)) {
        let duplex;
        ({
            readable: stream,
            writable: writableStreamX,
            duplex
        } = stream);
        if (duplex && !stream && !writableStreamX) {
            stream = duplex;
            writableStreamX = duplex;
        }
    } else if (isReadableStream(stream) && isWritableStream(stream)) {
        // If it's both readable and writable, treat as duplex
        writableStreamX = stream;
    } else if (isReadableStream(stream)) {
        // If it's only readable
        writableStreamX = null;
    } else if (isWritableStream(stream)) {
        // If it's only writable
        writableStreamX = stream;
        stream = null;
    }

    if (!stream && !writableStreamX) {
        const errorMessage = "Invalid stream";
        throw new Error(errorMessage);
    }

    let readableStreamWeb;
    let writableStreamWeb;

    if (stream) {
        readableStreamWeb = handleReadable(stream, asBytes);
    }
    if (writableStreamX) {
        writableStreamWeb = handleWritable(writableStreamX);
    }

    if (readableStreamWeb && writableStreamWeb) {
        return {
            readable: readableStreamWeb,
            writable: writableStreamWeb
        };
    }

    return readableStreamWeb || writableStreamWeb;
}