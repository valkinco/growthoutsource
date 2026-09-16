import { useEffect, useRef, useState } from 'react';
import { GUILDS, startingTech } from '../game/guilds';
import { TECH_TREE } from '../game/tech';
import type { GameState, GuildId, PlayerId } from '../game/types';
import { createRoom, getRoom, isMultiplayerConfigured, joinRoom } from '../game/multiplayer';

function startingTechName(guildId: GuildId): string {
  const id = startingTech(guildId)[0];
  return TECH_TREE.find((t) => t.id === id)?.name ?? '';
}

interface Props {
  onReady: (state: GameState, roomCode: string, mySide: PlayerId) => void;
  onBack: () => void;
}

type Step = 'choice' | 'createGuild' | 'waiting' | 'joinCode' | 'joinGuild' | 'error';

export function MultiplayerLobby({ onReady, onBack }: Props) {
  const [step, setStep] = useState<Step>('choice');
  const [roomCode, setRoomCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
  }, []);

  if (!isMultiplayerConfigured()) {
    return (
      <div className="intro-screen">
        <div className="intro-text-card">
          <h1>Multiplayer isn't set up yet</h1>
          <p className="intro-line">This build doesn't have Supabase credentials configured, so async 2-player games can't be created right now.</p>
          <button className="btn-primary" onClick={onBack}>Back</button>
        </div>
      </div>
    );
  }

  async function handleCreate(guild: GuildId) {
    setBusy(true);
    setError(null);
    try {
      const code = await createRoom(guild);
      setRoomCode(code);
      setStep('waiting');
      pollRef.current = window.setInterval(async () => {
        try {
          const room = await getRoom(code);
          if (room?.status === 'active' && room.state) {
            if (pollRef.current) window.clearInterval(pollRef.current);
            onReady(room.state, code, 'player');
          }
        } catch {
          // transient network error — keep polling
        }
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create a game.');
      setStep('error');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(guild: GuildId) {
    setBusy(true);
    setError(null);
    try {
      const state = await joinRoom(joinCodeInput.trim().toUpperCase(), guild);
      onReady(state, joinCodeInput.trim().toUpperCase(), 'rival');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join that game.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="intro-screen">
      <div className="intro-text-card guild-pick">
        {step === 'choice' && (
          <>
            <h1>2-Player Game</h1>
            <p className="subtitle">Play a shared map by turns — no need to be online at the same time.</p>
            <div className="menu-choices">
              <button className="btn-primary" onClick={() => setStep('createGuild')}>Create a Game</button>
              <button className="btn-secondary menu-secondary" onClick={() => setStep('joinCode')}>Join with a Code</button>
              <button className="btn-ghost" onClick={onBack}>Back</button>
            </div>
          </>
        )}

        {step === 'createGuild' && (
          <>
            <h1>Choose Your Guild</h1>
            <div className="guild-grid">
              {GUILDS.map((g) => (
                <button key={g.id} className="guild-card" disabled={busy} onClick={() => handleCreate(g.id)}>
                  <h3>{g.name}</h3>
                  <p className="guild-desc">{g.description}</p>
                  <p className="guild-starting-tech">Starts with: {startingTechName(g.id)}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'waiting' && (
          <>
            <h1>Waiting for Player 2</h1>
            <p className="intro-line">Share this code with whoever you're playing against:</p>
            <div className="room-code">{roomCode}</div>
            <p className="stats-line">This screen updates automatically once they join.</p>
            <button className="btn-ghost" onClick={onBack}>Cancel</button>
          </>
        )}

        {step === 'joinCode' && (
          <>
            <h1>Join a Game</h1>
            <input
              className="code-input"
              placeholder="ROOM CODE"
              value={joinCodeInput}
              maxLength={5}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            />
            <div className="menu-choices">
              <button className="btn-primary" disabled={joinCodeInput.length < 5} onClick={() => setStep('joinGuild')}>
                Continue
              </button>
              <button className="btn-ghost" onClick={() => setStep('choice')}>Back</button>
            </div>
          </>
        )}

        {step === 'joinGuild' && (
          <>
            <h1>Choose Your Guild</h1>
            <div className="guild-grid">
              {GUILDS.map((g) => (
                <button key={g.id} className="guild-card" disabled={busy} onClick={() => handleJoin(g.id)}>
                  <h3>{g.name}</h3>
                  <p className="guild-desc">{g.description}</p>
                  <p className="guild-starting-tech">Starts with: {startingTechName(g.id)}</p>
                </button>
              ))}
            </div>
            {error && <p className="error-line">{error}</p>}
          </>
        )}

        {step === 'error' && (
          <>
            <h1>Something went wrong</h1>
            <p className="intro-line">{error}</p>
            <button className="btn-primary" onClick={() => setStep('choice')}>Back</button>
          </>
        )}
      </div>
    </div>
  );
}
