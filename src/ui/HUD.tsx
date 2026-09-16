import type { GameState } from '../game/types';
import { GUILDS } from '../game/guilds';

interface Props {
  state: GameState;
  musicOn: boolean;
  soundOn: boolean;
  onToggleMusic: () => void;
  onToggleSound: () => void;
  onOpenJournal: () => void;
}

export function HUD({ state, musicOn, soundOn, onToggleMusic, onToggleSound, onOpenJournal }: Props) {
  const side = state.activeSide;
  const guild = GUILDS.find((g) => g.id === state.guilds[side]);
  const founder = state.founders[side];
  return (
    <div className="hud">
      <div className="hud-left">
        <div className="momentum-badge">
          <span className="momentum-value">{state.momentum[side]}</span>
          <span className="momentum-label">Momentum</span>
        </div>
        <div className="turn-badge">Turn {state.turn}</div>
        <div className="movement-pips" aria-label={`${founder.movementRemaining} of ${founder.movement} moves remaining`}>
          {Array.from({ length: founder.movement }).map((_, i) => (
            <span key={i} className={`pip ${i < founder.movementRemaining ? 'filled' : ''}`} />
          ))}
        </div>
      </div>
      <div className="hud-center">
        <span className="guild-tag">
          {state.mode === 'multiplayer' ? (side === 'player' ? 'Player 1' : 'Player 2') : ''} {guild?.name}
        </span>
      </div>
      <div className="hud-right">
        <button className="icon-btn" onClick={onOpenJournal} aria-label="Story journal">
          📜
        </button>
        <button className="icon-btn" onClick={onToggleMusic} aria-label="Toggle music">
          {musicOn ? '🎵' : '🔇'}
        </button>
        <button className="icon-btn" onClick={onToggleSound} aria-label="Toggle sound effects">
          {soundOn ? '🔊' : '🔈'}
        </button>
      </div>
    </div>
  );
}
