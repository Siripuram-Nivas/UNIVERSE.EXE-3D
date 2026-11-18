# Launch Protocol — Requirements (Milestone 4)

Release hardening only. No new mechanics, puzzles, providers or social features.

1. **Baseline** — `npm ci`, `npm test`, `npm run build`, `npm audit --omit=dev` are run and reported honestly.
2. **Challenge integrity** — Goal events from objects that are not in the current world are ignored; progress never leaks between levels; stale visual events are cleared on world replacement.
3. **AI endpoint is off by default** — Requires `AI_ENABLED=true` plus key and model; rejects cross-site browser requests and oversized bodies; no provider call otherwise. In-memory limits are documented as best effort; provider budget caps and a Vercel Firewall rule are the durable controls.
4. **Deployment** — Deploys to Vercel with no environment variables and no config file; missing AI credentials degrade to a clear message.
5. **UX** — No top-bar overflow at 390 px; challenge HUD does not cover side panels; touch targets are at least 40 px on coarse pointers; status is not colour-only.
6. **Performance** — Measure bundle composition; split the 3D payload so the interface paints first. No quality reduction.
7. **Compliance docs** — README release-status table, launch guide with manual checklists, demo script, Devpost draft, Kiro usage; LICENSE flagged as a blocker for the owner.
8. **Honest states** — CODE / BROWSER / PRODUCTION / AI / HACKATHON READY are reported separately.
