// THIS IS LIFTED straight from 'streamx' code for tree-shakability of 'toWeb'
const WRITE_WRITING    = 0b0100000000 << 17

export function drained (ws, isWritev = false) {
    if (ws.destroyed) return Promise.resolve(false)
    const state = ws._writableState
    const pending = (isWritev ? Math.min(1, state.queue.length) : state.queue.length)
    const writes = pending + ((ws._duplexState & WRITE_WRITING) ? 1 : 0)
    if (writes === 0) return Promise.resolve(true)
    if (state.drains === null) state.drains = []
    return new Promise((resolve) => {
        state.drains.push({ writes, resolve })
    })
}
