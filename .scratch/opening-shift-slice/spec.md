Status: ready-for-agent

# Spec: Opening Shift vertical slice

## Problem Statement

Developers who use Node every day still can't explain why `setImmediate` beats a timer inside an I/O callback, or why `process.nextTick` runs before a resolved promise. They learn the event loop as a list of rules and forget it, because they never feel what happens when a rule is broken.

Node Kitchen is meant to fix that by making the event loop something you play. But it's the team's first game in a new engine, and the PRD's biggest risk is that scope grows and nothing ships. Before building ten Worlds, we need one playable Shift that proves two things: the kitchen metaphor teaches the real Node order, and the stack (Three.js on WebGPU, plus a simulator judged by real Node) holds up. The PRD's gate for this: 5 playtesters say they understand why D prints before B.

## Solution

A playable, browser-hosted vertical slice of the Opening Shift boss: the classic interview program.

```js
console.log('A');
setTimeout(() => console.log('B'), 0);
setImmediate(() => console.log('C'));
Promise.resolve().then(() => console.log('D'));
process.nextTick(() => console.log('E'));
console.log('F');
```

1. The player reads the program on the kitchen wall.
2. Optionally, they predict the output on the predict board.
3. Then they play the Shift turn-based, as the Head Chef in a toon-shaded box kitchen:
   - They cook the Opening dish line by line, Routing each new Ticket to where it waits.
   - Then they clear the Rails and walk the Ring.
4. At the end, the Receipt is judged against real Node's Accepted outputs.
5. The Replay plays the Shift back beside the code and explains the first mistake.

Real Node is the judge: a local check runs the program on Node 24 and fails if the level file or the simulator disagrees with it. The slice is published to GitHub Pages for playtesters.

## User Stories

### Arriving and orienting

1. As a playtester, I want to open the slice from a URL with no install or sign-up, so that I can try it in seconds.
2. As a playtester, I want a one-screen card before service that shows the controls and the three Kitchen rules, so that I can play without a tutorial Shift.
3. As a playtester, I want the three Kitchen rules painted on the kitchen wall, so that I can glance at them mid-Shift.
4. As a playtester, I want the Shift's program pinned on the wall in a monospace font, so that I always see the code I'm executing.
5. As a playtester, I want the program's file name shown with its `.cjs` extension, so that it's clear the program runs as CommonJS.
6. As a playtester, I want X-ray on by default, so that I see the real Node name next to every kitchen name from the start.
7. As a playtester, I want to toggle X-ray off and on, so that I can play with just the kitchen names once I've learned them.
8. As a playtester, I want X-ray labels to follow the stations on screen, so that each label clearly belongs to its station.

### Predicting

9. As a playtester, I want a predict board before service with the program's Receipt lines as draggable cards, so that I can commit to an expected order.
10. As a playtester, I want to skip the prediction, so that the predict step never blocks me.
11. As a playtester, I want my Prediction locked once service starts, so that I can't change it after seeing the answer.
12. As a playtester, I want a correct Prediction to earn a bonus star, so that predicting is worth the effort.
13. As a playtester, I want either race order (B before C, or C before B) to count as a correct Prediction, so that I'm not punished for a race Node itself can't promise.
14. As a keyboard-only player, I want to reorder prediction cards with the keyboard, so that I don't need a mouse.

### Moving and acting in the kitchen

15. As a playtester, I want to move the Head Chef freely around a tile-grid kitchen with the keyboard, so that it feels like a kitchen and not a menu.
16. As a playtester, I want interactions to snap to the cell I'm facing, so that I never miss a station by a pixel.
17. As a playtester, I want walking to cost no game time, so that the turn-based Shift never rushes me.
18. As a playtester, I want a fixed isometric camera with the whole kitchen on screen, so that I always see every station.
19. As a playtester, I want one Stove with a single burner in the middle, so that "one thread" is visible at a glance.
20. As a playtester, I want the Ring's Counters laid out clockwise with a conveyor arrow, so that I can see the order of the loop's phases.
21. As a playtester, I want the Pending shelf, Poll pass and Close hatch shown greyed out on the Ring, so that I see the full shape of a Lap even though this Shift doesn't use them.

### Cooking the Opening dish

