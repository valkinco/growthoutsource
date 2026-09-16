import { Rng } from './rng';
import { rivalTurn, rivalIntent } from './ai';
import { FOUND_SETTLEMENT_COST, has, routeCost, settlementOutput, upgradeCost } from './costs';
import { tilesInRadius, cubeDistance } from './hex';
import { axialKey, type Axial, type ChallengeMove, type ChallengeResult, type GameState, type Specialization } from './types';

export interface ActionOutcome {
  state: GameState;
  message?: string;
}

function reveal(state: GameState, center: Axial, radius: number) {
  for (const pos of tilesInRadius(center, radius)) {
    const t = state.tiles[axialKey(pos)];
    if (t && t.veil !== 'revealed') t.veil = 'revealed';
  }
  for (const pos of tilesInRadius(center, radius + 1)) {
    const t = state.tiles[axialKey(pos)];
    if (t && t.veil === 'hidden') t.veil = 'clue';
  }
}

export function moveFounder(state: GameState, target: Axial): ActionOutcome {
  const next = structuredClone(state);
  const key = axialKey(target);
  const tile = next.tiles[key];
  if (!tile) return { state, message: "That's beyond the world's edge." };

  const dist = cubeDistance({ q: next.founder.q, r: next.founder.r }, target);
  if (dist !== 1) return { state, message: 'The Founder can only step to an adjacent tile.' };
  if (tile.terrain === 'water' || tile.terrain === 'mountain') {
    return { state, message: 'That terrain blocks the way for now — a route could open it later.' };
  }

  const rivalOwned = tile.settlementId && next.settlements[tile.settlementId]?.owner === 'rival';
  const guardianHere = !!tile.guardianId;

  const usingRoad =
    has(next, 'roads') &&
    tile.settlementId &&
    next.settlements[tile.settlementId]?.owner === 'player' &&
    next.tiles[axialKey({ q: next.founder.q, r: next.founder.r })].settlementId;

  if (!usingRoad) {
    if (next.founder.movementRemaining <= 0) return { state, message: 'The Founder has no movement left this turn.' };
    next.founder.movementRemaining -= 1;
  }

  next.founder.q = target.q;
  next.founder.r = target.r;

  const revealRadius = has(next, 'surveying') ? 2 : 1;
  reveal(next, target, revealRadius);

  let message: string | undefined;

  if (tile.terrain === 'ruins' && !tile.settlementId) {
    tile.terrain = 'plains';
    next.momentum += 3;
    next.journal.push({
      id: `ruins-${next.turn}-${key}`,
      turn: next.turn,
      title: 'A Discovery',
      text: 'Among the rubble, a cache of salvage — enough to keep moving forward. +3 Momentum.',
    });
    message = 'You found something useful in the ruins. +3 Momentum.';
  }

  if (guardianHere) {
    next.pendingChallenge = { targetQ: target.q, targetR: target.r, kind: 'guardian' };
    message = `${next.guardian.name} stands before the Beacon, ${next.guardian.theme.toLowerCase()} radiating from it.`;
  } else if (rivalOwned) {
    next.pendingChallenge = { targetQ: target.q, targetR: target.r, kind: 'rival' };
    message = 'The rival faction holds this ground. Choose how to respond.';
  }

  return { state: next, message };
}

export function foundSettlement(state: GameState, name: string): ActionOutcome {
  const next = structuredClone(state);
  const key = axialKey({ q: next.founder.q, r: next.founder.r });
  const tile = next.tiles[key];
  if (!tile) return { state, message: 'Invalid location.' };
  if (tile.settlementId) return { state, message: 'A settlement already stands here.' };
  if (!['plains', 'forest', 'resource'].includes(tile.terrain)) {
    return { state, message: 'This terrain cannot support a settlement yet.' };
  }
  if (next.momentum < FOUND_SETTLEMENT_COST) return { state, message: 'Not enough Momentum to found a settlement.' };

  next.momentum -= FOUND_SETTLEMENT_COST;
  const id = `settlement-player-${Object.keys(next.settlements).length + 1}`;
  next.settlements[id] = {
    id,
    owner: 'player',
    q: tile.q,
    r: tile.r,
    level: 'outpost',
    specialization: null,
    connected: false,
    name,
  };
  tile.settlementId = id;
  return { state: next, message: `${name} has been founded.` };
}

