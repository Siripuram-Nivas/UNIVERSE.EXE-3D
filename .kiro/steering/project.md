---
inclusion: always
---
# UNIVERSE.EXE project rules
- Real 3D only: R3F + Rapier. No 2D/CSS fakes. The reactor is decorative; do not claim it exerts gravity.
- Palette: #08060E #240D42 #A259FF #F5B5D2; actions #FF5A1F #FFD83D #B7FF2A; text #F7F2FF #B9A9CC; panel #160D25. About 80% dark, 20% accents.
- State lives in `src/store.ts`; per-frame work must mutate refs, not React state.
- The command interpreter is deterministic; never present it as AI. No arbitrary code execution, no keys in the client.
- Stay within the authorised milestone (currently Milestone 1). Make small, targeted changes; avoid new dependencies.
- Checks: `npm run build` (tsc + vite).
