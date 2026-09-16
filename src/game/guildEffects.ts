import type { GameState } from './types';

// Wires each Guild's stated strength/weakness (see guilds.ts) into an actual
// mechanical effect. Without this, guild choice was cosmetic — a Definition-of-
// Done violation ("Guild differences must be meaningful") caught in review.

export function guildRevealBonus(state: GameState): number {
  return state.guild === 'pathfinders' ? 1 : 0;
}

export function guildRouteCostDiscount(state: GameState): number {
  return state.guild === 'forgeborn' ? 1 : 0;
}

export function guildUpgradeCostDiscount(state: GameState): number {
  return state.guild === 'forgeborn' ? 1 : 0;
}

/** The Unbroken fight harder the further behind they are. */
export function guildComebackBonus(state: GameState): number {
  if (state.guild !== 'unbroken') return 0;
  return state.momentum < state.rivalMomentum ? 2 : 0;
}

/** The Keepers absorb crisis damage — losses hurt them less. */
export function guildLossMitigation(state: GameState, rawLoss: number): number {
  if (state.guild !== 'keepers') return rawLoss;
  return Math.round(rawLoss * 0.5);
}
