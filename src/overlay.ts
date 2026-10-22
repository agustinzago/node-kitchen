// The HTML overlay: the program on the wall, the HUD, the Receipt, the Ticket and station
// labels, and the toasts.
import * as THREE from 'three/webgpu';
import level from './shifts/opening-boss/level.ts';
import program from './shifts/opening-boss/program.cjs?raw';
import { KIND_COLOURS, STATION_NAMES, type Kind, type StationName } from './legend.ts';
import { showResults } from './results.ts';
import { find, pin, scene, SHAPES, stationMeshes, STATIONS, sun, toon } from './scene.ts';
import {
  dishOnStove,
  hasEnded,
  heldTicket,
  lap,
  receipt,
  routingMistakes,
  waitingTickets,
  type Dish,
  type Shift,
  type Station as SimStation,
} from './sim/shift.ts';
import { chef } from './walk.ts';

export const kindOf = (dish: Dish): Kind => (dish === 'opening' ? 'sync' : level.tickets[dish]!.kind);

const $ = (id: string) => document.getElementById(id)!;
$('program-name').textContent = level.program;
const wallLines = program
  .trimEnd()
  .split('\n')
  .map((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    $('program').append(li);
    return li;
  });

const ticketMeshes = new Map<Dish, THREE.Mesh>();
const ticketLabels = new Map<Dish, HTMLElement>();
function ticketMesh(dish: Dish) {
  let mesh = ticketMeshes.get(dish);
  if (!mesh) {
    const kind = kindOf(dish);
    mesh = new THREE.Mesh(SHAPES[kind], toon(KIND_COLOURS[kind].colour));
    scene.add(mesh);
    ticketMeshes.set(dish, mesh);
    const label = document.createElement('span');
    label.className = 'ticket-label';
    label.dataset.ticket = dish;
    $('labels').append(label);
    ticketLabels.set(dish, label);
  }
  return mesh;
}

/** Puts every Ticket where the simulator says it is: on the Stove, in hand, or waiting. */
export function placeTickets(shift: Shift) {
  const shown = new Map<Dish, { at: THREE.Vector3; text: string }>();
  const stove = dishOnStove(shift);
  if (stove) {
    shown.set(stove.dish, {
      at: find('stove').setY(STATIONS.stove.height + 0.2),
      text: stove.dish === 'opening' ? 'Opening dish' : stove.dish,
    });
  }
  const held = heldTicket(shift);
  if (held) {
    const { facing } = chef;
    const at = chef.body.position.clone().add(new THREE.Vector3(facing.x * 0.45, 0.85, facing.z * 0.45));
    shown.set(held, { at, text: held });
  }
  for (const [station, tickets] of Object.entries(waitingTickets(shift))) {
    tickets.forEach(({ ticket, countdown }, i) => {
      const at = find(station as SimStation).setY(STATIONS[station as SimStation].height + 0.2 + i * 0.4);
      const text = station === 'oven' ? `${ticket} ${countdown ? `⏲ ${countdown}` : '✓ ready'}` : ticket;
      shown.set(ticket, { at, text });
    });
  }
  for (const [dish, mesh] of ticketMeshes) {
    if (!shown.has(dish)) mesh.visible = false;
  }
  for (const [dish, { at, text }] of shown) {
    const mesh = ticketMesh(dish);
    mesh.visible = true;
    mesh.position.copy(at);
    mesh.rotation.y = performance.now() / 900;
    const label = ticketLabels.get(dish)!;
    label.textContent = text;
  }
  for (const [dish, label] of ticketLabels) {
    label.hidden = !shown.has(dish);
    if (label.hidden) continue;
    pin(label, ticketMeshes.get(dish)!.position.clone().add(new THREE.Vector3(0, 0.35, 0)));
  }
}

// Station labels: the kitchen name, plus the real Node name while X-ray is on (X toggles it).
const stationLabels = Object.entries(STATION_NAMES).map(([station, [kitchen, node]]) => {
  const label = document.createElement('span');
  label.className = 'station-label';
  label.dataset.station = station;
  label.append(kitchen, Object.assign(document.createElement('b'), { className: 'xray', textContent: node }));
  $('labels').append(label);
  // Under the station's front edge; the Rails' labels sit on their outer sides, clear of the Stove's.
  const side = station === 'orangeRail' ? -1 : station === 'purpleRail' ? 1 : 0;
  return { label, at: find(station as StationName).add(new THREE.Vector3(side * 0.45, 0, 0.45)) };
});
export const placeStationLabels = () => stationLabels.forEach(({ label, at }) => pin(label, at.clone()));
addEventListener('keydown', (e) => {
  if (e.code === 'KeyX' && !e.repeat) document.body.classList.toggle('xray-off');
});

export function updateOverlay(shift: Shift) {
  const stove = dishOnStove(shift);
  wallLines.forEach((li, i) => li.classList.toggle('cooking', stove?.sourceLine === i + 1));
  const held = heldTicket(shift);
  $('lap').textContent = String(lap(shift));
  $('held').textContent = held ? `${held} (${KIND_COLOURS[kindOf(held)].word})` : 'nothing';
  $('mistakes').textContent = String(routingMistakes(shift));
  $('receipt').replaceChildren(
    ...receipt(shift).map((line) => Object.assign(document.createElement('li'), { textContent: line })),
  );
  if (hasEnded(shift)) {
    document.body.classList.add('closed');
    sun.intensity = 0.9;
    scene.background = new THREE.Color('#5a4d40');
    showResults(shift);
  }
}

let buzzing: { station?: StationName; until: number } = { until: 0 };
export function say(message: string, buzz?: StationName) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.toggle('buzz', buzz !== undefined);
  toast.classList.remove('show');
  void toast.offsetWidth; // restart the fade
  toast.classList.add('show');
  if (buzz !== undefined) buzzing = { station: buzz, until: performance.now() + 400 };
}

/** A refused station shakes for a moment. */
export function shake(now: number) {
  for (const [station, mesh] of stationMeshes) {
    mesh.position.x = find(station).x + (station === buzzing.station && now < buzzing.until ? Math.sin(now / 18) * 0.06 : 0);
  }
}
