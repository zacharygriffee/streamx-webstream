export function isStreamx(stream) {
    return typeof stream._duplexState === "number" && isStream(stream);
}

export function isStream(stream) {
    return !!stream._readableState || !!stream._writableState;
}