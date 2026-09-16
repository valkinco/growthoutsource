import { useState } from 'react';
import { GUILDS, startingTech } from '../game/guilds';
import { TECH_TREE } from '../game/tech';
import type { GuildId } from '../game/types';

function startingTechName(guildId: GuildId): string {
  const id = startingTech(guildId)[0];
  return TECH_TREE.find((t) => t.id === id)?.name ?? '';
}

interface Props {
  onStart: (guild: GuildId) => void;
}

const STORY_BEATS = [
  'Long ago, the Lumen Network carried knowledge and trade to every corner of Asterra.',
  'Then came the Great Silence. In a single night, every connection went dark.',
  'You grew up in a dying settlement at the edge of the map — raised by a mother who kept singing anyway, and a father the Silence had hollowed out long before it took the world.',
  'During a storm, beneath a fallen tower, you found something that should not still be working.',
  'A small, warm light. The Last Signal.',
  'Somewhere out there, a Beacon answered back.',
];

export function IntroScreen({ onStart }: Props) {
  const [beat, setBeat] = useState(0);
  const [pickingGuild, setPickingGuild] = useState(false);

  if (!pickingGuild) {
    return (
      <div className="intro-screen">
        <div className="intro-text-card">
          <p className="intro-line">{STORY_BEATS[beat]}</p>
          <div className="intro-actions">
            <button className="btn-ghost" onClick={() => setPickingGuild(true)}>
              Skip
            </button>
            <button
              className="btn-primary"
              onClick={() => (beat < STORY_BEATS.length - 1 ? setBeat(beat + 1) : setPickingGuild(true))}
            >
              {beat < STORY_BEATS.length - 1 ? 'Continue' : 'Begin'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="intro-screen">
      <div className="intro-text-card guild-pick">
        <h1>Growthbound: The Last Signal</h1>
        <p className="subtitle">Choose your Guild</p>
        <div className="guild-grid">
          {GUILDS.map((g) => (
            <button key={g.id} className="guild-card" onClick={() => onStart(g.id)}>
              <h3>{g.name}</h3>
              <p className="guild-desc">{g.description}</p>
              <p className="guild-strength">+ {g.strength}</p>
              <p className="guild-weakness">{'−'} {g.weakness}</p>
              <p className="guild-starting-tech">Starts with: {startingTechName(g.id)}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
