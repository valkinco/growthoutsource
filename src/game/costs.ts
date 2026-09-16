import type { GameState, PlayerId } from './types';
import { guildRouteCostDiscount, guildUpgradeCostDiscount } from './guildEffects';

export function has(state: GameState, side: PlayerId, techId: string): boolean {
  return state.unlockedTech[side].includes(techId);
}

export function upgradeCost(state: GameState, side: PlayerId, toLevel: 'town' | 'city'): number {
  let cost = toLevel === 'town' ? 5 : 8;
  if (has(state, side, 'workshops')) cost -= 1;
  cost -= guildUpgradeCostDiscount(state, side);
  return Math.max(1, cost);
}

export const FOUND_SETTLEMENT_COST = 4;

export function routeCost(state: GameState, side: PlayerId): number {
  let cost = has(state, side, 'trade') ? 2 : 3;
  cost -= guildRouteCostDiscount(state, side);
  return Math.max(1, cost);
}

export function settlementOutput(level: string, specialization: string | null, connected: boolean): number {
  let out = level === 'outpost' ? 1 : level === 'town' ? 2 : 4;
  if (specialization === 'market') out += 1;
  if (connected) out += 1;
  return out;
}
