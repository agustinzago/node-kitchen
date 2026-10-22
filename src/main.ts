/// <reference types="vite/client" />
// Wires the kitchen together: the Shift, the "use" key, the scene, the overlay and walking.
import level from './shifts/opening-boss/level.ts';
import { el } from './el.ts';
import { preService } from './preservice.ts';
import { KIND_COLOURS, STATION_NAMES } from './legend.ts';
import { kindOf, placeStationLabels, placeTickets, say, shake, updateOverlay } from './overlay.ts';
import { glow, pipeline, renderer, stationAt } from './scene.ts';
import { act, heldTicket, predict, startShift, waitingTickets, waitsAt, type Action, type ShiftEvent } from './sim/shift.ts';
import { chef, walk } from './walk.ts';

// The seed comes from the URL when present (?seed=1 makes the Oven ready on Lap 1, ?seed=0 doesn't).
const seedParam = Number.parseInt(new URLSearchParams(location.search).get('seed') ?? '', 10);
let shift = startShift(level, Number.isNaN(seedParam) ? Math.floor(Math.random() * 2 ** 31) : seedParam);
// The card and the predict board hold the keyboard until service starts; then the Prediction is locked in.
void preService(level).then((prediction) => prediction && (shift = predict(shift, prediction)));

const REFUSALS: Record<Extract<ShiftEvent, { type: 'actionRefused' }>['reason'], string> = {
  rule1: 'One Dish at a time: finish the Dish on the Stove first.',
  handsFull: 'Your hands are full: put the Ticket down first.',
  handsEmpty: 'Your hands are empty.',
  nothingToCook: 'Nothing on the Stove: pick up a Ticket from a Rail or a Counter.',
  nothingReady: 'Nothing ready here.',
  closed: 'The restaurant has closed.',
};

/** "Use" on the faced cell: cook at the Stove, put down the held Ticket, or pick one up. */
function use() {
  const station = stationAt(chef.faced.x, chef.faced.z);
  if (!station) return;
  const name = STATION_NAMES[station][0];
  let action: Action;
  if (station === 'stove') action = { type: 'cook' };
  else if (station === 'pendingShelf' || station === 'pollPass' || station === 'closeHatch') {
    return say(`The ${name} is closed this Shift.`, station);
  } else action = { type: heldTicket(shift) ? 'route' : 'pickUp', station };

  const result = act(shift, action);
  shift = result.shift;
  for (const event of result.events) {
    if (event.type === 'ticketRefused') {
      // The hint names the right station, and its real Node name while X-ray is on.
      const [kitchen, node] = STATION_NAMES[waitsAt(shift, event.ticket)];
      const word = KIND_COLOURS[kindOf(event.ticket)].word;
      const hint = `Buzz! The ${name} refuses ${event.ticket}: ${word} Tickets wait at the ${kitchen}`;
      say([hint, el('span', { className: 'xray', textContent: ` (${node})` }), '.'], station);
    } else if (event.type === 'actionRefused') {
      const notYet = event.reason === 'nothingReady' && waitingTickets(shift).oven.length && station === 'oven';
      say(notYet ? 'The Oven isn’t ready yet: come back next Lap.' : REFUSALS[event.reason], station);
    } else if (event.type === 'lapAdvanced') {
      say(`Lap ${event.lap}`);
    } else if (event.type === 'restaurantClosed') {
      say('No Tickets left and nothing cooking: the restaurant closes.');
    }
  }
  updateOverlay(shift);
}

const USE_KEYS = ['Space', 'KeyE', 'Enter'];
addEventListener('keydown', (e) => {
  if (!USE_KEYS.includes(e.code)) return;
  e.preventDefault();
  if (!e.repeat) use();
});

await renderer.init();
updateOverlay(shift);

declare global {
  interface Window {
    __kitchen?: { backend: string; chef(): { x: number; z: number }; facing(): { x: number; z: number } };
  }
}
if (import.meta.env.MODE === 'e2e') {
  window.__kitchen = {
    backend: (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL 2',
    chef: () => ({ x: chef.body.position.x, z: chef.body.position.z }),
    facing: () => ({ ...chef.faced }),
  };
}

let last = performance.now();
renderer.setAnimationLoop((now) => {
  walk(Math.min((now - last) / 1000, 0.1));
  last = now;
  shake(now);
  placeTickets(shift);
  placeStationLabels();
  glow.opacity = 0.45 + 0.2 * Math.sin(now / 150);
  pipeline.render();
});
