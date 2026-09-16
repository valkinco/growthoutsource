import { generateMap } from './mapgen';
import { startingTech, startingTraits } from './guilds';
import { axialKey, type GameState, type GuildId, type Settlement, type Guardian } from './types';
import { tilesInRadius } from './hex';

const GUARDIANS: Omit<Guardian, 'q' | 'r'>[] = [
  { id: 'emberhorn', name: 'Emberhorn', theme: 'Industry and exhaustion', strength: 6, resolved: false },
];

function buildBoard(seed: string, mapRadius: number) {
  const { tiles, playerStart, rivalStart, beaconPos } = generateMap(seed, mapRadius);

  const playerSettlement: Settlement = {
    id: 'settlement-player-1',
    owner: 'player',
    q: playerStart.q,
    r: playerStart.r,
    level: 'outpost',
    specialization: null,
    connected: true,
    name: 'Home Landing',
  };
  const rivalSettlement: Settlement = {
    id: 'settlement-rival-1',
    owner: 'rival',
    q: rivalStart.q,
    r: rivalStart.r,
    level: 'outpost',
    specialization: null,
    connected: true,
    name: 'Ledger Camp',
  };

  tiles[axialKey(playerStart)].settlementId = playerSettlement.id;
  tiles[axialKey(rivalStart)].settlementId = rivalSettlement.id;

  const guardianDef = GUARDIANS[0];
  const guardian: Guardian = { ...guardianDef, q: beaconPos.q, r: beaconPos.r };
  const beaconTile = tiles[axialKey(beaconPos)];
  beaconTile.guardianId = guardian.id;
  // The opening beat promises "one distant Beacon briefly responds" within the
  // first minute — without this it stays fully hidden behind the Veil for turns.
  if (beaconTile.veil === 'hidden') beaconTile.veil = 'clue';
  beaconTile.clueHint = 'A distant pulse answers your Signal, faint but real.';

  return { tiles, playerStart, rivalStart, guardian, playerSettlement, rivalSettlement };
}

function revealAround(tiles: GameState['tiles'], center: { q: number; r: number }) {
  for (const pos of tilesInRadius(center, 1)) {
    const t = tiles[axialKey(pos)];
    if (t) t.veil = 'revealed';
  }
  for (const pos of tilesInRadius(center, 2)) {
    const t = tiles[axialKey(pos)];
    if (t && t.veil === 'hidden') t.veil = 'clue';
  }
}

export function createNewGame(seed: string, guild: GuildId, mapRadius = 6): GameState {
  const { tiles, playerStart, rivalStart, guardian, playerSettlement, rivalSettlement } = buildBoard(seed, mapRadius);
  // Solo mode: only the human's own starting area is revealed — the AI rival's
  // camp stays hidden behind the Veil like any other undiscovered territory.
  revealAround(tiles, playerStart);

  return {
    seed,
    mode: 'solo',
    turn: 1,
    phase: 'intro',
    mapRadius,
    tiles,
    settlements: {
      [playerSettlement.id]: playerSettlement,
      [rivalSettlement.id]: rivalSettlement,
    },
    routes: [],
    guardian,
    founders: {
      player: { q: playerStart.q, r: playerStart.r, movement: 2, movementRemaining: 2, retreating: false },
      rival: { q: rivalStart.q, r: rivalStart.r, movement: 2, movementRemaining: 2, retreating: false },
    },
    activeSide: 'player',
    guilds: { player: guild, rival: 'forgeborn' },
    traits: { player: startingTraits(guild), rival: startingTraits('forgeborn') },
    momentum: { player: 5, rival: 5 },
    unlockedTech: { player: startingTech(guild), rival: startingTech('forgeborn') },
    journal: [
      {
        id: 'intro',
        turn: 1,
        title: 'The Last Signal',
        text: 'The storm passed in the night, and beneath the fallen tower you found it: a small, warm light that should not still be working. Somewhere out there, something answered back.',
      },
    ],
    pendingChallenge: null,
    standingPosture: { player: 'endure', rival: 'endure' },
    beaconActivated: false,
    lastRivalIntent: null,
    ending: null,
    winnerSide: null,
  };
}

/** Two human founders race the same map to the same Beacon, alternating turns. Challenges between them resolve using each side's "standing posture" (see types.ts) since the defender isn't online to react live. */
export function createMultiplayerGame(seed: string, guildA: GuildId, guildB: GuildId, mapRadius = 6): GameState {
  const { tiles, playerStart, rivalStart, guardian, playerSettlement, rivalSettlement } = buildBoard(seed, mapRadius);
  playerSettlement.name = 'Player 1 Landing';
  rivalSettlement.name = 'Player 2 Landing';
  // Both humans see their own starting area. The Veil itself is shared world
  // state (see ROADMAP.md) — exploring near your rival's camp will reveal it
  // to both of you, which is an intentional "shared unknown" for this race format.
  revealAround(tiles, playerStart);
  revealAround(tiles, rivalStart);

  return {
    seed,
    mode: 'multiplayer',
    turn: 1,
    phase: 'intro',
    mapRadius,
    tiles,
    settlements: {
      [playerSettlement.id]: playerSettlement,
      [rivalSettlement.id]: rivalSettlement,
    },
    routes: [],
    guardian,
    founders: {
      player: { q: playerStart.q, r: playerStart.r, movement: 2, movementRemaining: 2, retreating: false },
      rival: { q: rivalStart.q, r: rivalStart.r, movement: 2, movementRemaining: 2, retreating: false },
    },
    activeSide: 'player',
    guilds: { player: guildA, rival: guildB },
    traits: { player: startingTraits(guildA), rival: startingTraits(guildB) },
    momentum: { player: 5, rival: 5 },
    unlockedTech: { player: startingTech(guildA), rival: startingTech(guildB) },
    journal: [
      {
        id: 'intro',
        turn: 1,
        title: 'Two Signals',
        text: 'Two Founders, two fragments of the same broken Network, racing the same unknown world toward the same distant Beacon.',
      },
    ],
    pendingChallenge: null,
    standingPosture: { player: 'endure', rival: 'endure' },
    beaconActivated: false,
    lastRivalIntent: null,
    ending: null,
    winnerSide: null,
  };
}
