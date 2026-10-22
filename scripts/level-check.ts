// Real Node is the judge (ADR 0001): run each Shift's program and make sure its
// level file's Accepted outputs include everything Node prints.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Level } from '../src/sim/level.ts';

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

  return [...printed]
    .filter((output) => !accepted.includes(output))
    .map(
      (output) =>
        `${level.program} printed "${output}", which is not in the Accepted outputs: ` +
        accepted.map((a) => `"${a}"`).join(', '),
    );
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
