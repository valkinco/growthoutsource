import type { GameState, PlayerId } from './types';
import { otherSide } from './types';

// Wires each Guild's stated strength/weakness (see guilds.ts) into an actual
// mechanical effect. Without this, guild choice was cosmetic — a Definition-of-
// Done violation ("Guild differences must be meaningful") caught in review.
// All effects are keyed by `side` so the same logic works for the AI rival
// (Solo) or a second human (multiplayer).

export function guildRevealBonus(state: GameState, side: PlayerId): number {
  return state.guilds[side] === 'pathfinders' ? 1 : 0;
}

export function guildRouteCostDiscount(state: GameState, side: PlayerId): number {
  return state.guilds[side] === 'forgeborn' ? 1 : 0;
}

export function guildUpgradeCostDiscount(state: GameState, side: PlayerId): number {
  return state.guilds[side] === 'forgeborn' ? 1 : 0;
}

/** The Unbroken fight harder the further behind they are. */
export function guildComebackBonus(state: GameState, side: PlayerId): number {
  if (state.guilds[side] !== 'unbroken') return 0;
  return state.momentum[side] < state.momentum[otherSide(side)] ? 2 : 0;
}

/** The Keepers absorb crisis damage — losses hurt them less. */
export function guildLossMitigation(state: GameState, side: PlayerId, rawLoss: number): number {
  if (state.guilds[side] !== 'keepers') return rawLoss;
  return Math.round(rawLoss * 0.5);
}
