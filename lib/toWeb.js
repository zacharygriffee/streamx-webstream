// toWeb.js
import { isStreamx } from "./isStream.js";
import { drained } from "./drained.js";
import b4a from "b4a";

export function toWeb(readableStreamX, asBytes) {
    let writableStreamX;
    let destroyed = false;
    const eventHandlers = {};

    // console.log("toWeb: Initializing with stream", readableStreamX);

    // Handle non-streamx input by extracting readable and writable parts
    if (readableStreamX && !isStreamx(readableStreamX)) {
        let duplex;
        ({
            readable: readableStreamX,
            writable: writableStreamX,
            duplex
        } = readableStreamX);

        // console.log("toWeb: Extracted streams from non-streamx input", {
        //     readableStreamX,
        //     writableStreamX,
        //     duplex
        // });

        if (duplex && !readableStreamX && !writableStreamX) {
            readableStreamX = duplex;
            writableStreamX = duplex;
        }
    }

    if (!readableStreamX && !writableStreamX) {
        const errorMessage = "Invalid stream";
        // console.error("toWeb Error:", errorMessage);
        throw new Error(errorMessage);
    }

    let readableStreamWeb;
    let writableStreamWeb;

    // Create ReadableStream from readableStreamX
    if (readableStreamX) {
        readableStreamWeb = new ReadableStream({
            start(controller) {
                // console.log("ReadableStream: Start controller");

                // Set up event handlers for the readable stream
                eventHandlers['data'] = onData;
                eventHandlers['end'] = onClose;
                eventHandlers['close'] = onClose;
                eventHandlers['error'] = onError;

                for (const eventName in eventHandlers) {
                    // console.log(`ReadableStream: Adding event listener for ${eventName}`);
                    readableStreamX.on(eventName, eventHandlers[eventName]);
                }

                readableStreamX.pause();

                function onData(chunk) {
                    // console.log("ReadableStream: onData", chunk);
                    if (destroyed) return;
                    controller.enqueue(typeof chunk === "string" ? b4a.from(chunk) : chunk);
                    readableStreamX.pause();
                    // console.log("ReadableStream: Data enqueued and stream paused");
                }

                function onClose() {
                    // console.log("ReadableStream: onClose");
                    cleanup();
                    controller.close();
                    // console.log("ReadableStream: Controller closed");
                }

                function onError(err) {
                    // console.error("ReadableStream: onError", err);
                    cleanup();
                    controller.error(err);
                }

                function cleanup() {
                    if (destroyed) return;
                    // console.log("ReadableStream: Cleanup");
                    destroyed = true;

                    for (const eventName in eventHandlers) {
                        // console.log(`ReadableStream: Removing event listener for ${eventName}`);
                        readableStreamX.off(eventName, eventHandlers[eventName]);
                    }
                }
            },
            pull() {
                // console.log("ReadableStream: Pull");
                if (!destroyed) readableStreamX.resume();
            },
            cancel() {
                // console.log("ReadableStream: Cancel");
                destroyed = true;

                for (const eventName in eventHandlers) {
                    // console.log(`ReadableStream: Removing event listener for ${eventName}`);
                    readableStreamX.off(eventName, eventHandlers[eventName]);
                }

                readableStreamX.push(null);
                readableStreamX.pause();
                if (readableStreamX.destroy) {
                    readableStreamX.destroy();
                } else if (readableStreamX.close) {
                    readableStreamX.close();
                }
            },
            type: asBytes ? "bytes" : undefined
        });

        if (!writableStreamX) {
            // console.log("toWeb: Returning readableStreamWeb", readableStreamWeb);
            return readableStreamWeb;
        }
    }

    // Create WritableStream from writableStreamX
    if (writableStreamX) {
        writableStreamWeb = new WritableStream({
            async write(data) {
                try {
                    const chunk = typeof data === "string" ? b4a.from(data) : data;
                    // console.log("WritableStream: Writing data", chunk);
                    if (!writableStreamX.write(chunk)) {
                        await drained(writableStreamX, false);
                        // console.log("WritableStream: Write drained completed");
                    }
                    // console.log("WritableStream: Write complete");
                } catch (error) {
                    // console.error("WritableStream: Error during write", error);
                    writableStreamX.destroy(error); // Propagate error
                    setTimeout(() => readableStreamX.emit('error', error), 0);
                }
            },
            async close() {
                // console.log("WritableStream: Close");
                if (writableStreamX.end) {
                    writableStreamX.end();
                }
                // console.log("WritableStream: Stream closed");
            },
            abort(err) {
                // console.error("WritableStream: Abort", err);
                if (writableStreamX.destroy) {
                    writableStreamX.destroy(err);
                }
                setTimeout(() => readableStreamX.emit('error', err), 0);
            }
        });

        if (!readableStreamX) {
            // console.log("toWeb: Returning writableStreamWeb", writableStreamWeb);
            return writableStreamWeb;
        }
    }
    //
    // console.log("toWeb: Returning combined readable and writable stream", {
    //     readable: readableStreamWeb,
    //     writable: writableStreamWeb
    // });

    return {
        readable: readableStreamWeb,
        writable: writableStreamWeb
    };
}