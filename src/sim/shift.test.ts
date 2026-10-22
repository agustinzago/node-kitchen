import { describe, expect, it } from 'vitest';
import boss from '../shifts/opening-boss/level.ts';
import type { Level } from './level.ts';
import {
  act,
  dishOnStove,
  followKitchenRules,
  hasEnded,
  heldTicket,
  judge,
  lap,
  legalActions,
  predict,
  receipt,
  routingMistakes,
  seedFor,
  startShift,
  waitingTickets,
  waitsAt,
  type Action,
  type Shift,
  type ShiftEvent,
  type Station,
} from './shift.ts';

const ovenReady = seedFor(true);
const ovenNotReady = seedFor(false);

const cook: Action = { type: 'cook' };
const route = (station: Station): Action => ({ type: 'route', station });
const pickUp = (station: Station): Action => ({ type: 'pickUp', station });

/** Plays the actions in order and fails on any refusal. */
function play(shift: Shift, actions: Action[]): { shift: Shift; events: ShiftEvent[] } {
  const events: ShiftEvent[] = [];
  for (const action of actions) {
    const result = act(shift, action);
    const refusal = result.events.find((e) => e.type === 'actionRefused' || e.type === 'ticketRefused');
    if (refusal) throw new Error(`${JSON.stringify(action)} was refused: ${JSON.stringify(refusal)}`);
    shift = result.shift;
    events.push(...result.events);
  }
  return { shift, events };
}

const ruleBreaks = (events: ShiftEvent[]) => events.filter((e) => e.type === 'kitchenRuleBroken');

// Cook every line, Routing each new Ticket where its kind waits: B, C, D, E.
const openingDish = [
  cook,
  cook,
  route('oven'),
  cook,
  route('checkCounter'),
  cook,
  route('purpleRail'),
  cook,
  route('orangeRail'),
  cook,
];
const clearRails = [pickUp('orangeRail'), cook, pickUp('purpleRail'), cook];

describe('following the Kitchen rules', () => {
  it('prints A F E D B C when the Oven is ready on the first Lap', () => {
    const { shift, events } = play(startShift(boss, ovenReady), [
      ...openingDish,
      ...clearRails,
      pickUp('oven'),
      cook,
      pickUp('checkCounter'),
      cook,
    ]);

    expect(receipt(shift)).toEqual(['A', 'F', 'E', 'D', 'B', 'C']);
    expect(ruleBreaks(events)).toEqual([]);
    expect(lap(shift)).toBe(1);
    expect(hasEnded(shift)).toBe(true);
  });

  it('prints A F E D C B when the Oven is not ready, walking past it and back on the next Lap', () => {
    const { shift: firstLap } = play(startShift(boss, ovenNotReady), [...openingDish, ...clearRails]);

    expect(waitingTickets(firstLap).oven).toEqual([{ ticket: 'B', countdown: 2 }]);
    expect(legalActions(firstLap)).toEqual([pickUp('checkCounter')]);

    const { shift: passedOven, events: passing } = play(firstLap, [pickUp('checkCounter'), cook]);
    expect(ruleBreaks(passing)).toEqual([]);
    expect(waitingTickets(passedOven).oven).toEqual([{ ticket: 'B', countdown: 0 }]);

    const { shift, events } = play(passedOven, [pickUp('oven'), cook]);
    expect(events).toContainEqual({ type: 'lapAdvanced', lap: 2 });
    expect(lap(shift)).toBe(2);
    expect(receipt(shift)).toEqual(['A', 'F', 'E', 'D', 'C', 'B']);
    expect(hasEnded(shift)).toBe(true);
  });
});

describe('the Dish on the Stove', () => {
  it('is the Opening dish at its next line, then nothing, then a picked-up Ticket at its source line', () => {
    const start = startShift(boss, ovenReady);
    expect(dishOnStove(start)).toEqual({ dish: 'opening', sourceLine: 1 });
    expect(dishOnStove(play(start, [cook]).shift)).toEqual({ dish: 'opening', sourceLine: 2 });

    const { shift: served } = play(start, openingDish);
    expect(dishOnStove(served)).toBe(null);
    expect(dishOnStove(play(served, [pickUp('orangeRail')]).shift)).toEqual({ dish: 'E', sourceLine: 5 });
  });
});