22. As a playtester, I want the Opening dish to be on the Stove when service starts, so that top-level code obviously runs first.
23. As a playtester, I want to cook the Opening dish one line at a time with a "use" action at the Stove, so that I step through the program myself.
24. As a playtester, I want the line being cooked highlighted on the wall, so that I connect each action to its code.
25. As a playtester, I want cooking a grey line to print its Receipt line on the spot, so that I see sync code runs right away.
26. As a playtester, I want cooking a coloured line to put a new Ticket in my hands, so that I must decide where it waits.
27. As a playtester, I want each Ticket kind to have its own colour and its own shape, so that I can tell kinds apart without relying on colour.
28. As a playtester, I want to Route an orange Ticket to the orange rail, a purple one to the purple rail, a blue one to the Oven and an amber one to the Check counter, so that I learn where each kind of work waits.
29. As a playtester, I want a station to refuse a Ticket of the wrong kind with a buzz and an X-ray hint, so that I learn the right station without ending up somewhere Node could never be.
30. As a playtester, I want each refusal counted as a routing mistake, so that I see how often I misrouted.
31. As a playtester, I want to be unable to start another Dish until the current one is finished, so that "one Dish at a time, to the end" is a physical fact.
32. As a playtester, I want the Opening dish to finish after its last line, so that I know when the Rails come into play.

### Clearing the Rails and walking the Ring

33. As a playtester, I want to pick up a Ticket from a Rail or a ready Counter and cook it as a Dish, so that I decide what runs next.
34. As a playtester, I want to be allowed to cook something while the orange or purple Rail still has Tickets, so that I can break rule 2 and see the consequence.
35. As a playtester, I want to be allowed to visit Counters out of Ring order, so that I can break rule 3 and see the consequence.
36. As a playtester, I want the Oven to show a countdown on its Ticket, so that I can see whether a timer is ready.
37. As a playtester, I want the Oven sometimes not ready on the first Lap, so that I live through "never earlier, often later" and the race between B and C.
38. As a playtester, I want to walk past an Oven that isn't ready and come back on the next Lap, so that I see how a Lap really flows.
39. As a playtester, I want the Lap count visible, so that I know which loop iteration I'm in.
40. As a playtester, I want the restaurant to close on its own once no Tickets remain and nothing is cooking, so that the Shift ends the way a Node process exits.

### Receipt and judgement

41. As a playtester, I want the Receipt in a corner, printing lines in monospace as Dishes print them, so that it feels like a console.
42. As a playtester, I want my Receipt shown line by line beside real Node's output when the Shift ends, so that I can compare them.
43. As a playtester, I want the lines that differ shown in red, so that I spot mistakes immediately.
44. As a playtester, I want my Receipt accepted if it matches any of the Accepted outputs, so that both race orders count as correct.
45. As a playtester, I want one star for a correct Receipt cooked without breaking a Kitchen rule, and a bonus star for a correct Prediction, so that I know how I did. A broken rule costs star 1 even when the Receipt happens to be accepted (breaking rule 3 while the Oven is ready can still print an accepted order).
46. As a playtester, I want the results screen to name any Kitchen rule I broke and show my routing-mistake count, so that I know what to fix.
47. As a playtester, I want to retry the Shift right away, so that I can try again with what I learned.
48. As a playtester, I want a retry to roll the Oven race again, so that over several tries I meet both orders.

### Replay

49. As a playtester, I want a Replay of my Shift beside the program, so that I see what each of my actions corresponds to in code.
50. As a playtester, I want the Replay to highlight the line that made each Ticket, so that I connect each Ticket to its code.
51. As a playtester, I want the Replay to pause at my first Receipt line outside the Accepted outputs, so that I see exactly where I went wrong.
52. As a playtester, I want that pause to name the broken Kitchen rule in kitchen words ("you cooked D while the orange rail still had E"), so that I understand the mistake.
53. As a playtester, I want the same explanation in real Node names when X-ray is on, so that I can carry the lesson into an interview.
54. As a playtester, I want the Replay to show what real Node did at that point instead, so that I learn the right move.
55. As a playtester who met the race, I want a note that the Oven wasn't ready and that Node can't promise B before C, so that I understand why both orders are correct.
56. As a playtester, I want to step the Replay forward and back, so that I can go at my own pace.

### Correctness guarantees

57. As the developer, I want the Shift's program stored as a real CommonJS file that Node 24 can run as-is, so that the wall shows exactly what Node runs.
58. As the developer, I want each level's Tickets and Accepted outputs written by hand in a level file, so that adding a Shift takes minutes and needs no interpreter.
59. As the developer, I want one check command that runs each Shift's program on Node 24 twenty times and fails if any observed output is outside the Accepted outputs, so that the level file can never claim something Node doesn't do.
60. As the developer, I want the same check to fail if the simulator's order (following the Kitchen rules) is not one of the Accepted outputs, so that the game's rules and real Node never drift apart.
61. As the developer, I want the check to fail if the program file is not CommonJS, so that no Shift accidentally teaches ESM order.
62. As the developer, I want the Oven race driven by a seed that the URL can set, so that browser tests and bug reports can reproduce either order.
63. As the developer, I want one command that runs typecheck, simulator tests, the level check and the browser test, so that I (and Claude Code) can see every failure locally.
64. As the developer, I want the simulator free of rendering and DOM code, so that the future Event Loop Lab can reuse it.

