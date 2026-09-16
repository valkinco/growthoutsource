# Growthbound: The Last Signal

A small, original turn-based strategy game. A world was disconnected by the Great Silence; you carry the last surviving Signal and must explore, connect, and rebuild — deciding along the way whether growth becomes domination or shared prosperity.

Built with React + TypeScript + Vite, rendered on an HTML canvas hex grid. Game logic lives entirely in `src/game/` as pure, deterministic, seed-driven functions with no rendering or DOM dependencies — this is what lets campaigns be reproduced from a seed, tested headlessly, and eventually reused in a native app shell.

## Status: vertical slice

This is the first playable slice, not the full design document scope:

- One procedurally generated hex map (seeded, fairness-checked start)
- The Veil (fog of war: hidden / clue / revealed)
- One Founder, one starting settlement, Momentum economy
- The four actions: Explore, Build, Connect, Challenge
- One rival faction (The Iron Ledger), one Guardian (Emberhorn), one Beacon
- Four founder traits, four guilds, a 16-node Growth Tree across 4 branches
- PUSH / BUILD / ENDURE challenge resolution
- A short story arc delivered through the journal and key encounters
- Mobile-first controls (drag/pinch/tap), localStorage save + refresh recovery
- Lightweight synthesized audio (no external assets), with persisted Music/Sound toggles

Not yet built: additional guilds' asymmetric mechanics beyond trait bonuses, the remaining four Guardians/Beacons, Quick/Founder's Quest/Long Road mode selection, multiplayer, Supabase-backed saves/leaderboards, and the full opening cinematic.

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
