import { Rng } from './rng';
import type { ChallengeMove, GameState } from './types';

/**
 * The Iron Ledger: predictable, production-focused, overextends when far ahead.
 * Its likely move is knowable (Vision/Negotiation reward reading it correctly),
 * not hidden at random — uncertainty should come from the map, not an opaque AI.
 */
export function rivalIntent(state: GameState): ChallengeMove {
  const aheadByMomentum = state.rivalMomentum - state.momentum;
  if (aheadByMomentum > 4) return 'push'; // overconfident when far ahead
  if (aheadByMomentum < -3) return 'endure'; // turtles when behind
  return 'build'; // default: steady infrastructure
}

export function guardianDifficultyLabel(strength: number): string {
  if (strength <= 4) return 'wary';
  if (strength <= 7) return 'formidable';
  return 'ancient and unyielding';
}

export function rivalTurn(state: GameState, rng: Rng): GameState {
  const next = structuredClone(state);
  const rival = Object.values(next.settlements).find((s) => s.owner === 'rival');
  if (!rival) return next;

  // Simple, readable behavior: The Iron Ledger reinvests in its own settlement.
  if (rival.level === 'outpost' && next.rivalMomentum >= 5) {
    rival.level = 'town';
    next.rivalMomentum -= 5;
  } else if (rival.level === 'town' && next.rivalMomentum >= 8) {
    rival.level = 'city';
    next.rivalMomentum -= 8;
  } else if (rng.chance(0.3)) {
    // occasional restraint to avoid runaway snowballing
    next.rivalMomentum = Math.max(0, next.rivalMomentum - 1);
  }
  return next;
}