### Rendering and delivery

65. As a playtester, I want the kitchen drawn with a toon look (two or three light bands plus an outline), so that it already reads like the final game, even as boxes.
66. As a playtester on a browser without WebGPU, I want the game to fall back to WebGL 2 on its own, so that it still runs.
67. As a playtester, I want the slice to load fast on a mid-range laptop, so that the first impression isn't a spinner.
68. As the developer, I want the slice published as static files on GitHub Pages, so that playtesters get a URL and the repo gets the remote CI will need later.

## Implementation Decisions

### Modules

- **Simulator** (deep module, the core of the slice). Pure TypeScript, with no imports from the renderer, the DOM or `three`. It lives in its own folder inside a single package, so it can be split out for the Lab later (ADR 0002). Its public interface is small:
  - **Start a Shift** from a level and a seed; returns a Shift state.
  - **Act** on a Shift state with one logical action; returns the next state plus the events that happened: Receipt line printed, Ticket created, Ticket refused (routing mistake), Kitchen rule broken, Dish started, Dish finished, Lap advanced, restaurant closed.
  - **Queries** on a state: what the Head Chef holds, which Tickets wait where (each Rail, each Counter, with Oven countdowns), which actions are legal now, the Receipt so far, whether the Shift has ended, the judgement and the Replay timeline.
  - **Actions** are logical, never spatial: cook the next line of the current Dish; Route the held Ticket to a station; pick up a Ticket from a Rail or Counter to start a Dish. Walking never reaches the simulator.
  - **Rule 1 is a wall.** Act refuses to start a Dish while one is cooking: while a Dish is on the Stove, the only actions allowed are cooking its next line and Routing the held Ticket. Rules 2 and 3 can be broken: the action is accepted, the break is recorded as an event, and the Shift continues in the player's order.
  - **Routing a Ticket to the wrong station is refused**, counted as a routing mistake, and leaves the Ticket in the Head Chef's hands.
  - **Rule 3 tracking.** The simulator tracks a Ring position for the current Lap. Picking up from a Counter that comes later in the Ring order, while an earlier Counter holds a ready Ticket, breaks rule 3.
  - **Time.** The clock is virtual and turn-based. Walking costs nothing; cooking a line and picking up a Ticket advance it. The Opening dish has a start-up cost chosen from the seed, so that on the first Lap the `setTimeout(0)` Ticket is ready with 50% probability. A Ticket that isn't ready stays in the Oven until a later Lap.
  - **Ending.** The restaurant closes when nothing is cooking and no Tickets remain anywhere.
  - **Judgement** contains: whether the Receipt is in the Accepted outputs, whether the Prediction is, the stars (star 1 when the Receipt is accepted and no Kitchen rule was broken, plus 1 bonus for the Prediction), the routing-mistake count, the broken rules, and the first wrong Receipt line with the rule broken there and what real Node did instead.
- **Level files.** One per Shift, next to its program file. Hand-written, as decided in ADR 0001. Each holds:
  - the program file reference, which must be `.cjs` (ADR 0003)
  - the ordered lines of the Opening dish
  - every Ticket, with its kind, its source line, the Ticket or Dish that created it, the Receipt lines its Dish prints, and any Tickets its Dish creates
  - for timers, the delay
  - the list of Accepted outputs
- **Level check.** A Node 24 script with three checks:
  - It runs each Shift's program 20 times as CommonJS and fails if any output is outside the Accepted outputs.
  - It runs the simulator following the Kitchen rules with every seed outcome, and fails if any resulting Receipt is outside the Accepted outputs.
  - It fails if the program file isn't `.cjs`.

  It does not require every Accepted output to be observed: on Node 24 the rare B-before-C order may never appear in 20 runs.
- **Renderer.** Three.js r186 with `WebGPURenderer` and its automatic WebGL 2 fallback, `MeshToonNodeMaterial`, and `toonOutlinePass` through `RenderPipeline` (details and import rules in `docs/research/threejs-toon-webgpu.md`). Every import comes from `three/webgpu` or `three/tsl`, never `'three'`.
  - The kitchen is a tile grid of boxes, seen from a fixed isometric three-quarter camera. There is no physics engine; collisions are checked against the grid.
  - The renderer owns movement and facing. It turns the player's "use", "pick up" and "put down" on the facing cell into simulator actions, then animates the simulator's events.
