# 04: Play the boss Shift in the kitchen

**What to build:** The first playable Shift. It connects the simulator (02) to the kitchen (03), so a player can play the boss Shift start to finish with the keyboard:
- The program is pinned on the wall in monospace, with its `.cjs` file name, and the line being cooked is highlighted.
- "Use" at the Stove cooks the next line.
- A coloured line puts a Ticket in the Head Chef's hands, shown in its kind's colour and shape. Putting it down at a station Routes it; a wrong station refuses it with a visible buzz.
- The player picks Tickets up from the Rails and the Counters to cook them.
- The Oven shows its countdown, and the Lap count is visible.
- The Receipt prints lines in a monospace corner overlay (HTML over the canvas).
- When the Shift ends, the restaurant visibly closes.

The seed comes from the URL when present; otherwise it's random.

**Blocked by:** 02 (Sim plays the boss Shift by the Kitchen rules), 03 (Toon box kitchen you can walk around)

**Status:** ready-for-agent

- [ ] The five slice Ticket kinds (grey, orange, purple, blue, amber) each have a distinct colour and a distinct silhouette
- [ ] Walking never advances the simulator's clock; only simulator actions do
- [ ] A wrong-station put-down shows a refusal and the Ticket stays held
- [ ] A URL seed forces the Oven race either way
- [ ] Two Playwright runs, one per forced race order, play the whole Shift by keyboard and assert that the Receipt overlay reads `A F E D B C` and `A F E D C B` respectively
- [ ] The check command passes
