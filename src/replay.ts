// The Replay: the Shift played back beside the program on the wall, step by step. It pauses
// at the first wrong Receipt line and explains it, in kitchen words or, with X-ray, in Node's.
import './replay.css';
import type { TicketId, TicketKind } from './sim/level.ts';
import { replayTimeline, type ReplayStep } from './sim/replay.ts';
import { dishOnStove, heldTicket, judge, receipt, waitingTickets, type Shift, type Station } from './sim/shift.ts';

/** Each station's kitchen name and real Node name. */
const NAMES: Record<Station, [string, string]> = {
  orangeRail: ['orange rail', 'nextTick queue'],
  purpleRail: ['purple rail', 'microtask queue'],
  oven: ['Oven', 'timers phase'],
  checkCounter: ['Check counter', 'check phase'],
};
const WAITS_AT: Record<TicketKind, Station> = {
  nextTick: 'orangeRail',
  microtask: 'purpleRail',
  timer: 'oven',
  immediate: 'checkCounter',
};
const API: Record<TicketKind, string> = {
  nextTick: 'process.nextTick',
  microtask: 'Promise.then',
  timer: 'setTimeout',
  immediate: 'setImmediate',
};
const PLAY_MS = 300;

/** A note shows once the Replay reaches its step. */
type Note = { at: number; id: string; kitchen: string; node: string };

function notes(shift: Shift, steps: ReplayStep[]): { pause: number; notes: Note[] } {
  const api = (t: TicketId) => API[shift.level.tickets[t]!.kind];
  const at = (t: TicketId) => NAMES[WAITS_AT[shift.level.tickets[t]!.kind]];
  const found: Note[] = [];
  const { firstWrongLine, routingMistakes } = judge(shift);

  // Pause where the first wrong line prints, or else where a rule first broke (rule 3 can still
  // give an Accepted output).
  const breaks = (i: number) => steps[i]!.events.filter((e) => e.type === 'kitchenRuleBroken');
  let pause = firstWrongLine
    ? steps.findIndex((step) => receipt(step.shift).length > firstWrongLine.index)
    : steps.findIndex((_, i) => breaks(i).length);
  const broken = steps.slice(0, pause + 1).flatMap((_, i) => breaks(i)).at(-1);
  if (broken?.rule === 2) {
    const { ticket: t, skipped: e } = broken;
    found.push({
      at: pause,
      id: 'rule-2',
      kitchen: `You cooked ${t} while the ${at(e)[0]} still had ${e}. After every Dish, clear the orange then the purple Rail.`,
      node: `Node ran ${t}'s ${api(t)} callback while the ${at(e)[1]} still had ${e}'s. After every callback Node drains the nextTick queue, then the microtask queue.`,
    });
  } else if (broken?.rule === 3) {
    const { ticket: t, skipped: e } = broken;
    found.push({
      at: pause,
      id: 'rule-3',
      kitchen: `You cooked ${t} from the ${at(t)[0]} while the ${at(e)[0]} still had ${e} ready. Walk the Ring in order.`,
      node: `You ran ${t}'s ${api(t)} callback in the ${at(t)[1]} while the ${at(e)[1]} still had ${e}'s due. The event loop visits its phases in order.`,
    });
  }
  if (firstWrongLine) {
    const said = `Real Node printed ${firstWrongLine.nodeLine} here, not ${firstWrongLine.line}.`;
    found.push({ at: pause, id: 'node-line', kitchen: said, node: said });
  }

  // ponytail: the race is judged when Lap 1's Ring walk starts (Stove free, Rails empty).
  // Revisit when a Shift has Tickets that reach the Rails after that.
  const ringWalk = steps.findIndex(({ shift: s }) => {
    const waiting = waitingTickets(s);
    return !dishOnStove(s) && !heldTicket(s) && !waiting.orangeRail.length && !waiting.purpleRail.length;
  });
  const waiting = ringWalk >= 0 ? waitingTickets(steps[ringWalk]!.shift) : null;
  const late = waiting?.oven.find((t) => t.countdown > 0)?.ticket;
  const rival = waiting?.checkCounter[0]?.ticket;
  if (late && rival) {
    found.push({
      at: ringWalk,
      id: 'race',
      kitchen: `The Oven wasn't ready on the first Lap: Node can't promise ${late} before ${rival}.`,
      node: `The ${late} timer hadn't expired when the event loop first reached the timers phase: Node can't promise ${api(late)}'s ${late} before ${api(rival)}'s ${rival}.`,
    });
  }

  const refused = steps.flatMap((step) => step.events).find((e) => e.type === 'ticketRefused');
  if (refused) {
    const { ticket: t, station } = refused;
    const count = `${routingMistakes} routing mistake${routingMistakes === 1 ? '' : 's'}`;
    found.push({
      at: steps.length - 1,
      id: 'routing',
      kitchen: `${count}. The ${NAMES[station][0]} refused ${t}: ${t} waits at the ${at(t)[0]}.`,
      node: `${count}. ${t} is a ${api(t)} callback, so it waits in the ${at(t)[1]}, not the ${NAMES[station][1]}.`,
    });
  }
  if (pause < 0) pause = steps.length - 1;
  return { pause, notes: found };
}

