import { useState } from 'react';
import type { ChallengeMove, GameState, Specialization } from '../game/types';
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
  onChallengeGuardian: () => void;
  onSetPosture: (move: ChallengeMove) => void;
  isMyTurn: boolean;
}

const SPECS: Specialization[] = ['maker', 'market', 'watchtower', 'bastion'];
const POSTURES: ChallengeMove[] = ['push', 'build', 'endure'];

export function ActionBar({
  state,
  connectMode,
  onFound,
  onUpgrade,
  onSpecialize,
  onStartConnect,
  onCancelConnect,
  onOpenTech,
  onEndTurn,
  onChallengeGuardian,
  onSetPosture,
  isMyTurn,
}: Props) {
  const [pickingSpec, setPickingSpec] = useState(false);
  const [pickingPosture, setPickingPosture] = useState(false);
  const side = state.activeSide;

  if (!isMyTurn) {
    return (
      <div className="action-bar">
        <div className="waiting-bar">Waiting for your rival's turn…</div>
      </div>
    );
  }

  const founder = state.founders[side];
  const tile = state.tiles[axialKey(founder)];
  const settlement = tile?.settlementId ? state.settlements[tile.settlementId] : undefined;
  const ownSettlement = settlement?.owner === side ? settlement : undefined;
  const canChallengeGuardian = !!tile?.guardianId && !state.guardian.resolved && !state.pendingChallenge;

  const canFound = !tile?.settlementId && ['plains', 'forest', 'resource'].includes(tile?.terrain ?? '');
  const upgradeLabel = ownSettlement
    ? ownSettlement.level === 'outpost'
      ? `Grow to Town (${upgradeCost(state, side, 'town')})`
      : ownSettlement.level === 'town'
      ? `Grow to City (${upgradeCost(state, side, 'city')})`
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
      ) : pickingPosture ? (
        <div className="spec-picker">
          <span className="posture-label">If challenged while you're away:</span>
          {POSTURES.map((m) => (
            <button
              key={m}
              className={`btn-secondary ${state.standingPosture[side] === m ? 'active' : ''}`}
              onClick={() => { onSetPosture(m); setPickingPosture(false); }}
            >
              {m}
            </button>
          ))}
          <button className="btn-ghost" onClick={() => setPickingPosture(false)}>Cancel</button>
        </div>
      ) : (
        <>
          <div className="action-group">
            {canChallengeGuardian && (
              <button className="btn-action" onClick={onChallengeGuardian}>
                Challenge Guardian
              </button>
            )}
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
                Connect ({routeCost(state, side)})
              </button>
            )}
            {state.mode === 'multiplayer' && (
              <button className="btn-action" onClick={() => setPickingPosture(true)}>
                Standing Order: {state.standingPosture[side]}
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
