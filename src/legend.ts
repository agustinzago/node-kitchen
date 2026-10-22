// The legend Node Kitchen owns (ADR 0002): each station's kitchen name and real Node name,
// and each Ticket kind's colour and colour word. The renderer and the Replay both read it.
import type { TicketKind } from './sim/level.ts';

export const STATION_NAMES = {
  stove: ['Stove', 'call stack'],
  orangeRail: ['orange rail', 'nextTick queue'],
  purpleRail: ['purple rail', 'microtask queue'],
  oven: ['Oven', 'timers phase'],
  pendingShelf: ['Pending shelf', 'pending callbacks phase'],
  pollPass: ['Poll pass', 'poll phase'],
  checkCounter: ['Check counter', 'check phase'],
  closeHatch: ['Close hatch', 'close callbacks phase'],
} as const satisfies Record<string, readonly [kitchen: string, node: string]>;
export type StationName = keyof typeof STATION_NAMES;

/** Grey sync is how the Opening dish looks; the sim's Ticket kinds are the other four. */
export type Kind = TicketKind | 'sync';
export const KIND_COLOURS: Record<Kind, { colour: string; word: string }> = {
  sync: { colour: '#8d8a86', word: 'grey' },
  nextTick: { colour: '#f08a24', word: 'orange' },
  microtask: { colour: '#8e5bd6', word: 'purple' },
  timer: { colour: '#3f7fd9', word: 'blue' },
  immediate: { colour: '#f2b52c', word: 'amber' },
};
