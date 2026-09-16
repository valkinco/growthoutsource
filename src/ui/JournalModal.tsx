import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  onClose: () => void;
}

export function JournalModal({ state, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card journal-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Founder's Journal</h2>
        <div className="journal-list">
          {[...state.journal].reverse().map((entry) => (
            <div key={entry.id} className="journal-entry">
              <div className="journal-turn">Turn {entry.turn}</div>
              <h3>{entry.title}</h3>
              <p>{entry.text}</p>
            </div>
          ))}
        </div>
        <button className="btn-primary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