describe('cooking the Opening dish', () => {
  it('prints a grey line and puts a coloured line Ticket in the Head Chef’s hands', () => {
    const { shift, events } = play(startShift(boss, ovenReady), [cook, cook]);

    expect(events).toEqual([
      { type: 'receiptLinePrinted', line: 'A' },
      { type: 'ticketCreated', ticket: 'B' },
    ]);
    expect(heldTicket(shift)).toBe('B');
  });

  it('Routes the held Ticket to the station for its kind', () => {
    const { shift, events } = play(startShift(boss, ovenReady), [cook, cook, route('oven')]);

    expect(events.at(-1)).toEqual({ type: 'ticketRouted', ticket: 'B', station: 'oven' });
    expect(heldTicket(shift)).toBe(null);
    expect(waitingTickets(shift)).toEqual({
      orangeRail: [],
      purpleRail: [],
      oven: [{ ticket: 'B', countdown: 10 }],
      checkCounter: [],
    });
  });

  it('finishes after its last line', () => {
    const { events } = play(startShift(boss, ovenReady), openingDish);

    expect(events.at(-1)).toEqual({ type: 'dishFinished', dish: 'opening' });
  });
});

describe('rule 1: one Dish at a time, to the end', () => {
  it('refuses to start a Dish while one is on the Stove', () => {
    const { shift } = play(startShift(boss, ovenReady), openingDish.slice(0, 9));

    const refused = act(shift, pickUp('orangeRail'));

    expect(refused.events).toEqual([{ type: 'actionRefused', reason: 'rule1' }]);
    expect(refused.shift).toBe(shift);
    expect(legalActions(shift)).toEqual([cook]);
  });

  it('only lets the Head Chef Route a held Ticket', () => {
    const { shift } = play(startShift(boss, ovenReady), [cook, cook]);

    expect(legalActions(shift)).toEqual([route('oven')]);
    expect(act(shift, cook).events).toEqual([{ type: 'actionRefused', reason: 'handsFull' }]);
  });
});

describe('Routing to the wrong station', () => {
  it('is refused, counted, and the Ticket stays held', () => {
    const { shift } = play(startShift(boss, ovenReady), [cook, cook]);

    const { shift: after, events } = act(shift, route('checkCounter'));

    expect(events).toEqual([{ type: 'ticketRefused', ticket: 'B', station: 'checkCounter' }]);
    expect(routingMistakes(after)).toBe(1);
    expect(heldTicket(after)).toBe('B');
    expect(waitingTickets(after).checkCounter).toEqual([]);
    expect(waitsAt(after, 'B')).toBe('oven');
  });
});

describe('rule 2: clear the orange then the purple Rail', () => {
  it('cooking from the purple rail while the orange rail holds a Ticket is accepted and breaks rule 2', () => {
    const { shift } = play(startShift(boss, ovenReady), openingDish);

    const { shift: after, events } = act(shift, pickUp('purpleRail'));

    expect(events).toEqual([
      { type: 'kitchenRuleBroken', rule: 2, ticket: 'D', skipped: 'E' },
      { type: 'dishStarted', dish: 'D' },
    ]);
    const { shift: end } = play(after, [cook, pickUp('orangeRail'), cook, pickUp('oven'), cook, pickUp('checkCounter'), cook]);
    expect(receipt(end)).toEqual(['A', 'F', 'D', 'E', 'B', 'C']);
    expect(boss.acceptedOutputs).not.toContainEqual(receipt(end));
  });
});

