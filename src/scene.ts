// The toon box kitchen: the tile grid, its stations, the Head Chef's body, the camera and the renderer.
import * as THREE from 'three/webgpu';
import { toonOutlinePass } from 'three/tsl';
import { KIND_COLOURS, type Kind, type StationName } from './legend.ts';

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
const CODES: Record<string, StationName> = {
  S: 'stove',
  o: 'orangeRail',
  p: 'purpleRail',
  O: 'oven',
  P: 'pendingShelf',
  L: 'pollPass',
  C: 'checkCounter',
  H: 'closeHatch',
};
const GREYED = '#b4b0aa';
export const STATIONS: Record<StationName, { color: string; height: number }> = {
  stove: { color: '#3d3f46', height: 0.9 },
  orangeRail: { color: KIND_COLOURS.nextTick.colour, height: 0.6 },
  purpleRail: { color: KIND_COLOURS.microtask.colour, height: 0.6 },
  oven: { color: KIND_COLOURS.timer.colour, height: 1.1 },
  pendingShelf: { color: GREYED, height: 0.6 },
  pollPass: { color: GREYED, height: 0.6 },
  checkCounter: { color: KIND_COLOURS.immediate.colour, height: 0.9 },
  closeHatch: { color: GREYED, height: 0.6 },
};
const RING: StationName[] = ['oven', 'pendingShelf', 'pollPass', 'checkCounter', 'closeHatch'];

export const cellAt = (x: number, z: number) => LAYOUT[z]?.[x];
export const stationAt = (x: number, z: number): StationName | undefined => CODES[cellAt(x, z) ?? ''];
export const find = (station: StationName) => {
  const z = LAYOUT.findIndex((row) => [...row].some((code) => CODES[code] === station));
  return new THREE.Vector3([...LAYOUT[z]!].findIndex((code) => CODES[code] === station), 0, z);
};

// Three light bands for the toon look.
const bands = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
bands.minFilter = bands.magFilter = THREE.NearestFilter;
bands.needsUpdate = true;
export const toon = (color: string) => new THREE.MeshToonNodeMaterial({ color, gradientMap: bands });

export const scene = new THREE.Scene();
scene.background = new THREE.Color('#f3e6d0');
scene.add(new THREE.AmbientLight('#ffffff', 1.2));
export const sun = new THREE.DirectionalLight('#ffffff', 2.5);
sun.position.set(-3, 10, 6);
scene.add(sun);

const box = (w: number, h: number, d: number, material: THREE.Material) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.y = h / 2;
  return mesh;
};

// Floor tiles in a checker pattern, so the grid reads at a glance.
const floor = [toon('#e9d8bb'), toon('#dcc7a5')];
export const stationMeshes = new Map<StationName, THREE.Mesh>();
LAYOUT.forEach((row, z) =>
  [...row].forEach((code, x) => {
    const tile = box(0.98, 0.1, 0.98, floor[(x + z) % 2]!);
    tile.position.set(x, -0.1, z);
    scene.add(tile);
    const station = CODES[code];
    if (!station) return;
    const mesh = box(0.9, STATIONS[station].height, 0.9, toon(STATIONS[station].color));
    mesh.position.x = x;
    mesh.position.z = z;
    stationMeshes.set(station, mesh);
    scene.add(mesh);
  }),
);

// The Stove's one hotplate: one Dish cooks at a time.
const hotplate = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 24), toon('#e04a2f'));
hotplate.position.copy(find('stove')).setY(STATIONS.stove.height + 0.03);
scene.add(hotplate);

// Conveyor arrows on the floor between consecutive Ring Counters, pointing clockwise.
const arrowMaterial = toon('#6b5a45');
RING.forEach((station, i) => {
  const from = find(station);
  const to = find(RING[(i + 1) % RING.length]!);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 3), arrowMaterial);
  arrow.position.lerpVectors(from, to, 0.5);
  arrow.scale.z = 0.1; // flat on the floor
  arrow.rotation.set(Math.PI / 2, 0, 0, 'YXZ'); // tip along +z
  arrow.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
  scene.add(arrow);
});

// The Head Chef: a body box and a hat box. Its front is +z before rotation.
export const chefBody = new THREE.Group();
chefBody.add(box(0.6, 0.8, 0.6, toon('#f7f4ee')));
const hat = box(0.4, 0.35, 0.4, toon('#ffffff'));
hat.position.y = 0.95;
const nose = box(0.12, 0.12, 0.12, toon('#f0b48a'));
nose.position.set(0, 0.55, 0.32);
chefBody.add(hat, nose);
chefBody.position.set(4, 0, 5);
scene.add(chefBody);

// The faced cell pulses; it isn't toon, so it gets no outline.
export const glow = new THREE.MeshBasicNodeMaterial({ color: '#fff36b', transparent: true, depthWrite: false });
export const highlight = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glow);
scene.add(highlight);

// Each Ticket kind has its own colour and its own silhouette, so kinds never rely on colour alone.
export const SHAPES: Record<Kind, THREE.BufferGeometry> = {
  sync: new THREE.BoxGeometry(0.42, 0.18, 0.42), // slab
  nextTick: new THREE.ConeGeometry(0.24, 0.42, 3), // pyramid
  microtask: new THREE.OctahedronGeometry(0.24), // diamond
  timer: new THREE.CylinderGeometry(0.22, 0.22, 0.14, 24), // round puck
  immediate: new THREE.TorusGeometry(0.16, 0.07, 10, 24), // ring
};

const center = new THREE.Vector3((LAYOUT[0]!.length - 1) / 2, 0, (LAYOUT.length - 1) / 2);
const camera = new THREE.OrthographicCamera();
camera.position.copy(center).add(new THREE.Vector3(6, 10, 10));
camera.lookAt(center);

export const renderer = new THREE.WebGPURenderer({
  antialias: true,
  forceWebGL: new URLSearchParams(location.search).has('webgl'),
});
renderer.setPixelRatio(devicePixelRatio);
document.body.prepend(renderer.domElement);
export const pipeline = new THREE.RenderPipeline(renderer);
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

/** Places an overlay label at a 3D point's spot on screen. */
export function pin(label: HTMLElement, at: THREE.Vector3) {
  const ndc = at.project(camera);
  label.style.left = `${((ndc.x + 1) / 2) * innerWidth}px`;
  label.style.top = `${((1 - ndc.y) / 2) * innerHeight}px`;
}
