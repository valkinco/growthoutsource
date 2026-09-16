import { Rng } from './rng';
import { rivalTurn, rivalIntent } from './ai';
import { FOUND_SETTLEMENT_COST, has, routeCost, settlementOutput, upgradeCost } from './costs';
import { guildComebackBonus, guildLossMitigation, guildRevealBonus } from './guildEffects';
import { tilesInRadius, cubeDistance } from './hex';
import {
  axialKey,
  otherSide,
  type Axial,
  type ChallengeMove,
  type ChallengeResult,
  type GameState,
  type PlayerId,
  type Settlement,
  type Specialization,
} from './types';

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

function nearestOwnSettlement(state: GameState, side: PlayerId, from: Axial): Settlement | undefined {
  const owned = Object.values(state.settlements).filter((s) => s.owner === side);
  if (!owned.length) return undefined;
  return owned.reduce((best, s) => (cubeDistance(from, s) < cubeDistance(from, best) ? s : best));
}

/** Losing a Challenge sends the Founder home rather than just taxing Momentum — failure becomes a story beat, not a dead end. */
function retreatFounder(next: GameState, side: PlayerId, reason: string) {
  const founder = next.founders[side];
  const home = nearestOwnSettlement(next, side, founder);
  if (!home) return;
  founder.q = home.q;
  founder.r = home.r;
  founder.retreating = true;
  next.journal.push({
    id: `retreat-${next.turn}-${home.id}`,
    turn: next.turn,
    title: 'A Setback',
    text: `${reason} The Founder falls back to ${home.name} to regroup.`,
  });
}

export function moveFounder(state: GameState, target: Axial): ActionOutcome {
  const next = structuredClone(state);
  const side = next.activeSide;
  const founder = next.founders[side];
  const key = axialKey(target);
  const tile = next.tiles[key];
  if (!tile) return { state, message: "That's beyond the world's edge." };

  const dist = cubeDistance({ q: founder.q, r: founder.r }, target);
  if (dist !== 1) return { state, message: 'The Founder can only step to an adjacent tile.' };
  if (tile.terrain === 'water' || tile.terrain === 'mountain') {
    return { state, message: 'That terrain blocks the way for now — a route could open it later.' };
  }

  const destSettlement = tile.settlementId ? next.settlements[tile.settlementId] : undefined;
  const guardianHere = !!tile.guardianId;

  const originTile = next.tiles[axialKey({ q: founder.q, r: founder.r })];
  const originSettlement = originTile.settlementId ? next.settlements[originTile.settlementId] : undefined;
  const routeLinksThem =
    !!originSettlement &&
    !!destSettlement &&
    next.routes.some(
      (r) =>
        (r.a === originSettlement.id && r.b === destSettlement.id) ||
        (r.a === destSettlement.id && r.b === originSettlement.id)
    );
  // Roads waives movement only between the player's OWN connected settlements.
  const usingRoad =
    has(next, side, 'roads') &&
    originSettlement?.owner === side &&
    destSettlement?.owner === side &&
    routeLinksThem;

  if (!usingRoad) {
    if (founder.movementRemaining <= 0) return { state, message: 'The Founder has no movement left this turn.' };
    founder.movementRemaining -= 1;
  }

  founder.q = target.q;
  founder.r = target.r;

  const revealRadius = (has(next, side, 'surveying') ? 2 : 1) + guildRevealBonus(next, side);
  reveal(next, target, revealRadius);

  let message: string | undefined;

  if (tile.terrain === 'ruins' && !tile.settlementId) {
    tile.terrain = 'plains';
    next.momentum[side] += 3;
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
  } else if (destSettlement && destSettlement.owner !== side) {
    next.pendingChallenge = { targetQ: target.q, targetR: target.r, kind: 'rival' };
    message =
      next.mode === 'multiplayer'
        ? "Your rival holds this ground. They aren't here to answer live, so this resolves against their standing orders."
        : 'The rival faction holds this ground. Choose how to respond.';
  }

  return { state: next, message };
}

