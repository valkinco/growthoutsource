import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  onRestart: () => void;
}

export function EndScreen({ state, onRestart }: Props) {
  const victory = state.phase === 'victory';
  return (
    <div className="intro-screen">
      <div className="intro-text-card">
        <h1>{victory ? 'The Beacon Wakes' : 'The Silence Returns'}</h1>
        <p className="intro-line">{state.ending}</p>
        <p className="stats-line">
          Finished on turn {state.turn} with {state.momentum} Momentum and {Object.values(state.settlements).filter((s) => s.owner === 'player').length} settlement(s).
        </p>
        <button className="btn-primary" onClick={onRestart}>
          {victory ? 'Play Again' : 'Try Again'}
        </button>
      </div>
    </div>
  );
}
