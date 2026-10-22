/// <reference types="vite/client" />
import * as THREE from 'three/webgpu';
import { toonOutlinePass } from 'three/tsl';
import level from './shifts/opening-boss/level.ts';
import program from './shifts/opening-boss/program.cjs?raw';
import { showResults } from './results.ts';
import { preService } from './preservice.ts';
import type { TicketId, TicketKind } from './sim/level.ts';
import {
  act,
  dishOnStove,
  hasEnded,
  heldTicket,
  lap,
  predict,
  receipt,
  routingMistakes,
  startShift,
  waitingTickets,
  type Action,
  type Dish,
  type ShiftEvent,
  type Station as SimStation,
} from './sim/shift.ts';

// The kitchen as a tile grid, seen from above with row 0 at the back.
// The Ring runs clockwise: Oven → Pending shelf → Poll pass → Check counter → Close hatch.
const LAYOUT = [
  '..O...P..',
  '.........',
  '.........',
  'H..oSp..L',
  '.........',
  '.........',
  '....C....',
];
type Station = { name: string; color: string; height: number; sim?: SimStation };
const GREYED = '#b4b0aa';
const STATIONS: Record<string, Station> = {
  S: { name: 'Stove', color: '#3d3f46', height: 0.9 },
  o: { name: 'orange rail', color: '#f08a24', height: 0.6, sim: 'orangeRail' },
  p: { name: 'purple rail', color: '#8e5bd6', height: 0.6, sim: 'purpleRail' },
  O: { name: 'Oven', color: '#3f7fd9', height: 1.1, sim: 'oven' },
  P: { name: 'Pending shelf', color: GREYED, height: 0.6 },
  L: { name: 'Poll pass', color: GREYED, height: 0.6 },
  C: { name: 'Check counter', color: '#f2b52c', height: 0.9, sim: 'checkCounter' },
  H: { name: 'Close hatch', color: GREYED, height: 0.6 },
};
const codeOf = (sim: SimStation) => Object.keys(STATIONS).find((code) => STATIONS[code]!.sim === sim)!;
const RING = ['O', 'P', 'L', 'C', 'H'];
const SPEED = 4; // tiles per second
const CHEF_HALF = 0.3; // half the Head Chef's footprint, in tiles

const cellAt = (x: number, z: number) => LAYOUT[z]?.[x];
const solid = (x: number, z: number) => cellAt(x, z) !== '.'; // off the grid is solid too
const blocked = (x: number, z: number) =>
  [-CHEF_HALF, CHEF_HALF].some((dx) =>
    [-CHEF_HALF, CHEF_HALF].some((dz) => solid(Math.round(x + dx), Math.round(z + dz))),
  );
const find = (code: string) => {
  const z = LAYOUT.findIndex((row) => row.includes(code));
  return new THREE.Vector3(LAYOUT[z]!.indexOf(code), 0, z);
};

// Three light bands for the toon look.
const bands = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
bands.minFilter = bands.magFilter = THREE.NearestFilter;
bands.needsUpdate = true;
const toon = (color: string) => new THREE.MeshToonNodeMaterial({ color, gradientMap: bands });

const scene = new THREE.Scene();
scene.background = new THREE.Color('#f3e6d0');
scene.add(new THREE.AmbientLight('#ffffff', 1.2));
const sun = new THREE.DirectionalLight('#ffffff', 2.5);
sun.position.set(-3, 10, 6);
scene.add(sun);

const box = (w: number, h: number, d: number, material: THREE.Material) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.y = h / 2;
  return mesh;
};

// Floor tiles in a checker pattern, so the grid reads at a glance.
const floor = [toon('#e9d8bb'), toon('#dcc7a5')];
const stationMeshes: Record<string, THREE.Mesh> = {};
LAYOUT.forEach((row, z) =>
  [...row].forEach((code, x) => {
    const tile = box(0.98, 0.1, 0.98, floor[(x + z) % 2]!);
    tile.position.set(x, -0.1, z);
    scene.add(tile);
    const station = STATIONS[code];
    if (!station) return;
    const mesh = box(0.9, station.height, 0.9, toon(station.color));
    mesh.position.x = x;
    mesh.position.z = z;
    stationMeshes[code] = mesh;
    scene.add(mesh);
  }),
);

