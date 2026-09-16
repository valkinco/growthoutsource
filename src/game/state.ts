import { generateMap } from './mapgen';
import { startingTraits } from './guilds';
import { axialKey, type GameState, type GuildId, type Settlement, type Guardian } from './types';
import { tilesInRadius } from './hex';

const GUARDIANS: Omit<Guardian, 'q' | 'r'>[] = [
  { id: 'emberhorn', name: 'Emberhorn', theme: 'Industry and exhaustion', strength: 6, resolved: false },
];

export function createNewGame(seed: string, guild: GuildId, mapRadius = 6): GameState {
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

  // Reveal starting territory around the Founder.
  for (const pos of tilesInRadius(playerStart, 1)) {
    const t = tiles[axialKey(pos)];
    if (t) t.veil = 'revealed';
  }
  // Give clues one ring further out.
  for (const pos of tilesInRadius(playerStart, 2)) {
    const t = tiles[axialKey(pos)];
    if (t && t.veil === 'hidden') t.veil = 'clue';
  }

  const guardianDef = GUARDIANS[0];
  const guardian: Guardian = { ...guardianDef, q: beaconPos.q, r: beaconPos.r };
  const beaconTile = tiles[axialKey(beaconPos)];
  beaconTile.guardianId = guardian.id;
  // The opening beat promises "one distant Beacon briefly responds" within the
  // first minute — without this it stays fully hidden behind the Veil for turns.
  if (beaconTile.veil === 'hidden') beaconTile.veil = 'clue';
  beaconTile.clueHint = 'A distant pulse answers your Signal, faint but real.';

  return {
    seed,
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
    founder: {
      q: playerStart.q,
      r: playerStart.r,
      movement: 2,
      movementRemaining: 2,
      retreating: false,
    },
    guild,
    traits: startingTraits(guild),
    momentum: 5,
    rivalMomentum: 5,
    unlockedTech: [],
    journal: [
      {
        id: 'intro',
        turn: 1,
        title: 'The Last Signal',
        text: 'The storm passed in the night, and beneath the fallen tower you found it: a small, warm light that should not still be working. Somewhere out there, something answered back.',
      },
    ],
    pendingChallenge: null,
    beaconActivated: false,
    lastRivalIntent: null,
    ending: null,
  };
}
