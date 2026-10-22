// The simulator plays one Shift by the Kitchen rules. Start a Shift, act on it with one
// logical action at a time, and read it through the queries below. Rule 1 is a wall;
// rules 2 and 3 can be broken, and each break is reported as an event.
import type { Level, TicketId, TicketKind } from './level.ts';

export type Station = 'orangeRail' | 'purpleRail' | 'oven' | 'checkCounter';
export type Dish = 'opening' | TicketId;

export type Action =
  | { type: 'cook' } // cook the next line of the Dish on the Stove
  | { type: 'route'; station: Station } // Route the held Ticket
  | { type: 'pickUp'; station: Station }; // start a Dish from a Rail or Counter

export type ShiftEvent =
  | { type: 'receiptLinePrinted'; line: string }
  | { type: 'ticketCreated'; ticket: TicketId }
  | { type: 'ticketRouted'; ticket: TicketId; station: Station }
  | { type: 'ticketRefused'; ticket: TicketId; station: Station } // a routing mistake
  | { type: 'kitchenRuleBroken'; rule: 2 | 3; ticket: TicketId; skipped: TicketId }
  | { type: 'dishStarted'; dish: Dish }
  | { type: 'dishFinished'; dish: Dish }
  | { type: 'lapAdvanced'; lap: number }
  | { type: 'restaurantClosed' }
  | {
      type: 'actionRefused';
      reason: 'rule1' | 'handsFull' | 'handsEmpty' | 'nothingToCook' | 'nothingReady' | 'closed';
    };

/** Read a Shift through the queries; its fields are the simulator's own business. */
export type Shift = {
  level: Level;
  clock: number;
  startUpCost: number;
  stove: { dish: Dish; cooked: number } | null;
  held: TicketId | null;
  stations: Record<Station, TicketId[]>;
  dueAt: Record<TicketId, number>;
  ringPosition: number;
  lap: number;
  receipt: string[];
  routingMistakes: number;
  /** Each broken rule, with the Receipt length when it broke: the broken Dish prints from there. */
  ruleBreaks: { rule: 2 | 3; atLine: number }[];
  ended: boolean;
  /** Replays the Shift: the seed it started from and every action act accepted. */
  seed: number;
  actions: Action[];
};

const STATIONS: Station[] = ['orangeRail', 'purpleRail', 'oven', 'checkCounter'];
const STATION_FOR_KIND: Record<TicketKind, Station> = {
  nextTick: 'orangeRail',
  microtask: 'purpleRail',
  timer: 'oven',
  immediate: 'checkCounter',
};
// The working Counters in Ring order. The Pending shelf, Poll pass and Close hatch never
// hold a Ticket in this slice, so they can't change rule 3 or the Lap count.
const RING: Station[] = ['oven', 'checkCounter'];
// ponytail: one clock turn is a tenth of a millisecond, tuned so the boss Shift's 0 ms timer
// misses the first Lap without the start-up cost. Revisit when a Shift races timers differently.
const TURNS_PER_MS = 10;

/** An odd seed pays a 1 ms start-up cost, which makes a 0 ms timer ready on the first Lap. */
export function startShift(level: Level, seed: number): Shift {
  return {
    level,
    clock: 0,
    startUpCost: seed & 1 ? TURNS_PER_MS : 0,
    stove: { dish: 'opening', cooked: 0 },
    held: null,
    stations: { orangeRail: [], purpleRail: [], oven: [], checkCounter: [] },
    dueAt: {},
    ringPosition: 0,
    lap: 1,
    receipt: [],
    routingMistakes: 0,
    ruleBreaks: [],
    ended: false,
    seed,
    actions: [],
  };
}

