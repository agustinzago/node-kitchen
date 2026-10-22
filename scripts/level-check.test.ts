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

    // Either race order may show up, so expect one problem per distinct order printed.
    expect(problems.length).toBeGreaterThan(0);
    for (const problem of problems) {
      expect(problem).toMatch(
        /^program\.cjs printed "A F E D (B C|C B)", which is not in the Accepted outputs: "A B C D E F"$/,
      );
    }
  });

  it("fails when the program file isn't .cjs", () => {
    const esmLevel = { ...bossLevel, program: 'program.mjs' };

    expect(checkLevel(esmLevel, bossDir)).toEqual([
      'program.mjs must be a .cjs file: Shift programs run as CommonJS (ADR 0003)',
    ]);
  });

  it("doesn't require every Accepted output to be observed", () => {
    const neverPrinted = ['A', 'F', 'D', 'E', 'B', 'C'];
    const level = { ...bossLevel, acceptedOutputs: [...bossLevel.acceptedOutputs, neverPrinted] };

    expect(checkLevel(level, bossDir)).toEqual([]);
  });
});
