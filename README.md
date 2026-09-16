# Growthbound: The Last Signal

A small, original turn-based strategy game. A world was disconnected by the Great Silence; you carry the last surviving Signal and must explore, connect, and rebuild — deciding along the way whether growth becomes domination or shared prosperity.

Built with React + TypeScript + Vite, rendered on an HTML canvas hex grid. Game logic lives entirely in `src/game/` as pure, deterministic, seed-driven functions with no rendering or DOM dependencies — this is what lets campaigns be reproduced from a seed, tested headlessly, and eventually reused in a native app shell.

## Status: vertical slice

This is the first playable slice, not the full design document scope:

- One procedurally generated hex map (seeded, fairness-checked start — including a guaranteed-passable Beacon approach)
- The Veil (fog of war: hidden / clue / revealed), with a pseudo-3D beveled hex renderer, terrain iconography, and pop/flash animations for reveals and settlement level-ups
- One Founder, one starting settlement, Momentum economy
- The four actions: Explore, Build, Connect, Challenge
- One rival faction (The Iron Ledger), one Guardian (Emberhorn), one Beacon
- Four founder traits, four guilds each with a real mechanical identity (reveal/cost/comeback/loss-mitigation hooks) *and* a unique starting tech, a 16-node Growth Tree across 4 branches
- PUSH / BUILD / ENDURE challenge resolution, with Vision-gated uncertainty on the rival's telegraphed move
- A short story arc delivered through the journal and key encounters
- Mobile-first controls (drag/pinch/tap), localStorage save + refresh recovery, haptic feedback on supported devices
- Lightweight synthesized audio (no external assets), with persisted Music/Sound toggles
- **Async 2-player mode**: two humans share a seeded map via a Supabase-backed room (join code), alternating turns — see [ROADMAP.md](ROADMAP.md) for the "no direct PvP yet" scope cut and the migration you need to run once (`supabase/migrations/0001_games.sql`)
- Post-game score breakdown (settlements + tech + Momentum + speed bonus)

Not yet built: the remaining four Guardians/Beacons, Quick/Founder's Quest/Long Road mode selection, direct Founder-vs-Founder combat in multiplayer, Supabase-backed saves/leaderboards for Solo, and the full opening cinematic. Full detail in [ROADMAP.md](ROADMAP.md).

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Outputs a static site to `dist/`, deployable as-is (e.g. to Vercel).
