import { useState } from 'react';
import type { GameState, Specialization } from '../game/types';
import { axialKey } from '../game/types';
import { FOUND_SETTLEMENT_COST, routeCost, upgradeCost } from '../game/costs';

interface Props {
  state: GameState;
  connectMode: boolean;
  onFound: () => void;
  onUpgrade: (settlementId: string) => void;
  onSpecialize: (settlementId: string, spec: Specialization) => void;
  onStartConnect: () => void;
  onCancelConnect: () => void;
  onOpenTech: () => void;
  onEndTurn: () => void;
}

const SPECS: Specialization[] = ['maker', 'market', 'watchtower', 'bastion'];

export function ActionBar({ state, connectMode, onFound, onUpgrade, onSpecialize, onStartConnect, onCancelConnect, onOpenTech, onEndTurn }: Props) {
  const [pickingSpec, setPickingSpec] = useState(false);
  const tile = state.tiles[axialKey(state.founder)];
  const settlement = tile?.settlementId ? state.settlements[tile.settlementId] : undefined;
  const ownSettlement = settlement?.owner === 'player' ? settlement : undefined;

  const canFound = !tile?.settlementId && ['plains', 'forest', 'resource'].includes(tile?.terrain ?? '');
  const upgradeLabel = ownSettlement
    ? ownSettlement.level === 'outpost'
      ? `Grow to Town (${upgradeCost(state, 'town')})`
      : ownSettlement.level === 'town'
      ? `Grow to City (${upgradeCost(state, 'city')})`
      : null
    : null;

  return (
    <div className="action-bar">
      {connectMode ? (
        <div className="connect-hint">
          <span>Tap another settlement of yours to connect it.</span>
          <button className="btn-ghost" onClick={onCancelConnect}>Cancel</button>
        </div>
      ) : pickingSpec && ownSettlement ? (
        <div className="spec-picker">
          {SPECS.map((s) => (
            <button key={s} className="btn-secondary" onClick={() => { onSpecialize(ownSettlement.id, s); setPickingSpec(false); }}>
              {s}
            </button>
          ))}
          <button className="btn-ghost" onClick={() => setPickingSpec(false)}>Cancel</button>
        </div>
      ) : (
        <>
          <div className="action-group">
            {canFound && (
              <button className="btn-action" onClick={onFound}>
                Found Settlement ({FOUND_SETTLEMENT_COST})
              </button>
            )}
            {ownSettlement && upgradeLabel && (
              <button className="btn-action" onClick={() => onUpgrade(ownSettlement.id)}>
                {upgradeLabel}
              </button>
            )}
            {ownSettlement && ownSettlement.level !== 'outpost' && !ownSettlement.specialization && (
              <button className="btn-action" onClick={() => setPickingSpec(true)}>
                Specialize
              </button>
            )}
            {ownSettlement && (
              <button className="btn-action" onClick={onStartConnect}>
                Connect ({routeCost(state)})
              </button>
            )}
            <button className="btn-action" onClick={onOpenTech}>
              Growth Tree
            </button>
          </div>
          <button className="btn-end-turn" onClick={onEndTurn}>
            End Turn
          </button>
        </>
      )}
    </div>
  );
}
