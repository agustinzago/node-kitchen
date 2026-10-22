# 06: X-ray toggle

**What to build:** X-ray labels show the real Node name next to each station ("Oven" becomes "timers phase", the orange rail becomes "nextTick queue", the Stove becomes "call stack", and so on). Labels are HTML overlays placed from each station's projected 3D position, so they follow it on screen. X-ray is on by default and toggles with one key.

**Blocked by:** 04 (Play the boss Shift in the kitchen)

**Status:** ready-for-agent

- [ ] Every station in the slice, including the greyed-out Counters, has a kitchen name and a real Node name
- [ ] Labels stay attached to their stations when the window is resized
- [ ] X-ray is on when the Shift starts, and one key toggles it
- [ ] A Playwright check toggles X-ray and asserts that a known label ("timers phase") appears and disappears
- [ ] The check command passes
