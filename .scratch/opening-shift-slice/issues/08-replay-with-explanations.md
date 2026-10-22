# 08: Replay with explanations

**What to build:** From the results screen, the player opens a Replay of their Shift beside the program. It steps forward and back through their actions and highlights the source line that made each Ticket. It pauses at the first Receipt line outside the Accepted outputs and explains it with one of four fixed templates:
1. rule 2 broken ("you cooked D while the orange rail still had E")
2. rule 3 broken
3. the race note ("the Oven wasn't ready: Node can't promise B before C")
4. a routing-mistake summary

Each template has a kitchen-words version and an X-ray version with real Node names, chosen by the X-ray toggle. At the pause it also shows what real Node did instead. The simulator exposes the Replay timeline as a query, with each step's action, events and source line.

**Blocked by:** 05 (Results: judge the Receipt)

**Status:** ready-for-agent

- [ ] Vitest: the Replay timeline has one step per action, in order, with the source line for each created Ticket
- [ ] The Replay steps forward and back, highlighting the matching program line
- [ ] With a rule 2 break, the Replay pauses at the first wrong line and shows the rule 2 template and real Node's line
- [ ] When the Oven wasn't ready on the first Lap, the race note appears even on a correct Shift
- [ ] Templates switch between kitchen words and real Node names with X-ray (if 06 hasn't landed yet, the kitchen-words version is enough; switching gets wired once 06 is done)
- [ ] A Playwright run breaks rule 2 on purpose and asserts the Replay's explanation text
- [ ] The check command passes
