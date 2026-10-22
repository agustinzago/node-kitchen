import { expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

// The simulator stays free of `three`, the DOM and renderer code so the Event Loop
// Lab can reuse it (ADR 0002). Imports are checked here; DOM and Node globals are
// kept out by src/sim/tsconfig.json, which typechecks the sim without those libs.
it('the simulator only imports its own files', () => {
  const simDir = import.meta.dirname;
  const outside: string[] = [];

  for (const file of readdirSync(simDir, { recursive: true, encoding: 'utf8' })) {
    if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue;
    const source = readFileSync(join(simDir, file), 'utf8');
    for (const [, specifier] of source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
      const target = relative(simDir, join(simDir, dirname(file), specifier));
      if (!specifier.startsWith('.') || target.startsWith('..')) outside.push(`${file} imports ${specifier}`);
    }
  }

  expect(outside).toEqual([]);
});
