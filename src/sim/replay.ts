// The Replay timeline: the Shift played again from its seed, one step per accepted action.
import { act, dishOnStove, startShift, type Action, type Shift, type ShiftEvent } from './shift.ts';

export type ReplayStep = {
  action: Action;
  events: ShiftEvent[];
  /** The program line cooked, or the line that made the Ticket Routed or picked up. */
  sourceLine: number;
  /** The Shift right after this step, for the usual queries. */
  shift: Shift;
};

export function replayTimeline(s: Shift): ReplayStep[] {
  let state = startShift(s.level, s.seed);
  const lineOf = (ticket: string) => s.level.tickets[ticket]!.sourceLine;
  return s.actions.map((action) => {
    const before = action.type === 'cook' ? dishOnStove(state)!.sourceLine : state.held && lineOf(state.held);
    const { shift, events } = act(state, action);
    state = shift;
    const started = events.find((e) => e.type === 'dishStarted');
    return { action, events, sourceLine: before || lineOf(started!.dish), shift };
  });
}