// The Stove's single burner.
const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 24), toon('#e04a2f'));
burner.position.copy(find('S')).setY(STATIONS.S!.height + 0.03);
scene.add(burner);

// Conveyor arrows on the floor between consecutive Ring Counters, pointing clockwise.
const arrowMaterial = toon('#6b5a45');
RING.forEach((code, i) => {
  const from = find(code);
  const to = find(RING[(i + 1) % RING.length]!);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 3), arrowMaterial);
  arrow.position.lerpVectors(from, to, 0.5);
  arrow.scale.z = 0.1; // flat on the floor
  arrow.rotation.set(Math.PI / 2, 0, 0, 'YXZ'); // tip along +z
  arrow.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
  scene.add(arrow);
});

// The Head Chef: a body box and a hat box. Its front is +z before rotation.
const chef = new THREE.Group();
chef.add(box(0.6, 0.8, 0.6, toon('#f7f4ee')));
const hat = box(0.4, 0.35, 0.4, toon('#ffffff'));
hat.position.y = 0.95;
const nose = box(0.12, 0.12, 0.12, toon('#f0b48a'));
nose.position.set(0, 0.55, 0.32);
chef.add(hat, nose);
chef.position.set(4, 0, 5);
const facing = { x: 0, z: -1 };
const faced = { x: 4, z: 4 };
scene.add(chef);

// The faced cell pulses; it isn't toon, so it gets no outline.
const glow = new THREE.MeshBasicNodeMaterial({ color: '#fff36b', transparent: true, depthWrite: false });
const highlight = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glow);
scene.add(highlight);

// Each Ticket kind has its own colour and its own silhouette, so kinds never rely on colour alone.
type Kind = TicketKind | 'sync';
const KINDS: Record<Kind, { colour: string; geometry: THREE.BufferGeometry }> = {
  sync: { colour: '#8d8a86', geometry: new THREE.BoxGeometry(0.42, 0.18, 0.42) }, // slab
  nextTick: { colour: '#f08a24', geometry: new THREE.ConeGeometry(0.24, 0.42, 3) }, // pyramid
  microtask: { colour: '#8e5bd6', geometry: new THREE.OctahedronGeometry(0.24) }, // diamond
  timer: { colour: '#3f7fd9', geometry: new THREE.CylinderGeometry(0.22, 0.22, 0.14, 24) }, // round puck
  immediate: { colour: '#f2b52c', geometry: new THREE.TorusGeometry(0.16, 0.07, 10, 24) }, // ring
};
const kindOf = (dish: Dish): Kind => (dish === 'opening' ? 'sync' : level.tickets[dish]!.kind);
const COLOUR_NAME: Record<Kind, string> = {
  sync: 'grey',
  nextTick: 'orange',
  microtask: 'purple',
  timer: 'blue',
  immediate: 'amber',
};
const WAITS_AT: Record<TicketKind, SimStation> = {
  nextTick: 'orangeRail',
  microtask: 'purpleRail',
  timer: 'oven',
  immediate: 'checkCounter',
};

const center = new THREE.Vector3((LAYOUT[0]!.length - 1) / 2, 0, (LAYOUT.length - 1) / 2);
const camera = new THREE.OrthographicCamera();
camera.position.copy(center).add(new THREE.Vector3(6, 10, 10));
camera.lookAt(center);

const renderer = new THREE.WebGPURenderer({
  antialias: true,
  forceWebGL: new URLSearchParams(location.search).has('webgl'),
});
renderer.setPixelRatio(devicePixelRatio);
document.body.prepend(renderer.domElement);
const pipeline = new THREE.RenderPipeline(renderer);
pipeline.outputNode = toonOutlinePass(scene, camera, new THREE.Color('#2a2118'), 0.006);

