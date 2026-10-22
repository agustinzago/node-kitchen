# 01: Project skeleton and level check

**What to build:** A fresh repo where one check command proves that a Shift's level file agrees with real Node. It contains the boss Shift's program (the classic A–F program) as a CommonJS `.cjs` file and its hand-written level file: the Opening dish's lines, every Ticket with its kind, source line, creator, Receipt lines and timer delay, and the Accepted outputs `A F E D B C` and `A F E D C B`. The level check runs the program 20 times on Node 24 and fails if any output falls outside the Accepted outputs or if the program isn't `.cjs`. See the spec (`.scratch/opening-shift-slice/spec.md`), ADR 0001 and ADR 0003.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] One pnpm package with Vite, TypeScript, Vitest and Playwright installed; Node 24 pinned through `engines` and `.nvmrc`
- [ ] A folder for the simulator exists, with an enforced rule that it never imports `three`, the DOM or renderer code
- [ ] A single check command runs typecheck, Vitest, the level check and Playwright, in that order (Playwright can be an empty pass for now)
- [ ] The boss program and its level file exist, using the vocabulary in `CONTEXT.md`
- [ ] The level check passes on the real boss level
- [ ] The level check fails, with a clear message, when a level's Accepted outputs don't include what Node printed (tested with a deliberately wrong fixture)
- [ ] The level check fails when a program file isn't `.cjs`
- [ ] The level check doesn't require every Accepted output to be observed
