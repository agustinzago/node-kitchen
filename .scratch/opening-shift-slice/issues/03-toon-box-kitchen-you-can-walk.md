# 03: Toon box kitchen you can walk around

**What to build:** Opening the page shows the kitchen in the final game's look, built from boxes. It's drawn with Three.js `WebGPURenderer` (falling back to WebGL 2 on its own), toon material and a toon outline, from a fixed isometric three-quarter camera with the whole kitchen on screen. The layout is a tile grid: the Stove with one burner in the middle, the orange and purple Rails beside it, and the Ring's five Counters clockwise with a conveyor arrow. The Oven and Check counter are active; the Pending shelf, Poll pass and Close hatch are greyed out. The Head Chef is a box character the player moves freely with the keyboard; it collides with the grid, and the cell it faces is highlighted. Follow `docs/research/threejs-toon-webgpu.md` for the API (import only from `three/webgpu` and `three/tsl`, pin `three` and `@types/three` to the same minor).

**Blocked by:** 01 (Project skeleton and level check)

**Status:** ready-for-agent

- [ ] The kitchen renders with the toon look and outlines
- [ ] It runs on WebGPU and on forced WebGL 2
- [ ] The Head Chef moves with the keyboard, can't walk through stations, and the faced cell is visibly highlighted
- [ ] All five Counters are on the Ring in clockwise order with a direction arrow; three are visibly greyed out
- [ ] A Playwright smoke test loads the page, moves the Head Chef with the keyboard, and asserts the position changed (through a test hook exposed only in test builds)
- [ ] The check command still passes