describe('rule 3: then walk the Ring', () => {
  it('picking up from the Check counter while the Oven holds a ready Ticket breaks rule 3', () => {
    const { shift } = play(startShift(boss, ovenReady), [...openingDish, ...clearRails]);

    const { events } = act(shift, pickUp('checkCounter'));

    expect(ruleBreaks(events)).toEqual([{ type: 'kitchenRuleBroken', rule: 3, ticket: 'C', skipped: 'B' }]);
    expect(events).toContainEqual({ type: 'dishStarted', dish: 'C' });
  });

  it('passing an Oven that is not ready is not a break', () => {
    const { shift } = play(startShift(boss, ovenNotReady), [...openingDish, ...clearRails]);

    expect(ruleBreaks(act(shift, pickUp('checkCounter')).events)).toEqual([]);
  });

  it('passing an empty Oven is not a break', () => {
    const { events } = play(startShift(boss, ovenReady), [
      ...openingDish,
      ...clearRails,
      pickUp('oven'),
      cook,
      pickUp('checkCounter'),
    ]);

    expect(ruleBreaks(events)).toEqual([]);
  });
});

describe('the restaurant closes', () => {
  it('exactly when nothing is cooking and no Tickets remain', () => {
    const { shift } = play(startShift(boss, ovenReady), [
      ...openingDish,
      ...clearRails,
      pickUp('oven'),
      cook,
      pickUp('checkCounter'),
    ]);
    expect(hasEnded(shift)).toBe(false);

    const { shift: closed, events } = act(shift, cook);

    expect(events).toEqual([
      { type: 'receiptLinePrinted', line: 'C' },
      { type: 'dishFinished', dish: 'C' },
      { type: 'restaurantClosed' },
    ]);
    expect(hasEnded(closed)).toBe(true);
    expect(legalActions(closed)).toEqual([]);
  });
});

describe('the kitchen idles in Poll', () => {
  // Only a 0 ms timer: once it's in the Oven there is nothing else to cook.
  const timerOnly: Level = {
    program: 'timer-only.cjs',
    openingDish: [{ sourceLine: 1, creates: 'B' }],
    tickets: { B: { kind: 'timer', sourceLine: 1, createdBy: 'opening', receiptLines: ['B'], delayMs: 0 } },
    acceptedOutputs: [['B']],
  };

  it('with only an unready timer left, picking up from the Oven waits for it on the next Lap', () => {
    const { shift } = play(startShift(timerOnly, ovenNotReady), [cook, route('oven')]);
    expect(waitingTickets(shift).oven[0]!.countdown).toBeGreaterThan(0);

    const { shift: after, events } = act(shift, pickUp('oven'));

    expect(events).toEqual([
      { type: 'lapAdvanced', lap: 2 },
      { type: 'dishStarted', dish: 'B' },
    ]);
    expect(receipt(play(after, [cook]).shift)).toEqual(['B']);
  });

  it('following the Kitchen rules closes the restaurant instead of getting stuck', () => {
    let shift = startShift(timerOnly, ovenNotReady);
    for (let action = followKitchenRules(shift); action; action = followKitchenRules(shift)) {
      shift = act(shift, action).shift;
    }
    expect(hasEnded(shift)).toBe(true);
    expect(receipt(shift)).toEqual(['B']);
  });

  it('an unready Oven still refuses while other work waits', () => {
    const { shift } = play(startShift(boss, ovenNotReady), [...openingDish, ...clearRails]);

    expect(act(shift, pickUp('oven')).events).toEqual([{ type: 'actionRefused', reason: 'nothingReady' }]);
  });
});

it('the same seed always gives the same Shift', () => {
  const playByTheRules = (seed: number) => {
    let shift = startShift(boss, seed);
    const events: ShiftEvent[] = [];
    for (let action = followKitchenRules(shift); action; action = followKitchenRules(shift)) {
      const result = act(shift, action);
      shift = result.shift;
      events.push(...result.events);
    }
    return events;
  };

  for (const seed of [0, 1, 7, 42, 1234]) {
    expect(playByTheRules(seed)).toEqual(playByTheRules(seed));
  }
});

/** Follows the Kitchen rules until the restaurant closes. */
function followRulesToClose(shift: Shift): Shift {
  for (let action = followKitchenRules(shift); action; action = followKitchenRules(shift)) shift = act(shift, action).shift;
  return shift;
}

