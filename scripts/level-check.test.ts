import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import bossLevel from '../src/shifts/opening-boss/level.ts';
import { checkLevel } from './level-check.ts';

const bossDir = fileURLToPath(new URL('../src/shifts/opening-boss/', import.meta.url));

describe('level check', () => {
  it('passes on the Opening Shift boss', () => {
    expect(checkLevel(bossLevel, bossDir)).toEqual([]);
  });

  it("fails with a clear message when the Accepted outputs don't include what Node printed", () => {
    const wrongLevel = { ...bossLevel, acceptedOutputs: [['A', 'B', 'C', 'D', 'E', 'F']] };

    const problems = checkLevel(wrongLevel, bossDir);

    // Either race order may show up from Node; the sim adds one problem per seed outcome.
    expect(problems.filter((p) => p.startsWith('program.cjs')).length).toBeGreaterThan(0);
    expect(problems.filter((p) => p.startsWith('the sim')).length).toBe(2);
    for (const problem of problems) {
      expect(problem).toMatch(
        /^(program\.cjs|the sim, following the Kitchen rules with the Oven (not )?ready on the first Lap,) printed "A F E D (B C|C B)", which is not in the Accepted outputs: "A B C D E F"$/,
      );
    }
  });

  it("fails when the program file isn't .cjs", () => {
    const esmLevel = { ...bossLevel, program: 'program.mjs' };

    expect(checkLevel(esmLevel, bossDir)).toEqual([
      'program.mjs must be a .cjs file: Shift programs run as CommonJS (ADR 0003)',
    ]);
  });

  it('fails when the sim, following the Kitchen rules, prints a Receipt outside the Accepted outputs', () => {
    // Node still prints E before D, but this level sends D to the orange rail and E to the purple one.
    const swappedKinds = {
      ...bossLevel,
      tickets: {
        ...bossLevel.tickets,
        D: { ...bossLevel.tickets.D, kind: 'nextTick' as const },
        E: { ...bossLevel.tickets.E, kind: 'microtask' as const },
      },
    };

    expect(checkLevel(swappedKinds, bossDir)).toEqual([
      'the sim, following the Kitchen rules with the Oven not ready on the first Lap, printed "A F D E C B", ' +
        'which is not in the Accepted outputs: "A F E D B C", "A F E D C B"',
      'the sim, following the Kitchen rules with the Oven ready on the first Lap, printed "A F D E B C", ' +
        'which is not in the Accepted outputs: "A F E D B C", "A F E D C B"',
    ]);
  });

  it("doesn't require every Accepted output to be observed", () => {
    const neverPrinted = ['A', 'F', 'D', 'E', 'B', 'C'];
    const level = { ...bossLevel, acceptedOutputs: [...bossLevel.acceptedOutputs, neverPrinted] };

    expect(checkLevel(level, bossDir)).toEqual([]);
  });
});