/** What a step did, in kitchen words. */
function caption({ action, events, sourceLine }: ReplayStep): string {
  for (const e of events) {
    if (e.type === 'receiptLinePrinted') return `Cooked line ${sourceLine}: printed ${e.line}`;
    if (e.type === 'ticketCreated') return `Cooked line ${sourceLine}: made Ticket ${e.ticket}`;
    if (e.type === 'ticketRefused') return `The ${NAMES[e.station][0]} refused ${e.ticket}`;
    if (e.type === 'ticketRouted') return `Routed ${e.ticket} to the ${NAMES[e.station][0]}`;
    if (e.type === 'dishStarted' && action.type === 'pickUp') return `Picked up ${e.dish} from the ${NAMES[action.station][0]}`;
  }
  return action.type;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...children: (Node | string)[]) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

export function openReplay(shift: Shift) {
  if (document.getElementById('replay')) return;
  const steps = replayTimeline(shift);
  const { pause, notes: all } = notes(shift, steps);
  const wallLines = [...document.querySelectorAll('#program li')];
  let index = 0;
  let playing = 0;

  const stepText = el('p', { id: 'replay-step' });
  const soFar = el('p', { id: 'replay-receipt' });
  const list = el('ul', { id: 'replay-notes' });
  const back = el('button', { id: 'replay-back', textContent: '◀ Back', onclick: () => go(index - 1) });
  const play = el('button', { id: 'replay-play', textContent: '▶ Play', onclick: () => start() });
  const next = el('button', { id: 'replay-next', textContent: 'Forward ▶', onclick: () => go(index + 1) });
  const close = el('button', { id: 'replay-close', textContent: 'Close', onclick: () => shut() });
  const panel = el(
    'section',
    { id: 'replay', className: 'panel', ariaLabel: 'Replay' },
    el('h2', { textContent: 'Replay' }),
    stepText,
    soFar,
    list,
    el('div', { className: 'replay-controls' }, back, play, next, close),
  );
  // Let Enter and Space press the buttons instead of reaching the kitchen's "use" key.
  panel.addEventListener('keydown', (e) => {
    if (['Enter', 'Space'].includes(e.code)) e.stopPropagation();
  });

  function go(to: number, keepPlaying = false) {
    if (!keepPlaying) clearInterval(playing);
    index = Math.max(0, Math.min(steps.length - 1, to));
    const step = steps[index]!;
    stepText.textContent = `Step ${index + 1} of ${steps.length}: ${caption(step)}`;
    soFar.textContent = `Receipt: ${receipt(step.shift).join(' ') || '…'}`;
    wallLines.forEach((li, i) => li.classList.toggle('replay-line', i + 1 === step.sourceLine));
    list.replaceChildren(
      ...all
        .filter((note) => note.at <= index)
        .map((note) =>
          el(
            'li',
            { className: `replay-note ${note.id}` },
            el('span', { className: 'say-kitchen', textContent: note.kitchen }),
            el('span', { className: 'say-node', textContent: note.node }),
          ),
        ),
    );
    back.disabled = index === 0;
    next.disabled = index === steps.length - 1;
  }
  // Play runs to the pause, then on to the end.
  function start() {
    clearInterval(playing);
    const until = index < pause ? pause : steps.length - 1;
    playing = window.setInterval(() => (index < until ? go(index + 1, true) : clearInterval(playing)), PLAY_MS);
  }
  function shut() {
    clearInterval(playing);
    wallLines.forEach((li) => li.classList.remove('replay-line'));
    panel.remove();
    document.body.classList.remove('replaying');
    document.getElementById('retry')?.focus();
  }

  document.body.append(panel);
  document.body.classList.add('replaying');
  go(0);
  play.focus();
}
