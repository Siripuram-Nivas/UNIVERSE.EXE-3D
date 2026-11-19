# First Experience and Sharing — Requirements

1. A new user reaches a real, physics-changing moment in under 30 seconds with no key, login or backend ("Break Reality").
2. The moment is a real rule run by the existing engine (gravity flips in the Rapier world, then reverts), with effects fired only after success.
3. After it: Replay, Explore Sandbox, Try Challenges. The user's sandbox is stashed and restored.
4. Shared worlds: a URL fragment carries a compact, validated world (limits: 30 objects, 6 rules, 4000 chars). Preview, Play, Replay, Remix, Exit. Bad or oversized links show a clear error. No code is ever executed; no database or account.
5. Works on static hosts (Render Static Site).
6. No change to the renderer, the challenges or the existing rule schema.
