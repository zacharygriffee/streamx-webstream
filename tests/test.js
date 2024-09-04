
await Promise.all([
   import("./fromweb.test.js"),
   import("./toweb.test.js"),
   import("./emptyStreams.test.js"),
   import("./backpressure.test.js"),
   import("./errorPropagation.test.js"),
   import("./mixedOperations.test.js"),
   import("./compatibility.test.js"),
    import("./largeDataTransfer.test.js")
]);