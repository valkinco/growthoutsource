import type { GameState, PlayerId } from '../game/types';

interface Props {
  state: GameState;
  mySide: PlayerId;
  onRestart: () => void;
}

const LEVEL_POINTS: Record<string, number> = { outpost: 5, town: 12, city: 25 };

function computeScore(state: GameState, side: PlayerId) {
  const settlements = Object.values(state.settlements).filter((s) => s.owner === side);
  const settlementPoints = settlements.reduce((sum, s) => sum + (LEVEL_POINTS[s.level] ?? 0), 0);
  const techPoints = state.unlockedTech[side].length * 8;
  const momentumPoints = state.momentum[side];
  const speedBonus = state.phase === 'victory' && state.winnerSide === side ? Math.max(0, 200 - state.turn * 4) : 0;
  const total = settlementPoints + techPoints + momentumPoints + speedBonus;
  return { settlementPoints, techPoints, momentumPoints, speedBonus, total, settlementCount: settlements.length };
}

export function EndScreen({ state, mySide, onRestart }: Props) {
  const victory = state.phase === 'victory';
  const iWon = state.winnerSide === mySide;
  const title =
    state.mode === 'multiplayer'
      ? iWon
        ? 'You Reached the Beacon'
        : 'Your Rival Reached the Beacon First'
      : victory
      ? 'The Beacon Wakes'
      : 'The Silence Returns';
  const score = computeScore(state, mySide);

  return (
    <div className="intro-screen">
      <div className="intro-text-card">
        <h1>{title}</h1>
        <p className="intro-line">{state.ending}</p>

        <div className="score-board">
          <div className="score-total">{score.total}</div>
          <div className="score-total-label">Founder Score</div>
          <div className="score-rows">
            <div className="score-row"><span>Settlements ({score.settlementCount})</span><span>{score.settlementPoints}</span></div>
            <div className="score-row"><span>Tech unlocked ({state.unlockedTech[mySide].length})</span><span>{score.techPoints}</span></div>
            <div className="score-row"><span>Momentum banked</span><span>{score.momentumPoints}</span></div>
            {score.speedBonus > 0 && (
              <div className="score-row"><span>Speed bonus (turn {state.turn})</span><span>{score.speedBonus}</span></div>
            )}
          </div>
        </div>

        <button className="btn-primary" onClick={onRestart}>
          {victory ? 'Play Again' : 'Try Again'}
        </button>
      </div>
    </div>
  );
}
