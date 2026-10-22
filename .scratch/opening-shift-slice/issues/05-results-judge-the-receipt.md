# 05: Results: judge the Receipt

**What to build:** When the restaurant closes, the player sees a results screen. It shows their Receipt line by line beside real Node's output, with any differing lines in red. Star 1 is earned when the Receipt is one of the Accepted outputs. The screen names every Kitchen rule broken and shows the routing-mistake count. Retry restarts the Shift and rolls the Oven race again, unless the URL fixed the seed. The simulator gains a judgement query: whether the Receipt is in the Accepted outputs, the stars, the routing-mistake count, the broken rules, and the first wrong Receipt line with the rule broken there and what real Node did instead.

**Blocked by:** 04 (Play the boss Shift in the kitchen)

**Status:** ready-for-agent

- [ ] Vitest: following the Kitchen rules earns star 1 for both race orders
- [ ] Vitest: breaking rule 2 (cooking D before E) gives no star, and the first wrong line is reported with rule 2 and real Node's line at that point
- [ ] Vitest: the routing-mistake count matches the number of refusals
- [ ] The results screen shows the side-by-side Receipts, the red differences, the star, the broken rules and the mistake count
- [ ] Retry rolls a new seed unless the URL fixed one
- [ ] The Playwright runs from 04 now also assert star 1 on the results screen
- [ ] The check command passes