export function upgradeSettlement(state: GameState, settlementId: string): ActionOutcome {
  const next = structuredClone(state);
  const s = next.settlements[settlementId];
  if (!s || s.owner !== 'player') return { state, message: 'You can only upgrade your own settlements.' };
  if (s.level === 'city') return { state, message: 'This settlement has already reached its full height.' };
  const toLevel = s.level === 'outpost' ? 'town' : 'city';
  const cost = upgradeCost(next, toLevel);
  if (next.momentum < cost) return { state, message: `Needs ${cost} Momentum to upgrade.` };
  next.momentum -= cost;
  s.level = toLevel;
  return { state: next, message: `${s.name} has grown into a ${toLevel}.` };
}

export function setSpecialization(state: GameState, settlementId: string, spec: Specialization): ActionOutcome {
  const next = structuredClone(state);
  const s = next.settlements[settlementId];
  if (!s || s.owner !== 'player') return { state, message: 'Invalid settlement.' };
  if (s.level === 'outpost') return { state, message: 'Grow this settlement to a Town before specializing.' };
  if (s.specialization) return { state, message: 'This settlement has already chosen its path.' };
  s.specialization = spec;
  return { state: next, message: `${s.name} now specializes as a ${spec}.` };
}

export function connectSettlements(state: GameState, aId: string, bId: string): ActionOutcome {
  const next = structuredClone(state);
  const a = next.settlements[aId];
  const b = next.settlements[bId];
  if (!a || !b || a.owner !== 'player' || b.owner !== 'player') {
    return { state, message: 'You can only connect your own settlements.' };
  }
  const dist = cubeDistance({ q: a.q, r: a.r }, { q: b.q, r: b.r });
  if (dist > 4) return { state, message: 'These settlements are too far apart to connect yet.' };
  const already = next.routes.some((r) => (r.a === aId && r.b === bId) || (r.a === bId && r.b === aId));
  if (already) return { state, message: 'A route already links these settlements.' };
  const cost = routeCost(next);
  if (next.momentum < cost) return { state, message: `Needs ${cost} Momentum to build this route.` };

  next.momentum -= cost;
  next.routes.push({ id: `route-${next.routes.length + 1}`, a: aId, b: bId });
  a.connected = true;
  b.connected = true;

  if (has(next, 'shared-knowledge')) reveal(next, { q: b.q, r: b.r }, 1);

  return { state: next, message: `${a.name} and ${b.name} are now connected.` };
}

export function unlockTech(state: GameState, techId: string, cost: number): ActionOutcome {
  const next = structuredClone(state);
  if (next.unlockedTech.includes(techId)) return { state, message: 'Already unlocked.' };
  if (next.momentum < cost) return { state, message: `Needs ${cost} Momentum.` };
  next.momentum -= cost;
  next.unlockedTech.push(techId);
  return { state: next, message: `${techId} unlocked.` };
}

function triangleResult(playerMove: ChallengeMove, rivalMove: ChallengeMove): 'player' | 'rival' | 'draw' {
  if (playerMove === rivalMove) return 'draw';
  const beats: Record<ChallengeMove, ChallengeMove> = { build: 'push', push: 'endure', endure: 'build' };
  return beats[playerMove] === rivalMove ? 'player' : 'rival';
}

