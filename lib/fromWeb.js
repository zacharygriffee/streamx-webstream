import {Readable, Duplex} from "streamx";

export function fromWeb(readableWebStream, options = {}) {
    return new (CustomClassWrap(options.write ? Duplex : Readable))(readableWebStream, options);
}

function CustomClassWrap(Class) {
    return class Stream extends Class {
        bytesRead = 0;
        released = false;
        pendingRead = undefined;

        constructor(webStream, options) {
            const { read, ...restOptions } = options;
            super(restOptions);
            this.reader = webStream.getReader();
        }

        async _read(cb) {
            if (this.released) {
                this.push(null);
                return;
            }
            this.pendingRead = this.reader.read();
            const data = await this.pendingRead;
            delete this.pendingRead;
            if (data.done || this.released) {
                this.push(null);
            } else {
                this.bytesRead += data.value.length;
                this.push(data.value);
            }

            cb();
        }

        async waitForReadToComplete() {
            if (this.pendingRead) {
                await this.pendingRead;
            }
        }

        async syncAndRelease() {
            this.released = true;
            await this.waitForReadToComplete();
            await this.reader.releaseLock();
        }

        async close() {
            await this.syncAndRelease();
        }
    }
}

