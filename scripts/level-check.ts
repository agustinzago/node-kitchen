// Real Node is the judge (ADR 0001): run each Shift's program and make sure its
// level file's Accepted outputs include everything Node prints, and everything the sim
// prints when it follows the Kitchen rules.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Level } from '../src/sim/level.ts';
import { act, followKitchenRules, receipt, startShift } from '../src/sim/shift.ts';

// The seed's only job is the Oven race: an even seed leaves a 0 ms timer not ready on the first Lap.
const SEED_OUTCOMES = { 'the Oven not ready on the first Lap': 0, 'the Oven ready on the first Lap': 1 };

/** Returns the problems found; an empty list means the level agrees with Node. */
export function checkLevel(level: Level, levelDir: string, runs = 20): string[] {
  if (!level.program.endsWith('.cjs')) {
    return [`${level.program} must be a .cjs file: Shift programs run as CommonJS (ADR 0003)`];
  }

  const accepted = level.acceptedOutputs.map((lines) => lines.join(' '));
  const printed = new Set<string>();
  for (let run = 0; run < runs; run++) {
    const stdout = execFileSync(process.execPath, [join(levelDir, level.program)], { encoding: 'utf8' });
    printed.add(stdout.trim().split('\n').join(' '));
  }

  const outsideAccepted = (output: string) =>
    `printed "${output}", which is not in the Accepted outputs: ` + accepted.map((a) => `"${a}"`).join(', ');
  const problems = [...printed]
    .filter((output) => !accepted.includes(output))
    .map((output) => `${level.program} ${outsideAccepted(output)}`);

  for (const [outcome, seed] of Object.entries(SEED_OUTCOMES)) {
    let shift = startShift(level, seed);
    for (let action = followKitchenRules(shift); action; action = followKitchenRules(shift)) {
      shift = act(shift, action).shift;
    }
    const output = receipt(shift).join(' ');
    if (!accepted.includes(output)) {
      problems.push(`the sim, following the Kitchen rules with ${outcome}, ${outsideAccepted(output)}`);
    }
  }
  return problems;
}

if (import.meta.main) {
  const shiftsDir = join(import.meta.dirname, '../src/shifts');
  let failed = false;
  for (const shift of readdirSync(shiftsDir)) {
    const levelDir = join(shiftsDir, shift);
    const { default: level } = (await import(pathToFileURL(join(levelDir, 'level.ts')).href)) as { default: Level };
    const problems = checkLevel(level, levelDir);
    for (const problem of problems) console.error(`✗ ${shift}: ${problem}`);
    if (problems.length === 0) console.log(`✓ ${shift}`);
    failed ||= problems.length > 0;
  }
  if (failed) process.exit(1);
}