export function resolveRivalChallenge(state: GameState, playerMove: ChallengeMove): { state: GameState; result: ChallengeResult } {
  const next = structuredClone(state);
  const rivalMove = rivalIntent(next);
  const outcome = triangleResult(playerMove, rivalMove);

  const traitBoost: Record<ChallengeMove, number> = {
    push: next.traits.grit,
    build: next.traits.execution,
    endure: next.traits.resilience,
  };

  const playerScore = next.momentum * 0.5 + traitBoost[playerMove] * 2 + (outcome === 'player' ? 5 : 0);
  const rivalScore = next.rivalMomentum * 0.5 + (outcome === 'rival' ? 5 : 0);

  const winner: 'player' | 'rival' | 'draw' = playerScore === rivalScore ? 'draw' : playerScore > rivalScore ? 'player' : 'rival';

  let log = '';
  if (winner === 'player') {
    const tile = next.tiles[axialKey({ q: next.founder.q, r: next.founder.r })];
    const rivalSettlementId = tile.settlementId;
    if (rivalSettlementId && next.settlements[rivalSettlementId]) {
      next.settlements[rivalSettlementId].owner = 'player';
      next.settlements[rivalSettlementId].level = 'outpost';
    }
    next.momentum -= Math.max(0, Math.round(playerScore * 0.15));
    log = `Your ${playerMove.toUpperCase()} overcame their ${rivalMove.toUpperCase()}. The settlement is yours.`;
  } else if (winner === 'rival') {
    next.momentum = Math.max(0, next.momentum - 3);
    log = `Their ${rivalMove.toUpperCase()} answered your ${playerMove.toUpperCase()}. You withdraw, bruised but intact.`;
  } else {
    log = 'Neither side yields. The standoff continues.';
  }

  next.pendingChallenge = null;
  next.lastRivalIntent = rivalMove;

  return {
    state: next,
    result: { playerMove, rivalMove, playerScore, rivalScore, winner, log },
  };
}

export function resolveGuardianChallenge(state: GameState, playerMove: ChallengeMove): { state: GameState; result: ChallengeResult } {
  const next = structuredClone(state);
  const g = next.guardian;

  const power: Record<ChallengeMove, number> = {
    push: next.momentum * 0.6 + next.traits.grit * 2.5,
    build: next.momentum * 0.4 + next.traits.execution * 3,
    endure: next.momentum * 0.3 + next.traits.resilience * 3.5,
  };
  const playerScore = power[playerMove];
  const rivalScore = g.strength * 3;
  const winner: 'player' | 'rival' = playerScore >= rivalScore ? 'player' : 'rival';

  let log = '';
  if (winner === 'player') {
    g.resolved = true;
    g.outcome = playerMove === 'push' ? 'defeated' : playerMove === 'build' ? 'befriended' : 'released';
    next.beaconActivated = true;
    next.phase = 'victory';
    next.ending =
      playerMove === 'push'
        ? 'The Guardian falls silent. The Beacon is yours by force.'
        : playerMove === 'build'
        ? 'You repair what was broken. Emberhorn burns steady again, and the Beacon wakes beside it.'
        : 'You wait, and the Guardian finally rests. The Beacon lights on its own.';
    next.journal.push({
      id: `beacon-${next.turn}`,
      turn: next.turn,
      title: 'The Beacon Wakes',
      text: next.ending,
    });
    log = `Success! ${next.ending}`;
  } else {
    next.momentum = Math.max(0, next.momentum - 4);
    log = `${g.name} is still too strong. You retreat to gather more strength before trying again.`;
  }

  next.pendingChallenge = null;
  return { state: next, result: { playerMove, rivalMove: 'endure', playerScore, rivalScore, winner: winner === 'player' ? 'player' : 'rival', log } };
}

export function endTurn(state: GameState): GameState {
  let next = structuredClone(state);

  for (const s of Object.values(next.settlements)) {
    if (s.owner === 'player') {
      next.momentum += settlementOutput(s.level, s.specialization, s.connected);
    } else {
      next.rivalMomentum += settlementOutput(s.level, s.specialization, s.connected);
    }
  }

  next.founder.movementRemaining = next.founder.movement;
  next.turn += 1;

  const rng = new Rng(`${next.seed}-turn-${next.turn}`);
  next = rivalTurn(next, rng);

  const playerHasSettlement = Object.values(next.settlements).some((s) => s.owner === 'player');
  if (!playerHasSettlement) {
    next.phase = 'defeat';
    next.ending = 'Without a settlement to call home, the Network falls silent once more.';
  }

  return next;
}