export function act(shift: Shift, action: Action): { shift: Shift; events: ShiftEvent[] } {
  const refuse = (reason: Extract<ShiftEvent, { type: 'actionRefused' }>['reason']) => ({
    shift,
    events: [{ type: 'actionRefused', reason } as const],
  });
  if (shift.ended) return refuse('closed');

  const s: Shift = JSON.parse(JSON.stringify(shift));
  const events: ShiftEvent[] = [];
  s.actions.push(action);

  if (action.type === 'route') {
    const ticket = s.held;
    if (!ticket) return refuse('handsEmpty');
    if (STATION_FOR_KIND[s.level.tickets[ticket].kind] !== action.station) {
      s.routingMistakes++;
      return { shift: s, events: [{ type: 'ticketRefused', ticket, station: action.station }] };
    }
    s.held = null;
    s.stations[action.station].push(ticket);
    events.push({ type: 'ticketRouted', ticket, station: action.station });
  } else if (action.type === 'cook') {
    if (!s.stove) return refuse('nothingToCook');
    if (s.held) return refuse('handsFull');
    const line = dishLines(s.level, s.stove.dish)[s.stove.cooked++];
    s.clock++;
    if ('prints' in line) {
      s.receipt.push(line.prints);
      events.push({ type: 'receiptLinePrinted', line: line.prints });
    } else {
      const delayMs = s.level.tickets[line.creates].delayMs;
      // Node turns a 0 ms timer into 1 ms.
      if (delayMs !== undefined) s.dueAt[line.creates] = s.clock + Math.max(1, delayMs) * TURNS_PER_MS;
      s.held = line.creates;
      events.push({ type: 'ticketCreated', ticket: line.creates });
    }
  } else {
    if (s.stove) return refuse('rule1');
    if (s.held) return refuse('handsFull');
    const waiting = s.stations[action.station];
    const ticket = waiting.find((t) => isReady(s, t));
    if (!ticket) return refuse('nothingReady');
    const breaks = ruleBreaks(s, action.station, ticket);
    for (const e of breaks) if (e.type === 'kitchenRuleBroken') s.ruleBreaks.push({ rule: e.rule, atLine: s.receipt.length });
    events.push(...breaks);
    const ringPosition = RING.indexOf(action.station);
    if (ringPosition >= 0) {
      if (ringPosition < s.ringPosition) events.push({ type: 'lapAdvanced', lap: ++s.lap });
      s.ringPosition = ringPosition;
    }
    waiting.splice(waiting.indexOf(ticket), 1);
    s.stove = { dish: ticket, cooked: 0 };
    s.clock++;
    events.push({ type: 'dishStarted', dish: ticket });
  }

  if (s.stove && s.stove.cooked === dishLines(s.level, s.stove.dish).length) {
    events.push({ type: 'dishFinished', dish: s.stove.dish });
    if (s.stove.dish === 'opening') s.clock += s.startUpCost;
    s.stove = null;
  }
  if (!s.stove && !s.held && STATIONS.every((station) => s.stations[station].length === 0)) {
    s.ended = true;
    events.push({ type: 'restaurantClosed' });
  }
  return { shift: s, events };
}

function dishLines(level: Level, dish: Dish): ({ prints: string } | { creates: TicketId })[] {
  return dish === 'opening' ? level.openingDish : level.tickets[dish].receiptLines.map((prints) => ({ prints }));
}

const countdown = (s: Shift, ticket: TicketId) => Math.max(0, (s.dueAt[ticket] ?? 0) - s.clock);
const isReady = (s: Shift, ticket: TicketId) => countdown(s, ticket) === 0;

/** Rule 2: the orange then the purple Rail come first. Rule 3: walk the Ring in order. */
function ruleBreaks(s: Shift, station: Station, ticket: TicketId): ShiftEvent[] {
  const breaks: ShiftEvent[] = [];
  const railsFirst = STATIONS.slice(0, Math.min(STATIONS.indexOf(station), 2));
  const railTicket = railsFirst.map((rail) => s.stations[rail][0]).find(Boolean);
  if (railTicket) breaks.push({ type: 'kitchenRuleBroken', rule: 2, ticket, skipped: railTicket });

  const target = RING.indexOf(station);
  if (target < 0) return breaks;
  for (let i = s.ringPosition; i !== target; i = (i + 1) % RING.length) {
    const skipped = s.stations[RING[i]].find((t) => isReady(s, t));
    if (skipped) {
      breaks.push({ type: 'kitchenRuleBroken', rule: 3, ticket, skipped });
      break;
    }
  }
  return breaks;
}

