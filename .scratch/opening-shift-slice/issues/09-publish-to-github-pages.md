# 09: Publish to GitHub Pages

**What to build:** Playtesters open the slice from a public URL. The public repo `agustinzago/node-kitchen` already exists (created at the user's request when the slice PR was opened). Serve the static Vite build from GitHub Pages with the right base path. Enabling Pages is outward-facing: ask the user before turning it on. Don't add GitHub Actions CI yet (out of scope for the slice), unless Pages' own deploy workflow is the simplest way to publish.

**Blocked by:** 06 (X-ray toggle), 07 (Predict board and pre-service card), 08 (Replay with explanations)

**Status:** ready-for-agent

- [ ] The user approved enabling Pages
- [ ] The Pages URL loads the slice, and the boss Shift is playable end to end there, including on a browser without WebGPU
- [ ] The URL is recorded in the spec's Further Notes for the playtest
- [ ] The check command passes before publishing
