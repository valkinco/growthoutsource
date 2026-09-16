# Roadmap / Pipeline

Backlog for growing the vertical slice toward the full design brief, informed by what makes comparable short-session strategy games work. Ordered roughly by leverage — highest-impact-per-effort first within each section.

## Research notes (what to steal, and why)

**[The Battle of Polytopia](https://www.pixelatedplaygrounds.com/sidequests/game-design-perspective-the-battle-of-polytopia)** — the closest sibling to this game. Its addictiveness comes from *ruthless compression*: the entire 4X genre reduced in space, time, economy, and combat until a full campaign fits in ten minutes, plus tribes that visibly change the correct opening moves, not just flavor text. **Applied:** Guild strengths are now real mechanics (reveal radius, route/upgrade cost, comeback bonus, loss mitigation), and — per a second research pass confirming ["each tribe has a unique starting technology"](https://polytopia.fandom.com/wiki/Tribes) — each Guild now also opens with a free tier-1 tech in its signature branch (Pathfinders: Surveying, Forgeborn: Workshops, Keepers: Trade, Unbroken: Negotiation), shown right on the selection card the way Polytopia shows a tribe's tech upfront.

**[Into the Breach](https://www.gamedeveloper.com/design/reimagining-failure-in-strategy-game-design-in-i-into-the-breach-i-)** — perfect information, tiny toolset, every tool matters. Its key insight for failure design: the game isn't asking you to dominate the turn, just to survive it cleanly enough that the next one stays solvable. **Applied:** Founder retreat-on-loss is a direct lift of this — losing a Challenge relocates you to keep playing instead of just draining a resource. **Not yet applied:** Into the Breach's rival telegraphing is *exact*; ours is deliberately fuzzy (gated by Vision) since our threat is an opposing economy, not a puzzle — watch whether playtesters find that uncertain-telegraph frustrating rather than tense, and tune `perceivedRivalIntent`'s accuracy curve if so.

**[Dorfromantik](https://dorfromantik.fandom.com/wiki/How_to_play_guide_for_Dorfromantik)** — a calm exploration loop built entirely around never letting procedural generation trap the player. **Applied:** the Beacon-softlock fix guarantees the generator never produces an unwinnable board. **Not yet applied:** Dorfromantik's quest-drip-feed is a stronger pacing tool than our current "explore until you stumble onto plot" — see "Momentum-of-progress feedback" below.

## What shipped in the visuals/multiplayer pass

- **Pseudo-3D hex rendering**: beveled tiles with a raised top face and darker side walls, per-terrain iconography (trees, snow-capped peaks, water ripples, a beacon glow), settlement "huts" that visibly grow with level, and a guild-colored Founder token — all vector, no image assets, so it stays cheap on mobile.
- **Juice pass**: newly revealed tiles pop in with an ease-out-back scale animation; settlements flash a expanding ring when they level up; key mobile events (reveal, challenge trigger, win/loss) fire `navigator.vibrate` haptics where supported.
- **Score breakdown on the end screen** (settlements + tech + banked Momentum + a speed bonus for a fast win) — Polytopia-style "beat your own score" hook for replayability.
- **Async 2-player mode**, Words-With-Friends style: two humans share one seeded map and race to the same Beacon, alternating turns via a Supabase-backed room (5-letter join code). Built by generalizing the entire engine to be side-indexed (`founders`, `momentum`, `guilds`, `traits`, `unlockedTech` all keyed by `PlayerId`) rather than assuming a single human player — this is what makes Solo (vs AI) and 2-Player share one implementation instead of forking the codebase.

### 2-player PvP: resolved via "standing posture"

Founder-vs-Founder Challenges now work in multiplayer: each side sets a default Push/Build/Endure response (the "Standing Order" button, changeable freely on your own turn) that's used if your rival challenges one of your settlements before your next turn. The attacker still only gets a Vision-gated fuzzy read on it (via `perceivedOpponentMove` in `ai.ts`), same uncertainty model as against the Solo AI — they don't just see the stored value outright. The defender's score in that resolution uses their real traits/guild bonuses, not a flattened placeholder, so it's not just "whoever attacks wins by default."

Not yet verified: this was implemented and reviewed but not exercised through a full live 2-player game (blocked on `supabase/migrations/0001_games.sql` not being run yet — see below). Test as soon as multiplayer is reachable end-to-end: does the default 'endure' posture make new settlements too easy or too hard to take early on? May need per-Guild default postures instead of one global default.

The Veil (fog of war) is also **shared world state** between the two players by design in this pass — exploring near your rival's camp reveals it to both of you. That's a co-opetition choice (shared unknown, competing goal), not a bug, but it does mean a very exploration-heavy opponent partially benefits you too. Worth watching in actual play before deciding whether to split it into per-side veils.

## Pipeline

### Now (next session)
1. **Verify 2-player PvP live** once the Supabase migration is run — the standing-posture mechanic above is implemented and reviewed but has never been exercised through an actual two-device game.
2. **Second and third Guardian/Beacon.** Tidekeeper (trade/adaptation theme) and Rootfather (stewardship theme) are the next-best value adds — they unlock the "which ending are we building toward" tension the brief's five endings depend on, and validate that the guardian-encounter code generalizes past Emberhorn's numbers.
3. **Mode select screen** (Quick Journey / Founder's Quest / Long Road) — currently only Quick Journey's map size exists; this is mostly plumbing (map radius + Beacon count params already exist in `createNewGame`) so it's cheap relative to its Definition-of-Done weight.
4. **Automated balance simulation harness.** Headless `game/actions.ts` was built pure specifically to make this possible — a script that runs N seeded campaigns per Guild/strategy and reports win rates would catch snowball issues (e.g. is Forgeborn's route discount + Living Infrastructure + free Workshops too strong once stacked?) before a human ever needs to grind it out.

### Next (after the above)
5. **Momentum-of-progress feedback** (Dorfromantik-style pacing). Add 2–3 lightweight "waypoint" quests per campaign (e.g. "connect 3 settlements," "reach a City") that reward a small Momentum burst and a journal entry.
6. **Founder's Quest full story arc** — the remaining Guardians/endings (Glass Wing, Hollow Crown) and the Empire/Alliance/Steward/Silence/Hidden ending logic, which currently only has the single "activate Beacon" victory.
7. **Realtime presence for 2-player** — right now it's poll-based (every 4s while waiting on the opponent); a Supabase Realtime channel subscription would make the handoff feel instant without extra server logic.

### Later
8. Supabase-backed save sync + leaderboard for a daily seeded Solo challenge (same infra as the `games` table, different shape).
9. Composed adaptive music layers to replace the placeholder synthesized ambience.
10. Native app shell (Capacitor) — the architecture (`src/game/` has zero DOM/React dependency) was built to make this a wrapper exercise, not a rewrite.

## Known limitations as of this pass

- Only 1 of 5 Guardians/Beacons, only 1 of 3 campaign lengths selectable.
- No automated balance simulation has been run — items above were validated by manual play and code review only.
- Guardian challenge flow was verified by code review and type-checking, not a full live playthrough (the Beacon is several turns away from the start by design).
- 2-player mode has no direct combat (see above) and shares fog-of-war state between both players.
- `supabase/migrations/0001_games.sql` must be run manually in the Supabase SQL Editor before 2-player mode will work — the anon key can't run DDL.
