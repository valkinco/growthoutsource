import type { GameState } from './types';

export function has(state: GameState, techId: string): boolean {
  return state.unlockedTech.includes(techId);
}

export function upgradeCost(state: GameState, toLevel: 'town' | 'city'): number {
  const base = toLevel === 'town' ? 5 : 8;
  return has(state, 'workshops') ? base - 1 : base;
}

export const FOUND_SETTLEMENT_COST = 4;

export function routeCost(state: GameState): number {
  return has(state, 'trade') ? 2 : 3;
}

export function settlementOutput(level: string, specialization: string | null, connected: boolean): number {
  let out = level === 'outpost' ? 1 : level === 'town' ? 2 : 4;
  if (specialization === 'market') out += 1;
  if (connected) out += 1;
  return out;
}
