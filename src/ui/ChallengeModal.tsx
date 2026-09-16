import { GUILDS } from '../game/guilds';
import type { ChallengeMove, GameState } from '../game/types';
import { otherSide } from '../game/types';
import { perceivedOpponentMove, guardianDifficultyLabel } from '../game/ai';

interface Props {
  state: GameState;
  kind: 'guardian' | 'rival';
  onChoose: (move: ChallengeMove) => void;
}

const MOVE_INFO: Record<ChallengeMove, { label: string; hint: string }> = {
  push: { label: 'PUSH', hint: 'Move fast and seize it now.' },
  build: { label: 'BUILD', hint: 'Strengthen your position first.' },
  endure: { label: 'ENDURE', hint: 'Hold steady and wait for an opening.' },
};

export function ChallengeModal({ state, kind, onChoose }: Props) {
  const perceived = kind === 'rival' ? perceivedOpponentMove(state) : null;
  const opp = otherSide(state.activeSide);
  const opponentTitle =
    state.mode === 'multiplayer'
      ? `${opp === 'player' ? 'Player 1' : 'Player 2'}'s ${GUILDS.find((g) => g.id === state.guilds[opp])?.name ?? 'settlement'}`
      : 'The Iron Ledger';

  return (
    <div className="modal-overlay">
      <div className="modal-card challenge-modal">
        <h2>{kind === 'guardian' ? state.guardian.name : opponentTitle}</h2>
        {kind === 'guardian' ? (
          <p>
            The Guardian is {guardianDifficultyLabel(state.guardian.strength)}. PUSH to defeat it, BUILD to repair and
            befriend it, or ENDURE and let it release the Beacon on its own.
          </p>
        ) : (
          <>
            {state.mode === 'multiplayer' && (
              <p className="stats-line">They aren't here to answer live — this resolves against their standing orders.</p>
            )}
            <p>
              {perceived?.confident ? 'Their likely move:' : 'Your read on them (uncertain):'}{' '}
              <strong>{perceived && MOVE_INFO[perceived.move].label}</strong> {'—'} {perceived && MOVE_INFO[perceived.move].hint}
            </p>
          </>
        )}
        <div className="move-grid">
          {(Object.keys(MOVE_INFO) as ChallengeMove[]).map((m) => (
            <button key={m} className="move-btn" onClick={() => onChoose(m)}>
              <strong>{MOVE_INFO[m].label}</strong>
              <span>{MOVE_INFO[m].hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
