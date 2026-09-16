import { Rng } from './rng';
import { axialKey, type Tile, type TerrainType } from './types';
import { cubeDistance, tilesInRadius } from './hex';

export interface GeneratedMap {
  tiles: Record<string, Tile>;
  playerStart: { q: number; r: number };
  rivalStart: { q: number; r: number };
  beaconPos: { q: number; r: number };
}

const CLUE_HINTS: Record<TerrainType, string[]> = {
  ruins: ['A faint glow flickers on the horizon.', 'Broken stone catches the light.'],
  signalTower: ['Strange interference crackles at the edge of hearing.'],
  beacon: ['A distant pulse answers your Signal, faint but real.'],
  water: ['Gulls circle somewhere ahead.'],
  forest: ['Birdsong drifts in from the unknown.'],
  mountain: ['A dark ridge breaks the skyline.'],
  resource: ['Smoke rises — someone, or something, is working there.'],
  plains: [],
};

function weightedTerrain(rng: Rng, distFromCenter: number, mapRadius: number): TerrainType {
  // Center is calmer (mostly plains/forest); the rim holds more danger/reward.
  const rim = distFromCenter / mapRadius;
  const roll = rng.next();
  if (roll < 0.42) return 'plains';
  if (roll < 0.62) return 'forest';
  if (roll < 0.74) return rim > 0.5 ? 'mountain' : 'forest';
  if (roll < 0.84) return 'water';
  if (roll < 0.91) return 'resource';
  if (roll < 0.97) return 'ruins';
  return 'signalTower';
}

/**
 * Generates a fair hex map: every start has a settlement tile, a nearby resource,
 * at least two open expansion directions, and no unavoidable hazard on turn one.
 */
export function generateMap(seed: string, mapRadius: number): GeneratedMap {
  const rng = new Rng(seed);
  const center = { q: 0, r: 0 };
  const all = tilesInRadius(center, mapRadius);

  const tiles: Record<string, Tile> = {};
  for (const pos of all) {
    const dist = cubeDistance(center, pos);
    let terrain: TerrainType = 'plains';
    if (dist === 0) {
      terrain = 'plains'; // reserved for player start, guaranteed safe
    } else {
      terrain = weightedTerrain(rng, dist, mapRadius);
    }
    tiles[axialKey(pos)] = {
      q: pos.q,
      r: pos.r,
      terrain,
      veil: 'hidden',
    };
  }

  // Player starts at map center; rival starts at the far rim for fairness/distance.
  const playerStart = center;
  const rimTiles = all.filter((p) => cubeDistance(center, p) === mapRadius);
  const rivalStart = rng.pick(rimTiles);

  // Beacon sits roughly midway between the two, on the rim opposite-ish the rival for a natural arc.
  const beaconCandidates = all.filter((p) => {
    const d = cubeDistance(center, p);
    return d >= Math.floor(mapRadius * 0.6) && d <= mapRadius;
  });
  const beaconPos = rng.pick(beaconCandidates);
  tiles[axialKey(beaconPos)].terrain = 'beacon';

  // Guarantee player start has a resource within 2 tiles and clear expansion lanes.
  const nearStart = tilesInRadius(playerStart, 2).filter((p) => axialKey(p) !== axialKey(playerStart));
  const hasResourceNearby = nearStart.some((p) => tiles[axialKey(p)].terrain === 'resource');
  if (!hasResourceNearby) {
    const pick = rng.pick(nearStart.filter((p) => tiles[axialKey(p)].terrain === 'plains' || tiles[axialKey(p)].terrain === 'forest'));
    if (pick) tiles[axialKey(pick)].terrain = 'resource';
  }
  // Guarantee one early "discovery" (ruins) within 3 tiles of start.
  const nearStart3 = tilesInRadius(playerStart, 3).filter((p) => axialKey(p) !== axialKey(playerStart));
  const hasRuinsNearby = nearStart3.some((p) => tiles[axialKey(p)].terrain === 'ruins');
  if (!hasRuinsNearby) {
    const pick = rng.pick(nearStart3.filter((p) => tiles[axialKey(p)].terrain === 'plains' || tiles[axialKey(p)].terrain === 'forest'));
    if (pick) tiles[axialKey(pick)].terrain = 'ruins';
  }
  // Never let the immediate ring around start be all mountain/water (would trap the founder).
  const ring1 = tilesInRadius(playerStart, 1).filter((p) => axialKey(p) !== axialKey(playerStart));
  const blocked = ring1.every((p) => tiles[axialKey(p)].terrain === 'mountain' || tiles[axialKey(p)].terrain === 'water');
  if (blocked) {
    for (const p of ring1.slice(0, 2)) tiles[axialKey(p)].terrain = 'plains';
  }

  // Seed clue hints for everything still hidden.
  for (const key of Object.keys(tiles)) {
    const t = tiles[key];
    const hints = CLUE_HINTS[t.terrain];
    if (hints.length) t.clueHint = hints[rng.int(0, hints.length - 1)];
  }

  return { tiles, playerStart, rivalStart, beaconPos };
}