- **Ticket kinds in the slice.** Five kinds, each with a distinct colour and a distinct silhouette: grey sync, orange nextTick, purple microtask, blue timer, amber immediate. Node Kitchen owns this legend (ADR 0002).
- **HTML/CSS overlay** over the canvas for everything 2D: the pre-service card, the predict board (native drag-and-drop plus keyboard reordering), the program on the wall with the current line highlighted, the Receipt, the results screen, the Replay's code panel and controls, and the X-ray labels, positioned from projected 3D coordinates.
- **Replay explanations** are four fixed templates, each with a kitchen-words version and an X-ray (real Node names) version:
  1. rule 2 broken
  2. rule 3 broken
  3. the race note
  4. the routing-mistake summary

  Names are filled in from the Tickets; no Shift needs its own text.
- **Input** is keyboard only: move, use (cook), pick up / put down, toggle X-ray.
- **Seed.** Taken from the URL when present; otherwise random. A retry rolls a new seed unless the URL fixed it.
- **Tooling.** pnpm, Vite and TypeScript, with Vitest for the simulator and the level check and Playwright for the browser test. Node 24 is pinned through `engines` and `.nvmrc`. One check command runs typecheck, Vitest, the level check and Playwright in turn; CI will later call the same command.
- **Delivery.** A static Vite build published to GitHub Pages, as the last step of the slice. This also creates the GitHub remote.

## Testing Decisions

- **What makes a good test.** Exercise only external behaviour through the two seams below. Assert on what a player or Node would observe: Receipt lines, events, judgement, legal actions. Never assert on internal queue structures or on rendering details. Golden answers come from real Node, never from the simulator itself.
- **Seam 1: the simulator's interface (Vitest).** Drive Shifts through Start and Act only. Cases:
  - Following the Kitchen rules with each seed outcome produces exactly `A F E D B C` (Oven ready on Lap 1) and `A F E D C B` (Oven not ready).
  - Cooking D while E is still on the orange rail breaks rule 2, and the Receipt ends up outside the Accepted outputs.
  - Picking up from the Check counter while the Oven holds a ready Ticket breaks rule 3.
  - Starting a Dish while one is cooking is refused (rule 1 is a wall).
  - Routing to the wrong station is refused and counted, and the Ticket stays held.
  - The restaurant closes exactly when no Tickets remain and nothing is cooking.
  - Judgement: stars, Prediction accepted for both race orders, first wrong line and broken rule.
  - The Replay timeline matches the actions, with the source line for each Ticket.
- **Level check (same seam, plus real Node).** The check command runs it against Node 24, as described under Implementation Decisions. Its own failure paths get tested too: a level with a wrong Accepted outputs list must fail.
- **Seam 2: the browser (Playwright).** Two runs with URL seeds that force each race order. Each one drives the keyboard through the whole Shift (card, skip or fill the Prediction, cook, Route, clear the Rails, walk the Ring) and asserts that the Receipt shown in the HTML overlay is the expected Accepted output and the results screen shows the star. There are no renderer or overlay unit tests; this run covers them end to end.
- **Prior art.** None: this is a greenfield repo. The simulator tests are the template later Shifts will copy.

## Out of Scope

- Real-time play, rush volume, Orders and customer patience, the Loop Lag meter, and stars 2 and 3.
- The tray and Plates (no nested calls in this program), and stack overflow.
- The Pending shelf, Poll pass and Close hatch as working stations; they're shown greyed out only.
- Teal I/O, rose close and lime event-bell Ticket kinds.
- Staff characters: Pool Cooks, Courier, Janitor, Sous-chefs, and the unlockable staff.
- Shifts other than the Opening Shift boss, and the World map and progression.
- Sound and subtitles, gamepad and touch input, remappable controls, adjustable game speed, colourblind palettes (all part of the Beta accessibility pass).
- ES modules programs (World 8).
- Embedding in the Event Loop Lab, which doesn't exist yet (ADR 0002).
- Tripo or Blender models and the art pipeline; the slice uses toon-shaded boxes.
- Saves and progress storage.
- GitHub Actions CI. The check command runs locally; Actions will call it once the remote exists.
- Instrumenting Node to generate Tickets automatically; that's the upgrade path in ADR 0001.

## Further Notes

- **Measured on Node 24.19.0:** as CommonJS, 20 runs out of 20 printed `A F E D C B`. As ESM, it printed `A F D E` before B and C. This is why ADR 0003 exists, and why the simulator's 50/50 race doesn't try to match real-world frequencies.
- **Playtest URL:** https://agustinzago.github.io/node-kitchen/
- **Playtest gate (not a code task):** 5 playtesters take a 3-question before/after "predict the output" quiz on a new but similar program, written with `/to-questionnaire`. It doubles as the first baseline for the PRD's learning metric.
- **Vocabulary:** see `CONTEXT.md`. Decisions: ADRs 0001–0003. Rendering API facts: `docs/research/threejs-toon-webgpu.md`.
- **Open questions in the PRD that don't block the slice:** the OpenJS name check, and the first-load download budget (to be set after the slice).