export const heldTicket = (s: Shift): TicketId | null => s.held;
export const receipt = (s: Shift): string[] => s.receipt;
export const lap = (s: Shift): number => s.lap;
export const hasEnded = (s: Shift): boolean => s.ended;
export const routingMistakes = (s: Shift): number => s.routingMistakes;

/** The Dish on the Stove and the program line it cooks next, or null when the Stove is free. */
export function dishOnStove(s: Shift): { dish: Dish; sourceLine: number } | null {
  if (!s.stove) return null;
  const { dish, cooked } = s.stove;
  const sourceLine = dish === 'opening' ? s.level.openingDish[cooked]!.sourceLine : s.level.tickets[dish]!.sourceLine;
  return { dish, sourceLine };
}

/** The Tickets waiting at each Rail and Counter; a countdown of 0 means ready. */
export function waitingTickets(s: Shift): Record<Station, { ticket: TicketId; countdown: number }[]> {
  const at = (station: Station) => s.stations[station].map((ticket) => ({ ticket, countdown: countdown(s, ticket) }));
  return { orangeRail: at('orangeRail'), purpleRail: at('purpleRail'), oven: at('oven'), checkCounter: at('checkCounter') };
}

const ACTIONS: Action[] = [
  { type: 'cook' },
  ...STATIONS.map((station): Action => ({ type: 'route', station })),
  ...STATIONS.map((station): Action => ({ type: 'pickUp', station })),
];

/** Every action act would accept now, including ones that break rule 2 or 3. */
export function legalActions(s: Shift): Action[] {
  return ACTIONS.filter(
    (action) => !act(s, action).events.some((e) => e.type === 'actionRefused' || e.type === 'ticketRefused'),
  );
}

/** The one legal action that breaks no Kitchen rule, or undefined once the restaurant has closed. */
export function followKitchenRules(s: Shift): Action | undefined {
  return legalActions(s).find((action) => !act(s, action).events.some((e) => e.type === 'kitchenRuleBroken'));
}

export type Judgement = {
  /** The Receipt is one of the Accepted outputs. */
  accepted: boolean;
  stars: number;
  routingMistakes: number;
  /** Each Kitchen rule broken at least once, in rule order. */
  brokenRules: (2 | 3)[];
  /** The first Receipt line outside the Accepted outputs, the rule broken there, and real Node's line. */
  firstWrongLine: { index: number; line: string; rule: 2 | 3 | null; nodeLine: string } | null;
  /** The Accepted output closest to the Receipt: what real Node printed. */
  nodeReceipt: string[];
};

export function judge(s: Shift): Judgement {
  const sharedPrefix = (output: string[]) => {
    let i = 0;
    while (i < output.length && output[i] === s.receipt[i]) i++;
    return i;
  };
  const nodeReceipt = s.level.acceptedOutputs.reduce((best, output) =>
    sharedPrefix(output) > sharedPrefix(best) ? output : best,
  );
  const index = sharedPrefix(nodeReceipt);
  const accepted = index === nodeReceipt.length && index === s.receipt.length;
  const wrong = index < s.receipt.length && index < nodeReceipt.length;
  const rule = s.ruleBreaks.findLast((b) => b.atLine <= index)?.rule ?? null;
  return {
    accepted,
    stars: accepted ? 1 : 0,
    routingMistakes: s.routingMistakes,
    brokenRules: ([2, 3] as const).filter((r) => s.ruleBreaks.some((b) => b.rule === r)),
    firstWrongLine: wrong ? { index, line: s.receipt[index]!, rule, nodeLine: nodeReceipt[index]! } : null,
    nodeReceipt,
  };
}
