# 09: Publish to GitHub Pages

**What to build:** Playtesters open the slice from a public URL. A GitHub repo becomes this project's remote; the static Vite build is served by GitHub Pages with the right base path. Creating a repo is outward-facing: **ask the user before creating it**, and confirm whether it is public or private and its name. Don't add GitHub Actions CI yet (out of scope for the slice), unless Pages' own deploy workflow is the simplest way to publish.

**Blocked by:** 06 (X-ray toggle), 07 (Predict board and pre-service card), 08 (Replay with explanations)

**Status:** ready-for-agent

- [ ] The user approved the repo name and visibility before it was created
- [ ] The repo exists and this project pushes to it
- [ ] The Pages URL loads the slice, and the boss Shift is playable end to end there, including on a browser without WebGPU
- [ ] The URL is recorded in the spec's Further Notes for the playtest
- [ ] The check command passes before publishing
