import type { GameState } from '../game/types';
import { axialKey } from '../game/types';

interface Props {
  state: GameState;
  q: number;
  r: number;
  onClose: () => void;
}

const TERRAIN_LABEL: Record<string, string> = {
  plains: 'Open Plains',
  forest: 'Forest',
  mountain: 'Mountain',
  water: 'Water',
  ruins: 'Ruins',
  resource: 'Resource Site',
  signalTower: 'Signal Tower',
  beacon: 'Great Beacon',
};

export function TileInfoPanel({ state, q, r, onClose }: Props) {
  const tile = state.tiles[axialKey({ q, r })];
  if (!tile) return null;

  return (
    <div className="tile-info-panel" onClick={onClose}>
      {tile.veil === 'hidden' && <span>Unexplored.</span>}
      {tile.veil === 'clue' && <span>{tile.clueHint ?? 'Something lies beyond the Veil here.'}</span>}
      {tile.veil === 'revealed' && (
        <span>
          {TERRAIN_LABEL[tile.terrain]}
          {tile.settlementId && state.settlements[tile.settlementId] ? ` — ${state.settlements[tile.settlementId].name}` : ''}
        </span>
      )}
    </div>
  );
}
