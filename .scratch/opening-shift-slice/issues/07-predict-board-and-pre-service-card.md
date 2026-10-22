# 07: Predict board and pre-service card

**What to build:** Before service, a one-screen card shows the controls and the three Kitchen rules, and the rules are also painted on the kitchen wall. After the card, the predict board shows the program's Receipt lines as cards the player can put in order, by drag-and-drop or with the keyboard, or skip. The Prediction locks when service starts. A correct Prediction (either race order) earns the bonus star, shown on the results screen. The simulator's judgement includes the Prediction.

**Blocked by:** 05 (Results: judge the Receipt)

**Status:** ready-for-agent

- [ ] The card lists every keyboard control and the three Kitchen rules in `CONTEXT.md` wording
- [ ] The Kitchen rules are visible on the wall throughout the Shift
- [ ] The predict board reorders by drag-and-drop and by keyboard alone
- [ ] Skipping leaves no Prediction and no bonus star, without blocking service
- [ ] The Prediction can't change after service starts
- [ ] Vitest: a Prediction of `A F E D B C` or `A F E D C B` earns the bonus star whatever the actual race outcome; any other order doesn't
- [ ] A Playwright run fills in a correct Prediction by keyboard and asserts the bonus star
- [ ] The check command passes
