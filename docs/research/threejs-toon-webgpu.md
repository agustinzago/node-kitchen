# Three.js toon look on WebGPURenderer (checked against r186, 2026-10-21)

Source: the `three@0.186.1` npm tarball (published 2026-09-24) and the GitHub tag `r186`. Nothing below was run in a browser.

- **Versions.** `three@0.186.1` and `@types/three@0.186.0` (2026-09-11, needs TS ≥ 5.6). The patch versions don't line up, so pin both to the same minor: `three@~0.186.1`, `@types/three@~0.186.0`.
- **Material.** `import { MeshToonNodeMaterial } from 'three/webgpu'`.
- **Outline.** `import { toonOutlinePass } from 'three/tsl'`. Signature: `toonOutlinePass(scene, camera, color = new Color(0,0,0), thickness = 0.003, alpha = 1)`. Only meshes with a toon material are outlined. Official example: [webgpu_materials_toon.html](https://github.com/mrdoob/three.js/blob/r186/examples/webgpu_materials_toon.html).
  ```js
  import * as THREE from 'three/webgpu';
  import { toonOutlinePass } from 'three/tsl';
  const renderer = new THREE.WebGPURenderer({ antialias: true });
  const renderPipeline = new THREE.RenderPipeline(renderer);
  renderPipeline.outputNode = toonOutlinePass(scene, camera);
  // in the loop: renderPipeline.render();
  ```
- **`RenderPipeline` vs `PostProcessing`.** `PostProcessing` was renamed `RenderPipeline` in r183. The old name still works but warns, so older tutorials use it.
- **Fallback.** `WebGPURenderer` falls back to WebGL 2 on its own when WebGPU init fails; `forceWebGL: true` forces WebGL 2. Init is async: `await renderer.init()` or use `setAnimationLoop`. The toon material and outline pass contain no WebGPU-only code, so they should work on the fallback. That's inferred from the source, not tested.
- **Don't use.**
  - The classic `OutlineEffect`: it is WebGLRenderer only.
  - `three/addons/tsl/display/OutlineNode.js`: it draws selection outlines, not toon outlines.
- **Imports.** Import everything from `three/webgpu`, never mixed with `'three'`. Mixing them gives two class sets and breaks `instanceof` and the types. The `three/webgpu` and `three/tsl` subpaths need `moduleResolution` set to `bundler`, `node16` or `nodenext`.
