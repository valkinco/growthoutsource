interface Props {
  onSolo: () => void;
  onMultiplayer: () => void;
}

export function MainMenu({ onSolo, onMultiplayer }: Props) {
  return (
    <div className="intro-screen">
      <div className="intro-text-card">
        <h1>Growthbound: The Last Signal</h1>
        <p className="subtitle">A world went silent. Reconnect it.</p>
        <div className="menu-choices">
          <button className="btn-primary" onClick={onSolo}>
            Solo Campaign
          </button>
          <button className="btn-secondary menu-secondary" onClick={onMultiplayer}>
            2-Player (async, play by turns)
          </button>
        </div>
      </div>
    </div>
  );
}