function resize() {
  const aspect = innerWidth / innerHeight;
  const half = Math.max(5.2, 7.2 / aspect); // keep the whole kitchen on screen
  Object.assign(camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();

// The seed comes from the URL when present (?seed=1 makes the Oven ready on Lap 1, ?seed=0 doesn't).
const seedParam = Number.parseInt(new URLSearchParams(location.search).get('seed') ?? '', 10);
let shift = startShift(level, Number.isNaN(seedParam) ? Math.floor(Math.random() * 2 ** 31) : seedParam);
// The card and the predict board hold the keyboard until service starts; then the Prediction is locked in.
void preService(level).then((prediction) => prediction && (shift = predict(shift, prediction)));

// The HTML overlay: the program on the wall, the HUD, the Receipt and the Ticket labels.
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
    const kind = KINDS[kindOf(dish)];
    mesh = new THREE.Mesh(kind.geometry, toon(kind.colour));
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
function placeTickets() {
  const shown = new Map<Dish, { at: THREE.Vector3; text: string }>();
  const stove = dishOnStove(shift);
  if (stove) {
    shown.set(stove.dish, {
      at: find('S').setY(STATIONS.S!.height + 0.2),
      text: stove.dish === 'opening' ? 'Opening dish' : stove.dish,
    });
  }
  const held = heldTicket(shift);
  if (held) {
    const at = chef.position.clone().add(new THREE.Vector3(facing.x * 0.45, 0.85, facing.z * 0.45));
    shown.set(held, { at, text: held });
  }
  for (const [station, tickets] of Object.entries(waitingTickets(shift))) {
    const code = codeOf(station as SimStation);
    tickets.forEach(({ ticket, countdown }, i) => {
      const at = find(code).setY(STATIONS[code]!.height + 0.2 + i * 0.4);
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

/** Places an overlay label at a 3D point's spot on screen. */
function pin(label: HTMLElement, at: THREE.Vector3) {
  const ndc = at.project(camera);
  label.style.left = `${((ndc.x + 1) / 2) * innerWidth}px`;
  label.style.top = `${((1 - ndc.y) / 2) * innerHeight}px`;
}

// Station labels: the kitchen name, plus the real Node name while X-ray is on (X toggles it).
const NODE_NAMES: Record<string, string> = {
  S: 'call stack',
  o: 'nextTick queue',
  p: 'microtask queue',
  O: 'timers phase',
  P: 'pending callbacks phase',
  L: 'poll phase',
  C: 'check phase',
  H: 'close callbacks phase',
};
const stationLabels = Object.entries(STATIONS).map(([code, { name }]) => {
  const label = document.createElement('span');
  label.className = 'station-label';
  label.dataset.station = code;
  label.append(name, Object.assign(document.createElement('b'), { className: 'xray', textContent: NODE_NAMES[code] }));
  $('labels').append(label);
  // Under the station's front edge; the Rails' labels sit on their outer sides, clear of the Stove's.
  const side = code === 'o' ? -1 : code === 'p' ? 1 : 0;
  return { label, at: find(code).add(new THREE.Vector3(side * 0.45, 0, 0.45)) };
});
const placeStationLabels = () => stationLabels.forEach(({ label, at }) => pin(label, at.clone()));
addEventListener('keydown', (e) => {
  if (e.code === 'KeyX' && !e.repeat) document.body.classList.toggle('xray-off');
});

function updateOverlay() {
  const stove = dishOnStove(shift);
  wallLines.forEach((li, i) => li.classList.toggle('cooking', stove?.sourceLine === i + 1));
  const held = heldTicket(shift);
  $('lap').textContent = String(lap(shift));
  $('held').textContent = held ? `${held} (${COLOUR_NAME[kindOf(held)]})` : 'nothing';
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

let buzzing = { code: '', until: 0 };
function say(message: string, buzz?: string) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.toggle('buzz', buzz !== undefined);
  toast.classList.remove('show');
  void toast.offsetWidth; // restart the fade
  toast.classList.add('show');
  if (buzz !== undefined) buzzing = { code: buzz, until: performance.now() + 400 };
}

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
  const code = cellAt(faced.x, faced.z) ?? '';
  const station = STATIONS[code];
  if (!station) return;
  let action: Action;
  if (code === 'S') action = { type: 'cook' };
  else if (station.sim) action = { type: heldTicket(shift) ? 'route' : 'pickUp', station: station.sim };
  else return say(`The ${station.name} is closed this Shift.`, code);

  const result = act(shift, action);
  shift = result.shift;
  for (const event of result.events) {
    if (event.type === 'ticketRefused') {
      const kind = level.tickets[event.ticket]!.kind;
      const right = STATIONS[codeOf(WAITS_AT[kind])]!.name;
      say(`Buzz! The ${station.name} refuses ${event.ticket}: ${COLOUR_NAME[kind]} Tickets wait at the ${right}.`, code);
    } else if (event.type === 'actionRefused') {
      const notYet = event.reason === 'nothingReady' && waitingTickets(shift).oven.length && code === 'O';
      say(notYet ? 'The Oven isn’t ready yet: come back next Lap.' : REFUSALS[event.reason], code);
    } else if (event.type === 'lapAdvanced') {
      say(`Lap ${event.lap}`);
    } else if (event.type === 'restaurantClosed') {
      say('No Tickets left and nothing cooking: the restaurant closes.');
    }
  }
  updateOverlay();
}

const KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};
const USE_KEYS = ['Space', 'KeyE', 'Enter'];
const held = new Set<string>();
addEventListener('keydown', (e) => {
  if (USE_KEYS.includes(e.code)) {
    e.preventDefault();
    if (!e.repeat) use();
    return;
  }
  if (!KEYS[e.code]) return;
  e.preventDefault();
  held.add(e.code);
});
addEventListener('keyup', (e) => held.delete(e.code));
addEventListener('blur', () => held.clear());

// Walking is the renderer's alone: it never reaches the simulator, so it costs no time.
function walk(dt: number) {
  let dx = 0;
  let dz = 0;
  for (const code of held) {
    dx += KEYS[code]![0];
    dz += KEYS[code]![1];
  }
  if (dx || dz) {
    const step = (SPEED * dt) / Math.hypot(dx, dz);
    const p = chef.position;
    if (!blocked(p.x + dx * step, p.z)) p.x += dx * step;
    if (!blocked(p.x, p.z + dz * step)) p.z += dz * step;
    Object.assign(facing, Math.abs(dx) >= Math.abs(dz) ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dz) });
    chef.rotation.y = Math.atan2(facing.x, facing.z);
  }
  faced.x = Math.round(chef.position.x) + facing.x;
  faced.z = Math.round(chef.position.z) + facing.z;
  const code = cellAt(faced.x, faced.z);
  highlight.visible = code !== undefined;
  const height = (STATIONS[code ?? '']?.height ?? 0) + 0.06;
  highlight.scale.set(1.04, height, 1.04);
  highlight.position.set(faced.x, height / 2 - 0.02, faced.z);
}

/** A refused station shakes for a moment. */
function shake(now: number) {
  for (const [code, mesh] of Object.entries(stationMeshes)) {
    mesh.position.x = find(code).x + (code === buzzing.code && now < buzzing.until ? Math.sin(now / 18) * 0.06 : 0);
  }
}

await renderer.init();
updateOverlay();

declare global {
  interface Window {
    __kitchen?: { backend: string; chef(): { x: number; z: number }; facing(): { x: number; z: number } };
  }
}
if (import.meta.env.MODE === 'e2e') {
  window.__kitchen = {
    backend: (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL 2',
    chef: () => ({ x: chef.position.x, z: chef.position.z }),
    facing: () => ({ ...faced }),
  };
}

let last = performance.now();
renderer.setAnimationLoop((now) => {
  walk(Math.min((now - last) / 1000, 0.1));
  last = now;
  shake(now);
  placeTickets();
  placeStationLabels();
  glow.opacity = 0.45 + 0.2 * Math.sin(now / 150);
  pipeline.render();
});
