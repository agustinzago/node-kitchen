# Shift programs are CommonJS until World 8

Every Shift program in Worlds 1–7 is stored as a `.cjs` file and runs as CommonJS. On Node 24, the classic boss program prints `A F E D` as CommonJS but `A F D E` as an ES module, because module evaluation in ESM lets promise callbacks run before nextTick. The CommonJS order is the one interviews ask about and the one Worlds 1–7 teach. The ESM difference is learning outcome L8 and gets its own World, so earlier Shifts must never be run as ESM by accident.
