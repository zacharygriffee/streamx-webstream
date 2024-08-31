import { Readable, Duplex, Transform } from "streamx";

export function fromWeb(readableWebStream, options = {}) {
    const StreamClass = options.write || readableWebStream.writable
        ? options.asTransform
            ? Transform
            : Duplex
        : Readable;

    return new (CustomClassWrap(StreamClass))(readableWebStream, options);
}

function CustomClassWrap(BaseClass) {
    return class Stream extends BaseClass {
        bytesRead = 0;
        released = false;
        pendingRead = undefined;

        constructor(webStream, options = {}) {
            const updatedOptions = { ...options };

            if (webStream && !(webStream instanceof ReadableStream)) {
                if (typeof webStream.writable === "function" || webStream.writable instanceof WritableStream) {
                    updatedOptions.write = webStream.writable;
                }
                if (webStream.readable instanceof ReadableStream) {
                    webStream = webStream.readable;
                }
            }

            if (!(webStream instanceof ReadableStream)) {
                throw new Error("fromWeb: Requires at the very least a readable stream. This may change in future.");
            }

            let { read, ...restOptions } = updatedOptions;
            const hasWebWritableStream = restOptions.write instanceof WritableStream;
            let writer = undefined;

            if (hasWebWritableStream) {
                const { write, ...remainingOptions } = restOptions;
                writer = write.getWriter();
                restOptions = remainingOptions;
            }

            super(restOptions);

            this.reader = webStream.getReader();
            this.writer = writer;

            if (hasWebWritableStream) {
                this.onFinish = new Promise(resolve => this.once("finish", resolve));
            }

            this.reader.closed.catch(err => this.emit('error', err));
            if (this.writer) {
                this.writer.closed.catch(err => this.emit('error', err));
            }
        }

        async _write(value, cb) {
            try {
                if (!this.writer || !this.writable) throw new Error("Not writable");

                await this.writer.ready;

                if (this.destroyed || this.released) {
                    return cb();
                }

                await this.writer.write(value);
                cb();
            } catch (error) {
                cb(error);
                this.emit('error', error);
            }
        }

        async _read(cb) {
            try {
                if (this.released) {
                    this.push(null);
                } else {
                    this.pendingRead = this.reader.read();
                    const data = await this.pendingRead;
                    this.pendingRead = undefined;

                    if (data.done || this.released) {
                        this.push(null);
                    } else {
                        this.bytesRead += data.value.length;
                        this.push(data.value);
                    }
                }
                cb();
            } catch (error) {
                cb(error);
                this.emit('error', error);
            }
        }

        async waitForReadToComplete() {
            if (this.pendingRead) {
                await this.pendingRead;
            }
        }

        async waitForWriteToComplete() {
            if (this.writer) {
                await this.writer.ready;
            }
        }

        async syncAndRelease() {
            this.released = true;

            if (this.writer) {
                await this.waitForWriteToComplete();
                await this.onFinish;
                this.writer.releaseLock();
            }

            await this.waitForReadToComplete();
            this.reader.releaseLock();
            // Leave the stream open for the developer to close
        }

        async close() {
            await this.syncAndRelease();
        }
    };
}