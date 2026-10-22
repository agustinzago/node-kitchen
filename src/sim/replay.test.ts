import { expect, it } from 'vitest';
import boss from '../shifts/opening-boss/level.ts';
import { replayTimeline } from './replay.ts';
import { act, receipt, startShift, type Action, type Station } from './shift.ts';

const cook: Action = { type: 'cook' };
const route = (station: Station): Action => ({ type: 'route', station });
const pickUp = (station: Station): Action => ({ type: 'pickUp', station });

it('has one step per action, in order, with the source line for each created Ticket', () => {
  const actions = [
    cook,
    cook,
    route('checkCounter'), // a routing mistake is still a step
    route('oven'),
    cook,
    route('checkCounter'),
    cook,
    route('purpleRail'),
    cook,
    route('orangeRail'),
    cook,
    pickUp('purpleRail'), // breaks rule 2
    cook,
  ];
  let shift = startShift(boss, 1);
  shift = act(shift, pickUp('oven')).shift; // refused by rule 1: not an action of the Shift
  for (const action of actions) shift = act(shift, action).shift;

  const timeline = replayTimeline(shift);

  expect(timeline.map((step) => step.action)).toEqual(actions);
  expect(timeline.map((step) => step.sourceLine)).toEqual([1, 2, 2, 2, 3, 3, 4, 4, 5, 5, 6, 4, 4]);
  expect(timeline[1]!.events).toEqual([{ type: 'ticketCreated', ticket: 'B' }]);
  expect(timeline[2]!.events).toEqual([{ type: 'ticketRefused', ticket: 'B', station: 'checkCounter' }]);
  expect(timeline[11]!.events).toContainEqual({ type: 'kitchenRuleBroken', rule: 2, ticket: 'D', skipped: 'E' });
  expect(receipt(timeline.at(-1)!.shift)).toEqual(['A', 'F', 'D']);
});
