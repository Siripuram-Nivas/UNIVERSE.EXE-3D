# Launch guide (manual steps, checklists, demo script)

Nothing here has been run in a real browser or deployed yet. Each box is for **you** to tick after you have seen it work.

## 1. Deploy to Vercel (no AI, no cost)
1. Push is already on GitHub: `Siripuram-Nivas/UNIVERSE.EXE-3D`.
2. vercel.com, Add New Project, import the repo. Framework preset: Vite (build `npm run build`, output `dist`). Leave environment variables empty.
3. Deploy. `api/compile.ts` becomes `/api/compile`. With no variables it answers 503 "not enabled" and the app shows "AI (not configured)".
4. No `vercel.json` is needed: the app has no client-side routes, so there is no SPA fallback to protect `/api`.
5. If the function fails to start in the Vercel logs with a module-not-found error, the cause is the `.js` import suffixes in `api/compile.ts` and `src/reality/*` (TypeScript ESM convention). Report the log line and it is a one-line fix. This could not be tested without a deployment.

## 2. Enable AI later (optional, costs money)
1. At your provider, set a **hard monthly spend limit** and usage alerts first.
2. In Vercel, set `AI_ENABLED=true`, `OPENAI_API_KEY`, `OPENAI_MODEL` (Production only). Never use a `VITE_` prefix.
3. Add a Vercel Firewall rate-limit rule for `/api/compile` (the in-code limit is per instance and not reliable).
4. Redeploy. Try one sentence, e.g. "when a cube hits the floor, make everything bouncy for 5 seconds". Only after a rule is previewed, activated and seen working in the 3D chamber can this be called AI verified.
5. For a public demo that must cost nothing, leave `AI_ENABLED` unset.

## 3. Browser checklist (desktop, Chrome or Edge)
Open the console first; note any red errors.
- [ ] Chamber renders, objects fall and settle; drag orbits, wheel zooms
- [ ] `reverse gravity` lifts resting objects; `zero gravity` drifts; `normal gravity` drops
- [ ] `freeze time` freezes objects, reactor and stars; `resume time` continues from the same positions
- [ ] Select an object by click and with `[` `]`; Throw, Push, Nudge move it
- [ ] Recipes: add Chain Reaction (two spheres colliding spawn a sphere), Quantum Kick (sphere hits cube, flies up), Gravity Glitch (cube hits floor, gravity reverses 3 s)
- [ ] Challenges: Gravity Escape (wait about 5 s, then `reverse gravity`), Chain Reaction (select lone sphere, Nudge +X), Quantum Launch (select sphere, Nudge +X). Each shows "Reality solved". Reversing at the start of Gravity Escape must NOT solve it
- [ ] Exit a challenge: sandbox returns as it was
- [ ] Save to slot 1, Reset world, Load slot 1; corrupt the slot in dev tools, reload: shows corrupted
- [ ] Clap control: Enable, allow, clap flips gravity; deny permission: shows denied; Disable: recording indicator disappears
- [ ] No red console errors during all of the above

## 4. Responsive checklist
Resize to 1440, 1024, 768, 390 px wide (or use device mode).
- [ ] 3D chamber stays visible; no horizontal scrollbar
- [ ] Top bar fits without overlapping (at 390 px the status shows an icon only)
- [ ] Side panels collapse with the two toggle buttons; open panel does not hide the command bar
- [ ] Challenge HUD does not cover the panels; success card fits the screen
- [ ] Buttons are tappable (40 px or more on touch screens)
Mobile performance is not promised until tested on a phone.

## 5. Post-deployment checklist (public URL)
- [ ] URL loads; WebGL initializes; scene interactive
- [ ] Physics, recipes, all three challenges, save/load work (section 3)
- [ ] Console has no blocking errors
- [ ] `GET /api/compile` returns `{"configured":false}` when AI is off
- [ ] (Only if enabled) one live compile previews, activates and runs

## 6. Three-minute demo script (record the real app only)
Use only these proven rule shapes: spheres/cubes colliding, cube hitting floor, effects spawn / impulse / gravity / bounciness / burst. Rehearse once first.
| Time | Show | Say |
|---|---|---|
| 0:00-0:20 | Idle chamber, slow orbit | "UNIVERSE.EXE is a 3D lab where you rewrite the laws of physics and watch them run." |
| 0:20-0:50 | Spawn objects, `reverse gravity`, `freeze time`, resume | "Gravity and time are real parameters of a Rapier physics world." |
| 0:50-1:25 | Challenges, Gravity Escape: fail by reversing too early, then solve | "Success is a real sensor event, not a button." |
| 1:25-1:55 | Sandbox, add Chain Reaction, collide two spheres | "A collision rule: when two spheres collide, spawn a third. Cooldowns and caps keep it stable." |
| 1:55-2:25 | Rule builder: WHEN cube hits floor THEN bounciness for 5 s. If AI is enabled and verified, type the sentence instead and show the preview | "Language or the builder produces a validated rule. Nothing runs without validation and confirmation." |
| 2:25-2:45 | Save to a slot, reset, load; or clap to flip gravity if it works on your mic | "Worlds save locally and restore." |
| 2:45-3:00 | Orbit shot | "Built spec-first with Kiro: specs for each milestone, steering rules to keep it real 3D and honest." |

Label the Compiler segment accurately: "manual rule builder" unless AI has been verified.

## 7. Filming checklist
- [ ] 1080p screen recording of the real running app (browser at 1280x720 or larger, zoom 100%)
- [ ] Close other tabs and notifications; clear the console
- [ ] Voice-over or captions; **no copyrighted music** (use silence or music you own or that is licensed for reuse)
- [ ] Under 3:00; upload to YouTube as Public; check it plays while logged out
- [ ] Do not show API keys or the `.env` file

## 8. Submission checklist
- [ ] Public GitHub repo with source (done: `Siripuram-Nivas/UNIVERSE.EXE-3D`)
- [ ] Root `.kiro/` folder tracked (done: specs and steering)
- [ ] **Open-source LICENSE file (missing; you must choose the license)**
- [ ] Public working URL
- [ ] Public YouTube demo under 3 minutes
- [ ] Devpost text (draft below) and category: Frankenstein
- [ ] Third-party material: no fonts, images, music or models are bundled; npm dependencies keep their own licenses

## 9. Devpost description (draft, edit freely)
**UNIVERSE.EXE: Hack Reality.** A real-time 3D physics lab (Three.js, React Three Fiber, Rapier) where you change gravity and time, build WHEN/THEN physics rules, and solve three physics challenges whose goals are real collision-sensor events. A deterministic, validated rule engine runs every rule; an optional language model can only propose rules in a strict schema, which are re-validated and previewed before activation. Saves, challenges and recipes work with no AI at all.
**Frankenstein angle:** it stitches a game engine's physics, a rule compiler, a language model and human-input controls (microphone clap) into one creature.
**How we used Kiro:** each milestone began as a spec (`.kiro/specs/*`: requirements, design, tasks) that fixed scope and deferred later work; steering (`.kiro/steering/project.md`) enforced "real 3D only, no fake AI, validated rules, state in the store"; the agent worked from those documents milestone by milestone.
**Limitations:** blink control was deferred; AI compilation needs a server key and is off by default.
