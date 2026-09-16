import type { GameState } from './types';

const SAVE_KEY = 'growthbound.save.v1';
const SCHEMA_VERSION = 1;

interface SaveEnvelope {
  schemaVersion: number;
  state: GameState;
  savedAt: number;
}

export function saveGame(state: GameState) {
  try {
    const envelope: SaveEnvelope = { schemaVersion: SCHEMA_VERSION, state, savedAt: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
  } catch {
    // storage unavailable (private mode, quota) — fail silently, campaign continues in-memory
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as SaveEnvelope;
    if (envelope.schemaVersion !== SCHEMA_VERSION) return null;
    if (!envelope.state || typeof envelope.state.turn !== 'number') return null;
    return envelope.state;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
