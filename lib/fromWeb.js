import {Readable, Duplex, Transform} from "streamx";

export function fromWeb(readableWebStream, options = {}) {
    return new (CustomClassWrap(options.write || readableWebStream.writable ? options.asTransform ? Transform : Duplex : Readable))(readableWebStream, options);
}

function CustomClassWrap(Class) {
    return class Stream extends Class {
        bytesRead = 0;
        released = false;
        pendingRead = undefined;

        constructor(webStream, options = {}) {
            if (webStream && !(webStream instanceof ReadableStream)) {
                if (typeof webStream.writable === "function" || webStream.writable instanceof WritableStream) options.write = webStream.writable;
                if (webStream.readable instanceof ReadableStream) webStream = webStream.readable;
            }

            if (!(webStream instanceof ReadableStream)) {
                throw new Error("fromWeb: Requires at the very least a readable stream. This may change in future.")
            }

            let {read, ...restOptions} = options;

            const hasWebWritableStream = restOptions.write instanceof WritableStream;
            let writer = undefined;

            if (hasWebWritableStream) {
                let write;
                ({write, ...restOptions} = restOptions);
                writer = write.getWriter();
            }

            super(restOptions);

            const self = this;
            this.reader = webStream.getReader();
            this.writer = writer;

            if (hasWebWritableStream) {
                this.onFinish = new Promise(resolve => self.once("finish", resolve));
            }
        }

        async _write(value, cb) {
            if (!this.writer || !this.writable) throw new Error("Not writable");

            await this.writer.ready;

            if (this.destroyed || this.released) {
                return cb();
            }

            await this.writer.write(value);

            cb();
        }

        async _read(cb) {
            if (this.released) {
                this.push(null);
            } else {
                this.pendingRead = this.reader.read();
                const data = await this.pendingRead;
                delete this.pendingRead;
                if (data.done || this.released) {
                    this.push(null);
                } else {
                    this.bytesRead += data.value.length;
                    this.push(data.value);
                }
            }

            cb();
        }

        async waitForReadToComplete() {
            if (this.pendingRead) {
                await this.pendingRead;
            }
        }

        async waitForWriteToComplete() {
            await this.writer.ready;
        }

        async syncAndRelease() {
            this.released = true;

            if (this.writer) {
                await this.waitForWriteToComplete();
                await this.onFinish;
                await this.writer.releaseLock();
            }

            await this.waitForReadToComplete();
            await this.reader.releaseLock();
            // leave the stream open for the developer to close

        }

        async close() {
            await this.syncAndRelease();
        }
    }
}