describe('judging the Receipt', () => {
  it('following the Kitchen rules earns star 1 for both race orders', () => {
    for (const seed of [ovenReady, ovenNotReady]) {
      const shift = followRulesToClose(startShift(boss, seed));

      expect(judge(shift)).toEqual({
        accepted: true,
        cleanService: true,
        stars: 1,
        predictionAccepted: null,
        routingMistakes: 0,
        brokenRules: [],
        firstWrongLine: null,
        nodeReceipt: receipt(shift),
      });
    }
  });

  it('breaking rule 2 gives no star and reports the first wrong line, the rule and real Node’s line', () => {
    const { shift } = play(startShift(boss, ovenReady), [...openingDish, pickUp('purpleRail')]);

    expect(judge(followRulesToClose(shift))).toEqual({
      accepted: false,
      cleanService: false,
      stars: 0,
      predictionAccepted: null,
      routingMistakes: 0,
      brokenRules: [2],
      firstWrongLine: { index: 2, line: 'D', rule: 2, nodeLine: 'E' },
      nodeReceipt: ['A', 'F', 'E', 'D', 'B', 'C'],
    });
  });

  it('breaking rule 3 costs star 1 even when the Receipt is accepted', () => {
    const { shift } = play(startShift(boss, ovenReady), [...openingDish, ...clearRails, pickUp('checkCounter')]);

    expect(judge(followRulesToClose(shift))).toMatchObject({ accepted: true, cleanService: false, stars: 0, brokenRules: [3] });
  });

  it('counts one routing mistake per refusal', () => {
    let shift = startShift(boss, ovenReady);
    let refusals = 0;
    for (const action of [cook, cook, route('checkCounter'), route('purpleRail'), route('oven'), cook, route('oven')]) {
      const result = act(shift, action);
      refusals += result.events.filter((e) => e.type === 'ticketRefused').length;
      shift = result.shift;
    }

    expect(refusals).toBe(3);
    expect(judge(followRulesToClose(shift))).toMatchObject({ stars: 1, routingMistakes: refusals });
  });
});

describe('judging the Prediction', () => {
  const raceOrders = [
    ['A', 'F', 'E', 'D', 'B', 'C'],
    ['A', 'F', 'E', 'D', 'C', 'B'],
  ];

  it('either race order earns the bonus star, whatever the actual race outcome', () => {
    for (const seed of [ovenReady, ovenNotReady]) {
      for (const prediction of raceOrders) {
        const shift = followRulesToClose(predict(startShift(boss, seed), prediction));

        expect(judge(shift)).toMatchObject({ accepted: true, predictionAccepted: true, stars: 2 });
      }
    }
  });

  it('any other order earns no bonus star', () => {
    for (const prediction of [
      ['A', 'B', 'C', 'D', 'E', 'F'],
      ['A', 'F', 'D', 'E', 'B', 'C'],
      ['A', 'F', 'E', 'D', 'B'],
    ]) {
      const shift = followRulesToClose(predict(startShift(boss, ovenReady), prediction));

      expect(judge(shift)).toMatchObject({ predictionAccepted: false, stars: 1 });
    }
  });

  it('a correct Prediction earns the bonus star even when the Receipt is wrong', () => {
    const { shift } = play(predict(startShift(boss, ovenReady), raceOrders[0]!), [...openingDish, pickUp('purpleRail')]);

    expect(judge(followRulesToClose(shift))).toMatchObject({ accepted: false, predictionAccepted: true, stars: 1 });
  });

  it('skipping leaves no Prediction and no bonus star', () => {
    expect(judge(followRulesToClose(startShift(boss, ovenReady)))).toMatchObject({ predictionAccepted: null, stars: 1 });
  });

  it('the Prediction locks when service starts', () => {
    const { shift } = play(predict(startShift(boss, ovenReady), ['A', 'B', 'C', 'D', 'E', 'F']), [cook]);

    expect(judge(followRulesToClose(predict(shift, raceOrders[0]!)))).toMatchObject({ predictionAccepted: false });
    expect(judge(followRulesToClose(predict(play(startShift(boss, ovenReady), [cook]).shift, raceOrders[0]!)))).toMatchObject({
      predictionAccepted: null,
    });
  });
});
