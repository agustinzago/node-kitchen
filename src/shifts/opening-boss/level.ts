import type { Level } from '../../sim/level.ts';

// The Opening Shift boss: the classic interview program.
const level: Level = {
  program: 'program.cjs',
  openingDish: [
    { sourceLine: 1, prints: 'A' },
    { sourceLine: 2, creates: 'B' },
    { sourceLine: 3, creates: 'C' },
    { sourceLine: 4, creates: 'D' },
    { sourceLine: 5, creates: 'E' },
    { sourceLine: 6, prints: 'F' },
  ],
  tickets: {
    B: { kind: 'timer', sourceLine: 2, createdBy: 'opening', receiptLines: ['B'], delayMs: 0 },
    C: { kind: 'immediate', sourceLine: 3, createdBy: 'opening', receiptLines: ['C'] },
    D: { kind: 'microtask', sourceLine: 4, createdBy: 'opening', receiptLines: ['D'] },
    E: { kind: 'nextTick', sourceLine: 5, createdBy: 'opening', receiptLines: ['E'] },
  },
  // Node can't promise B before C: a top-level timer races setImmediate.
  acceptedOutputs: [
    ['A', 'F', 'E', 'D', 'B', 'C'],
    ['A', 'F', 'E', 'D', 'C', 'B'],
  ],
};

export default level;