export function foundSettlement(state: GameState, name: string): ActionOutcome {
  const next = structuredClone(state);
  const side = next.activeSide;
  const founder = next.founders[side];
  const key = axialKey({ q: founder.q, r: founder.r });
  const tile = next.tiles[key];
  if (!tile) return { state, message: 'Invalid location.' };
  if (tile.settlementId) return { state, message: 'A settlement already stands here.' };
  if (!['plains', 'forest', 'resource'].includes(tile.terrain)) {
    return { state, message: 'This terrain cannot support a settlement yet.' };
  }
  if (next.momentum[side] < FOUND_SETTLEMENT_COST) return { state, message: 'Not enough Momentum to found a settlement.' };

  next.momentum[side] -= FOUND_SETTLEMENT_COST;
  const ownedCount = Object.values(next.settlements).filter((s) => s.owner === side).length;
  const id = `settlement-${side}-${ownedCount + 1}`;
  next.settlements[id] = {
    id,
    owner: side,
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
  const side = next.activeSide;
  const s = next.settlements[settlementId];
  if (!s || s.owner !== side) return { state, message: 'You can only upgrade your own settlements.' };
  if (s.level === 'city') return { state, message: 'This settlement has already reached its full height.' };
  const toLevel = s.level === 'outpost' ? 'town' : 'city';
  const cost = upgradeCost(next, side, toLevel);
  if (next.momentum[side] < cost) return { state, message: `Needs ${cost} Momentum to upgrade.` };
  next.momentum[side] -= cost;
  s.level = toLevel;
  return { state: next, message: `${s.name} has grown into a ${toLevel}.` };
}

export function setSpecialization(state: GameState, settlementId: string, spec: Specialization): ActionOutcome {
  const next = structuredClone(state);
  const side = next.activeSide;
  const s = next.settlements[settlementId];
  if (!s || s.owner !== side) return { state, message: 'Invalid settlement.' };
  if (s.level === 'outpost') return { state, message: 'Grow this settlement to a Town before specializing.' };
  if (s.specialization) return { state, message: 'This settlement has already chosen its path.' };
  s.specialization = spec;
  return { state: next, message: `${s.name} now specializes as a ${spec}.` };
}

export function connectSettlements(state: GameState, aId: string, bId: string): ActionOutcome {
  const next = structuredClone(state);
  const side = next.activeSide;
  const a = next.settlements[aId];
  const b = next.settlements[bId];
  if (!a || !b || a.owner !== side || b.owner !== side) {
    return { state, message: 'You can only connect your own settlements.' };
  }
  const dist = cubeDistance({ q: a.q, r: a.r }, { q: b.q, r: b.r });
  if (dist > 4) return { state, message: 'These settlements are too far apart to connect yet.' };
  const already = next.routes.some((r) => (r.a === aId && r.b === bId) || (r.a === bId && r.b === aId));
  if (already) return { state, message: 'A route already links these settlements.' };
  const cost = routeCost(next, side);
  if (next.momentum[side] < cost) return { state, message: `Needs ${cost} Momentum to build this route.` };

  next.momentum[side] -= cost;
  next.routes.push({ id: `route-${next.routes.length + 1}`, a: aId, b: bId });
  a.connected = true;
  b.connected = true;

  if (has(next, side, 'shared-knowledge')) reveal(next, { q: b.q, r: b.r }, 1);

  return { state: next, message: `${a.name} and ${b.name} are now connected.` };
}

/** Lets the Founder try the Guardian again while still standing on its tile, instead of forcing a step-off-and-back-on to re-trigger the encounter. */
export function openGuardianChallenge(state: GameState): ActionOutcome {
  const next = structuredClone(state);
  const founder = next.founders[next.activeSide];
  const tile = next.tiles[axialKey({ q: founder.q, r: founder.r })];
  if (!tile?.guardianId || next.guardian.resolved) return { state, message: 'Nothing here to challenge.' };
  next.pendingChallenge = { targetQ: founder.q, targetR: founder.r, kind: 'guardian' };
  return { state: next };
}

export function unlockTech(state: GameState, techId: string, cost: number): ActionOutcome {
  const next = structuredClone(state);
  const side = next.activeSide;
  if (next.unlockedTech[side].includes(techId)) return { state, message: 'Already unlocked.' };
  if (next.momentum[side] < cost) return { state, message: `Needs ${cost} Momentum.` };
  next.momentum[side] -= cost;
  next.unlockedTech[side].push(techId);
  return { state: next, message: `${techId} unlocked.` };
}

function triangleResult(playerMove: ChallengeMove, rivalMove: ChallengeMove): 'player' | 'rival' | 'draw' {
  if (playerMove === rivalMove) return 'draw';
  const beats: Record<ChallengeMove, ChallengeMove> = { build: 'push', push: 'endure', endure: 'build' };
  return beats[playerMove] === rivalMove ? 'player' : 'rival';
}

/** Sets the move that will be used to defend this side's settlements if challenged before their next turn (multiplayer only — Solo's AI always uses rivalIntent instead). Free to change, any time on your turn. */
export function setStandingPosture(state: GameState, move: ChallengeMove): ActionOutcome {
  const next = structuredClone(state);
  next.standingPosture[next.activeSide] = move;
  return { state: next, message: `Standing order set to ${move.toUpperCase()}.` };
}

function traitBoostFor(state: GameState, side: PlayerId, move: ChallengeMove): number {
  const t = state.traits[side];
  return { push: t.grit, build: t.execution, endure: t.resilience }[move];
}

/**
 * Resolves a Challenge against the opposing settlement. In Solo mode the
 * opponent is the AI (rivalIntent, momentum-only scoring — unchanged from
 * original tuning). In multiplayer the opponent is a real player who isn't
 * online to react, so their move comes from their standing posture and their
 * score uses their real traits/guild, same as the attacker's.
 */
export function resolveRivalChallenge(state: GameState, playerMove: ChallengeMove): { state: GameState; result: ChallengeResult } {
  const next = structuredClone(state);
  const side = next.activeSide;
  const opp = otherSide(side);
  const rivalMove = next.mode === 'multiplayer' ? next.standingPosture[opp] : rivalIntent(next);
  const outcome = triangleResult(playerMove, rivalMove);

  const playerScore =
    next.momentum[side] * 0.5 + traitBoostFor(next, side, playerMove) * 2 + guildComebackBonus(next, side) + (outcome === 'player' ? 5 : 0);
  const rivalScore =
    next.mode === 'multiplayer'
      ? next.momentum[opp] * 0.5 + traitBoostFor(next, opp, rivalMove) * 2 + guildComebackBonus(next, opp) + (outcome === 'rival' ? 5 : 0)
      : next.momentum[opp] * 0.5 + (outcome === 'rival' ? 5 : 0);

  const winner: PlayerId | 'draw' = playerScore === rivalScore ? 'draw' : playerScore > rivalScore ? side : opp;

  let log = '';
  if (winner === side) {
    const founder = next.founders[side];
    const tile = next.tiles[axialKey({ q: founder.q, r: founder.r })];
    const rivalSettlementId = tile.settlementId;
    if (rivalSettlementId && next.settlements[rivalSettlementId]) {
      next.settlements[rivalSettlementId].owner = side;
      next.settlements[rivalSettlementId].level = 'outpost';
    }
    next.momentum[side] = Math.max(0, next.momentum[side] - Math.round(playerScore * 0.15));
    log = `Your ${playerMove.toUpperCase()} overcame their ${rivalMove.toUpperCase()}. The settlement is yours.`;
  } else if (winner === opp) {
    next.momentum[side] = Math.max(0, next.momentum[side] - guildLossMitigation(next, side, 3));
    retreatFounder(next, side, `Their ${rivalMove.toUpperCase()} answered your ${playerMove.toUpperCase()}.`);
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
  const side = next.activeSide;
  const g = next.guardian;

  const power: Record<ChallengeMove, number> = {
    push: next.momentum[side] * 0.6 + next.traits[side].grit * 2.5,
    build: next.momentum[side] * 0.4 + next.traits[side].execution * 3,
    endure: next.momentum[side] * 0.3 + next.traits[side].resilience * 3.5,
  };
  const playerScore = power[playerMove];
  const rivalScore = g.strength * 3;
  const winner: PlayerId = playerScore >= rivalScore ? side : otherSide(side);

  let log = '';
  if (winner === side) {
    g.resolved = true;
    g.outcome = playerMove === 'push' ? 'defeated' : playerMove === 'build' ? 'befriended' : 'released';
    next.beaconActivated = true;
    next.phase = 'victory';
    next.winnerSide = side;
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
    next.momentum[side] = Math.max(0, next.momentum[side] - guildLossMitigation(next, side, 4));
    retreatFounder(next, side, `${g.name} is still too strong.`);
    log = `${g.name} is still too strong. You retreat to gather more strength before trying again.`;
  }

  next.pendingChallenge = null;
  return { state: next, result: { playerMove, rivalMove: 'endure', playerScore, rivalScore, winner, log } };
}

export function endTurn(state: GameState): GameState {
  let next = structuredClone(state);

  if (next.mode === 'solo') {
    for (const s of Object.values(next.settlements)) {
      next.momentum[s.owner] += settlementOutput(s.level, s.specialization, s.connected);
    }
    next.founders.player.movementRemaining = next.founders.player.movement;
    next.founders.player.retreating = false;
    next.turn += 1;

    const rng = new Rng(`${next.seed}-turn-${next.turn}`);
    next = rivalTurn(next, rng);

    const playerHasSettlement = Object.values(next.settlements).some((s) => s.owner === 'player');
    if (!playerHasSettlement) {
      next.phase = 'defeat';
      next.ending = 'Without a settlement to call home, the Network falls silent once more.';
    }
  } else {
    // Multiplayer: only the side ending their turn ticks income, then hand off to the other Founder.
    const finishedSide = next.activeSide;
    for (const s of Object.values(next.settlements)) {
      if (s.owner === finishedSide) next.momentum[finishedSide] += settlementOutput(s.level, s.specialization, s.connected);
    }
    next.founders[finishedSide].retreating = false;
    const nextSide = otherSide(finishedSide);
    next.founders[nextSide].movementRemaining = next.founders[nextSide].movement;
    next.activeSide = nextSide;
    next.turn += 1;
  }

  return next;
}
