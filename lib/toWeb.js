import b4a from "b4a";

export function toWeb(streamx, type = "bytes") {
    let destroyed = false;
    const e = {};

    return new ReadableStream({
        start: function (controller) {
            e['data'] = _data
            e['end'] = _data
            e['end'] = _destroy
            e['close'] = _destroy
            e['error'] = _destroy
            for (let name in e) streamx.on(name, e[name])

            streamx.pause()

            function _data(chunk) {
                if (destroyed) return
                controller.enqueue(b4a.from(chunk))
                streamx.pause()
            }

            function _destroy(err) {
                if (destroyed) return
                destroyed = true

                for (let name in e) streamx.off(name, e[name])

                if (err) controller.error(err)
                else controller.close()
            }
        },
        pull: function () {
            if (destroyed) return
            streamx.resume()
        },
        cancel: function () {
            destroyed = true

            for (let name in e) streamx.off(name, e[name])

            streamx.push(null)
            streamx.pause()
            if (streamx.destroy) streamx.destroy()
            else if (streamx.close) streamx.close()
        },
        type
    })
}