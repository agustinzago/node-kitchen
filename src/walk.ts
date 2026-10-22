// Moving the Head Chef with the keyboard. Walking is the renderer's alone: it never reaches
// the simulator, so it costs no time.
import { cellAt, chefBody, highlight, stationAt, STATIONS } from './scene.ts';

const SPEED = 4; // tiles per second
const CHEF_HALF = 0.3; // half the Head Chef's footprint, in tiles

const solid = (x: number, z: number) => cellAt(x, z) !== '.'; // off the grid is solid too
const blocked = (x: number, z: number) =>
  [-CHEF_HALF, CHEF_HALF].some((dx) =>
    [-CHEF_HALF, CHEF_HALF].some((dz) => solid(Math.round(x + dx), Math.round(z + dz))),
  );

/** The Head Chef: where it stands, the way it faces, and the cell it faces. */
export const chef = { body: chefBody, facing: { x: 0, z: -1 }, faced: { x: 4, z: 4 } };

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

export function walk(dt: number) {
  const { facing, faced } = chef;
  let dx = 0;
  let dz = 0;
  for (const code of held) {
    dx += KEYS[code]![0];
    dz += KEYS[code]![1];
  }
  if (dx || dz) {
    const step = (SPEED * dt) / Math.hypot(dx, dz);
    const p = chef.body.position;
    if (!blocked(p.x + dx * step, p.z)) p.x += dx * step;
    if (!blocked(p.x, p.z + dz * step)) p.z += dz * step;
    Object.assign(facing, Math.abs(dx) >= Math.abs(dz) ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dz) });
    chef.body.rotation.y = Math.atan2(facing.x, facing.z);
  }
  faced.x = Math.round(chef.body.position.x) + facing.x;
  faced.z = Math.round(chef.body.position.z) + facing.z;
  const station = stationAt(faced.x, faced.z);
  highlight.visible = cellAt(faced.x, faced.z) !== undefined;
  const height = (station ? STATIONS[station].height : 0) + 0.06;
  highlight.scale.set(1.04, height, 1.04);
  highlight.position.set(faced.x, height / 2 - 0.02, faced.z);
}
