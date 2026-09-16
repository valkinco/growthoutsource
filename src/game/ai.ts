import { Rng } from './rng';
import { has } from './costs';
import { axialKey } from './types';
import { tilesInRadius } from './hex';
import type { ChallengeMove, GameState } from './types';

/**
 * The Iron Ledger (Solo mode's AI rival): predictable, production-focused,
 * overextends when far ahead. This is the TRUE intent used to resolve a
 * Challenge — always accurate, because the resolution itself must be fair.
 * What the player sees before choosing is a separate, deliberately imperfect
 * read — see perceivedRivalIntent below. Not used in multiplayer (no AI there).
 */
export function rivalIntent(state: GameState): ChallengeMove {
  const aheadByMomentum = state.momentum.rival - state.momentum.player;
  if (aheadByMomentum > 4) return 'push'; // overconfident when far ahead
  if (aheadByMomentum < -3) return 'endure'; // turtles when behind
  return 'build'; // default: steady infrastructure
}

/**
 * What the player is shown before committing to a move. Vision (trait + the
 * Negotiation tech) narrows the gap between this and the true intent above —
 * per the design pillar "Vision improves information but never removes all
 * uncertainty," a low-Vision founder should sometimes be reading it wrong.
 */
export function perceivedRivalIntent(state: GameState): { move: ChallengeMove; confident: boolean } {
  const truth = rivalIntent(state);
  const visionScore = state.traits.player.vision + (has(state, 'player', 'negotiation') ? 2 : 0);
  const accuracy = Math.min(0.95, 0.35 + visionScore * 0.12);
  const founder = state.founders.player;
  const rng = new Rng(`${state.seed}-intent-${state.turn}-${founder.q}-${founder.r}`);
  if (rng.next() < accuracy) return { move: truth, confident: accuracy > 0.75 };
  const decoys: ChallengeMove[] = (['push', 'build', 'endure'] as ChallengeMove[]).filter((m) => m !== truth);
  return { move: rng.pick(decoys), confident: false };
}

export function guardianDifficultyLabel(strength: number): string {
  if (strength <= 4) return 'wary';
  if (strength <= 7) return 'formidable';
  return 'ancient and unyielding';
}

export function rivalTurn(state: GameState, rng: Rng): GameState {
  const next = structuredClone(state);
  const rivalSettlements = Object.values(next.settlements).filter((s) => s.owner === 'rival');
  const primary = rivalSettlements[0];
  if (!primary) return next;

  if (primary.level === 'outpost' && next.momentum.rival >= 5) {
    primary.level = 'town';
    next.momentum.rival -= 5;
  } else if (primary.level === 'town' && next.momentum.rival >= 8) {
    primary.level = 'city';
    next.momentum.rival -= 8;
  } else if (rivalSettlements.length < 2 && next.momentum.rival >= 6 && rng.chance(0.4)) {
    // The Ledger expands rather than just growing in place — makes "watch rivals
    // respond" a real part of the loop instead of a settlement that never moves.
    const candidates = tilesInRadius(primary, 2)
      .map((p) => next.tiles[axialKey(p)])
      .filter((t) => t && !t.settlementId && !t.guardianId && ['plains', 'forest', 'resource'].includes(t.terrain));
    if (candidates.length) {
      const site = rng.pick(candidates);
      next.momentum.rival -= 4;
      const id = `settlement-rival-${rivalSettlements.length + 1}`;
      next.settlements[id] = {
        id,
        owner: 'rival',
        q: site.q,
        r: site.r,
        level: 'outpost',
        specialization: null,
        connected: false,
        name: 'Ledger Outpost',
      };
      site.settlementId = id;
    }
  } else if (rng.chance(0.3)) {
    next.momentum.rival = Math.max(0, next.momentum.rival - 1);
  }
  return next;
}
