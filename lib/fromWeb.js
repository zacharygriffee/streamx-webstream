import { Readable, Writable, Duplex } from "streamx";

export function fromWeb(webStream, options = {}) {
    if (webStream instanceof ReadableStream && webStream instanceof WritableStream) {
        return new DuplexWebStream(webStream, webStream, options);
    } else if (webStream instanceof ReadableStream) {
        return new ReadableWebStream(webStream, options);
    } else if (webStream instanceof WritableStream) {
        return new WritableWebStream(webStream, options);
    } else if (webStream.readable && webStream.writable) {
        return new DuplexWebStream(webStream.readable, webStream.writable, options);
    } else if (webStream.readable) {
        return new ReadableWebStream(webStream.readable, options);
    } else if (webStream.writable) {
        return new WritableWebStream(webStream.writable, options);
    } else {
        throw new Error("fromWeb: Requires at least a readable or writable stream.");
    }
}

class ReadableWebStream extends Readable {
    constructor(readableStream, options) {
        super(options);
        this._reader = readableStream.getReader();
        this._attachErrorHandler();
    }

    _attachErrorHandler() {
        this._reader.closed.catch(error => {
            this.destroy(error);
        });
    }

    async _read(cb) {
        try {
            const { done, value } = await this._reader.read();
            if (done) {
                this.push(null);
            } else {
                this.push(value);
            }
            cb();
        } catch (error) {
            this.destroy(error);
            cb(error); // Ensure callback is called with the error
        }
    }

    _destroy(cb) {
        this._reader.releaseLock();
        cb();
    }
}

class WritableWebStream extends Writable {
    constructor(writableStream, options) {
        super(options);
        this._writer = writableStream.getWriter();
    }

    async _write(chunk, cb) {
        try {
            await this._writer.write(chunk);
            cb();
        } catch (error) {
            this.destroy(error);
            cb(error); // Ensure callback is called with the error
        }
    }

    async _final(cb) {
        try {
            await this._writer.close();
            cb();
        } catch (error) {
            this.destroy(error);
            cb(error); // Ensure callback is called with the error
        }
    }

    _destroy(cb) {
        this._writer.releaseLock();
        cb();
    }
}

class DuplexWebStream extends Duplex {
    constructor(readableStream, writableStream, options) {
        super(options);
        this._reader = readableStream.getReader();
        this._writer = writableStream.getWriter();
        this._attachErrorHandler();
        this._handleCompletion();
    }

    _attachErrorHandler() {
        this._reader.closed.catch(error => {
            this.destroy(error);
        });
        this._writer.closed.catch(error => {
            this.destroy(error);
        });
    }

    async _read(cb) {
        try {
            const { done, value } = await this._reader.read();
            if (done) {
                this.push(null);
            } else {
                this.push(value);
            }
            cb();
        } catch (error) {
            this.destroy(error);
            cb(error); // Ensure callback is called with the error
        }
    }

    async _write(chunk, cb) {
        try {
            await this._writer.write(chunk);
            cb();
        } catch (error) {
            this.destroy(error);
            cb(error); // Ensure callback is called with the error
        }
    }

    async _final(cb) {
        try {
            await this._writer.close();
            cb();
        } catch (error) {
            this.destroy(error);
            cb(error); // Ensure callback is called with the error
        }
    }

    _destroy(cb) {
        this._reader.releaseLock();
        this._writer.releaseLock();
        cb();
    }

    _handleCompletion() {
        this.on('finish', () => {
            this.emit('end');
        });
    }
}