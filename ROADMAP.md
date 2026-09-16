# Roadmap / Pipeline

Backlog for growing the vertical slice toward the full design brief, informed by what makes comparable short-session strategy games work. Ordered roughly by leverage — highest-impact-per-effort first within each section.

## Research notes (what to steal, and why)

**[The Battle of Polytopia](https://www.pixelatedplaygrounds.com/sidequests/game-design-perspective-the-battle-of-polytopia)** — the closest sibling to this game. Its addictiveness comes from *ruthless compression*: the entire 4X genre reduced in space, time, economy, and combat until a full campaign fits in ten minutes, plus tribes that visibly change the correct opening moves, not just flavor text. **Applied:** this pass wired Guild strengths into real mechanics (fix #4) instead of leaving them cosmetic — the single biggest gap versus Polytopia's model. Still short of the bar: Polytopia tribes each unlock a different tech at the start; ours only shift a trait number and one hook. See "Guild identity" below.

**[Into the Breach](https://www.gamedeveloper.com/design/reimagining-failure-in-strategy-game-design-in-i-into-the-breach-i-)** — perfect information, tiny toolset, every tool matters. Its key insight for failure design: the game isn't asking you to dominate the turn, just to survive it cleanly enough that the next one stays solvable. **Applied:** Founder retreat-on-loss (improvement #2) is a direct lift of this — losing a Challenge now relocates you to keep playing instead of just draining a resource. **Not yet applied:** Into the Breach's rival telegraphing is *exact*, and the uncertainty is entirely in your own combinatorics. We inverted that (uncertain telegraphing, gated by Vision) because our threat is a single opposing economy rather than a puzzle — worth watching whether playtesters find the fuzziness frustrating rather than tense; if so, tune `perceivedRivalIntent`'s accuracy curve up.

**[Dorfromantik](https://dorfromantik.fandom.com/wiki/How_to_play_guide_for_Dorfromantik)** — a calm exploration loop built entirely around never letting procedural generation trap the player: perfect-placement tiles refill your stack, quests drip-feed goals, and the community consensus is that a good run "avoids building a map so awkward future tiles have nowhere good to go." **Applied:** the Beacon-softlock fix (fix #3) is exactly this discipline — guarantee the generator never produces an unwinnable board. **Not yet applied:** Dorfromantik's quest-drip-feed is a stronger pacing tool than our current "explore until you stumble onto plot" — see "Momentum-of-progress feedback" below.

## Pipeline

### Now (next session)
1. **Guild identity beyond one stat hook.** Give each Guild a distinct opening capability, not just a cost/reveal modifier — e.g. Pathfinders start with one tile pre-revealed near a ruin; Forgeborn start with Workshops already unlocked; Unbroken take reduced founding cost when rebuilding after losing a settlement; Keepers' routes can't be severed by a lost Challenge. This is the Polytopia lesson: the guild should change your first three decisions, not just your combat math.
2. **Second and third Guardian/Beacon.** Tidekeeper (trade/adaptation theme) and Rootfather (stewardship theme) are the next-best value adds — they unlock the "which ending are we building toward" tension the brief's five endings depend on, and validate that the guardian-encounter code generalizes past Emberhorn's numbers.
3. **Mode select screen** (Quick Journey / Founder's Quest / Long Road) — currently only Quick Journey's map size exists; this is mostly plumbing (map radius + Beacon count params already exist in `createNewGame`) so it's cheap relative to its Definition-of-Done weight.
4. **Automated balance simulation harness.** Headless `game/actions.ts` was built pure specifically to make this possible — a script that runs N seeded campaigns per Guild/strategy and reports win rates would catch snowball issues (e.g. is Forgeborn's route discount + Living Infrastructure too strong once stacked?) before a human ever needs to grind it out.

### Next (after the above)
5. **Momentum-of-progress feedback** (Dorfromantik-style pacing). Right now the only mid-game signal is Momentum going up. Add 2–3 lightweight "waypoint" quests per campaign (e.g. "connect 3 settlements," "reach a City") that reward a small Momentum burst and a journal entry — cheap to build on top of the existing journal system, and it gives players something to aim at between Beacon-scale goals.
6. **Founder's Quest full story arc** — the remaining Guardians/endings (Glass Wing, Hollow Crown) and the Empire/Alliance/Steward/Silence/Hidden ending logic, which currently only has the single "activate Beacon" victory.
7. **Asynchronous daily-seeded challenge** (Phase 1 of the multiplayer roadmap) — lowest-risk multiplayer-adjacent feature since it reuses the existing seeded-RNG architecture with zero server-authoritative logic needed.

### Later
8. Supabase-backed save sync + leaderboard for the daily seed (the anon key is already wired into `.env.local`; needs a `saves`/`runs` table and a thin API layer).
9. Composed adaptive music layers to replace the placeholder synthesized ambience.
10. Native app shell (Capacitor) — the architecture (`src/game/` has zero DOM/React dependency) was built to make this a wrapper exercise, not a rewrite.

## Known limitations as of this pass

- Only 1 of 5 Guardians/Beacons, 1 of 4 Guilds has more than a stat-level identity, 1 of 3 campaign lengths selectable.
- No automated balance simulation has been run — items above were validated by manual play and code review only.
- Guardian challenge flow was verified by code review and type-checking, not a full live playthrough (the Beacon is several turns away from the start by design).
- No Supabase wiring yet — the credentials are stored in `.env.local` (git-ignored) but nothing reads them.
