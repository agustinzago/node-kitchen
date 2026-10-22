# 02: Sim plays the boss Shift by the Kitchen rules

**What to build:** The simulator, a pure TypeScript deep module, plays the boss Shift from its level file. Through a small interface (start a Shift from a level and a seed; act with one logical action; query the state) a caller can:
- cook the Opening dish line by line, where a grey line prints a Receipt line and a coloured line puts a Ticket in the Head Chef's hands
- Route the held Ticket to a Rail or a Counter, where a wrong station refuses it and counts a routing mistake
- pick Tickets up from the Rails and the Counters to cook them as Dishes
- walk the Ring Lap by Lap until the restaurant closes

Rule 1 is a wall. Rules 2 and 3 can be broken: the action is accepted and the break is reported as an event. Time is a virtual, turn-based clock; a seeded start-up cost makes the `setTimeout(0)` Ticket ready on the first Lap 50% of the time. Actions are logical, never spatial. See the spec's Implementation Decisions for the full rules.

**Blocked by:** 01 (Project skeleton and level check)

**Status:** done

- [x] Vitest drives Shifts only through start, act and the queries, never internal structures
- [x] Following the Kitchen rules with the "Oven ready" seed outcome gives the Receipt `A F E D B C`; with "Oven not ready" it gives `A F E D C B`
- [x] Starting a Dish, or any action other than cooking the next line, while a Dish is on the Stove is refused (rule 1)
- [x] Routing a Ticket to the wrong station is refused, counted, and the Ticket stays in the Head Chef's hands
- [x] Cooking from the purple rail while the orange rail holds a Ticket is accepted and reports a rule 2 break
- [x] Picking up from the Check counter while the Oven holds a ready Ticket is accepted and reports a rule 3 break; passing a not-ready or empty Oven is not a break
- [x] The queries expose what the Head Chef holds, the Tickets at each Rail and Counter (with Oven countdowns), the legal actions, the Receipt, the Lap count and whether the Shift has ended
- [x] The restaurant closes exactly when nothing is cooking and no Tickets remain
- [x] The same seed always gives the same Shift
- [x] The level check now also fails if the sim, following the Kitchen rules, gives a Receipt outside the Accepted outputs for either seed outcome
