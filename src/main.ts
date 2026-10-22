/// <reference types="vite/client" />
import * as THREE from 'three/webgpu';
import { toonOutlinePass } from 'three/tsl';

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
type Station = { name: string; color: string; height: number };
const GREYED = '#b4b0aa';
const STATIONS: Record<string, Station> = {
  S: { name: 'Stove', color: '#3d3f46', height: 0.9 },
  o: { name: 'orange rail', color: '#f08a24', height: 0.6 },
  p: { name: 'purple rail', color: '#8e5bd6', height: 0.6 },
  O: { name: 'Oven', color: '#3f7fd9', height: 1.1 },
  P: { name: 'Pending shelf', color: GREYED, height: 0.6 },
  L: { name: 'Poll pass', color: GREYED, height: 0.6 },
  C: { name: 'Check counter', color: '#f2b52c', height: 0.9 },
  H: { name: 'Close hatch', color: GREYED, height: 0.6 },
};
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
scene.add(chef);

// The faced cell pulses; it isn't toon, so it gets no outline.
const glow = new THREE.MeshBasicNodeMaterial({ color: '#fff36b', transparent: true, depthWrite: false });
const highlight = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glow);
scene.add(highlight);

const center = new THREE.Vector3((LAYOUT[0]!.length - 1) / 2, 0, (LAYOUT.length - 1) / 2);
const camera = new THREE.OrthographicCamera();
camera.position.copy(center).add(new THREE.Vector3(6, 10, 10));
camera.lookAt(center);

const renderer = new THREE.WebGPURenderer({
  antialias: true,
  forceWebGL: new URLSearchParams(location.search).has('webgl'),
});
renderer.setPixelRatio(devicePixelRatio);
document.body.append(renderer.domElement);
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

const KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};
const held = new Set<string>();
addEventListener('keydown', (e) => {
  if (!KEYS[e.code]) return;
  e.preventDefault();
  held.add(e.code);
});
addEventListener('keyup', (e) => held.delete(e.code));
addEventListener('blur', () => held.clear());

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
  const x = Math.round(chef.position.x) + facing.x;
  const z = Math.round(chef.position.z) + facing.z;
  const code = cellAt(x, z);
  highlight.visible = code !== undefined;
  const height = (STATIONS[code ?? '']?.height ?? 0) + 0.06;
  highlight.scale.set(1.04, height, 1.04);
  highlight.position.set(x, height / 2 - 0.02, z);
}

await renderer.init();

declare global {
  interface Window {
    __kitchen?: { backend: string; chef(): { x: number; z: number }; facing(): { x: number; z: number } };
  }
}
if (import.meta.env.MODE === 'e2e') {
  window.__kitchen = {
    backend: (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL 2',
    chef: () => ({ x: chef.position.x, z: chef.position.z }),
    facing: () => ({ x: Math.round(chef.position.x) + facing.x, z: Math.round(chef.position.z) + facing.z }),
  };
}

let last = performance.now();
renderer.setAnimationLoop((now) => {
  walk(Math.min((now - last) / 1000, 0.1));
  last = now;
  glow.opacity = 0.45 + 0.2 * Math.sin(now / 150);
  pipeline.render();
});
