export function isStreamx(stream) {
    return typeof stream._duplexState === "number" && isStream(stream);
}

export function isStream(stream) {
    return !!stream._readableState || !!stream._writableState;
}

export function isReadableStream(stream) {
    return !!stream._readableState;
}

export function isWritableStream(stream) {
    return !!stream._writableState;
}

export function isReadableStreamx(stream) {
    return !!stream._readableState && isStreamx(stream);
}

export function isWritableStreamx(stream) {
    return !!stream._writableState && isStreamx(stream);
}

export function isReadableWebApi(stream) {
    return stream instanceof ReadableStream;
}

export function isWritableWebApi(stream) {
    return stream instanceof WritableStream;
}