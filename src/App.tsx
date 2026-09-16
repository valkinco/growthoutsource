import { useEffect, useRef, useState } from 'react';
import type { ChallengeMove, GameState, GuildId, PlayerId, Specialization } from './game/types';
import { createNewGame } from './game/state';
import {
  moveFounder,
  foundSettlement,
  upgradeSettlement,
  setSpecialization,
  connectSettlements,
  unlockTech,
  resolveGuardianChallenge,
  resolveRivalChallenge,
  openGuardianChallenge,
  endTurn,
} from './game/actions';
import { saveGame, loadGame, clearSave } from './game/save';
import { fetchGameState, pushGameState } from './game/multiplayer';
import { cubeDistance } from './game/hex';
import { HexCanvas } from './render/HexCanvas';
import { HUD } from './ui/HUD';
import { ActionBar } from './ui/ActionBar';
import { ChallengeModal } from './ui/ChallengeModal';
import { JournalModal } from './ui/JournalModal';
import { TechModal } from './ui/TechModal';
import { TileInfoPanel } from './ui/TileInfoPanel';
import { IntroScreen } from './ui/IntroScreen';
import { EndScreen } from './ui/EndScreen';
import { MainMenu } from './ui/MainMenu';
import { MultiplayerLobby } from './ui/MultiplayerLobby';
import { playSfx, startAmbientMusic, isMusicOn, isSoundOn, toggleMusic, toggleSound } from './audio/audio';
import { haptic } from './audio/haptics';
import './index.css';

function newSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

const MP_SESSION_KEY = 'growthbound.mp.session';

type Screen = 'menu' | 'solo' | 'mpLobby' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [state, setState] = useState<GameState | null>(null);
  const [mySide, setMySide] = useState<PlayerId>('player');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [selectedTile, setSelectedTile] = useState<{ q: number; r: number } | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [musicOn, setMusicOn] = useState(isMusicOn());
  const [soundOn, setSoundOn] = useState(isSoundOn());
  const suppressNextPushRef = useRef(false);

  // Resume a solo save, or reconnect to a multiplayer room, on load/refresh.
  useEffect(() => {
    const soloSave = loadGame();
    if (soloSave) {
      setState(soloSave);
      setMySide('player');
      setScreen('game');
      return;
    }
    try {
      const raw = localStorage.getItem(MP_SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw) as { roomCode: string; mySide: PlayerId };
        fetchGameState(session.roomCode).then((remote) => {
          if (remote) {
            setState(remote);
            setMySide(session.mySide);
            setRoomCode(session.roomCode);
            setScreen('game');
          }
        });
      }
    } catch {
      // ignore malformed session
    }
  }, []);

  useEffect(() => {
    if (state && state.mode === 'solo' && state.phase === 'playing') saveGame(state);
  }, [state]);

  // Push local changes to the room. Skipped once right after a state was pulled
  // FROM the room, so polling and pushing don't echo forever.
  useEffect(() => {
    if (!state || state.mode !== 'multiplayer' || !roomCode) return;
    if (suppressNextPushRef.current) {
      suppressNextPushRef.current = false;
      return;
    }
    pushGameState(roomCode, state).catch(() => {});
  }, [state, roomCode]);

  // Poll for the opponent's move while it isn't our turn.
  useEffect(() => {
    if (!state || state.mode !== 'multiplayer' || !roomCode) return;
    if (state.activeSide === mySide) return;
    const interval = setInterval(async () => {
      try {
        const remote = await fetchGameState(roomCode);
        if (remote && (remote.turn !== state.turn || remote.activeSide !== state.activeSide)) {
          suppressNextPushRef.current = true;
          setState(remote);
        }
      } catch {
        // transient network error — try again next tick
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [state, roomCode, mySide]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const isMyTurn = !state || state.mode !== 'multiplayer' || state.activeSide === mySide;

  function handleStartSolo(guild: GuildId) {
    const fresh = createNewGame(newSeed(), guild);
    fresh.phase = 'playing';
    setState(fresh);
    setMySide('player');
    setRoomCode(null);
    setScreen('game');
    startAmbientMusic();
  }

  function handleMultiplayerReady(gameState: GameState, code: string, side: PlayerId) {
    setState(gameState);
    setMySide(side);
    setRoomCode(code);
    setScreen('game');
    try {
      localStorage.setItem(MP_SESSION_KEY, JSON.stringify({ roomCode: code, mySide: side }));
    } catch {
      // ignore
    }
    startAmbientMusic();
  }

  function handleRestart() {
    clearSave();
    try {
      localStorage.removeItem(MP_SESSION_KEY);
    } catch {
      // ignore
    }
    setState(null);
    setRoomCode(null);
    setConnectSourceId(null);
    setSelectedTile(null);
    setScreen('menu');
  }

  function applyOutcome(outcome: { state: GameState; message?: string }) {
    setState(outcome.state);
    if (outcome.message) setToast(outcome.message);
  }

  function handleTileClick(q: number, r: number) {
    if (!state || !isMyTurn) return;
    const founder = state.founders[state.activeSide];
    const dist = cubeDistance(founder, { q, r });

    if (connectSourceId) {
      const tile = state.tiles[`${q},${r}`];
      if (tile?.settlementId && state.settlements[tile.settlementId]?.owner === state.activeSide && tile.settlementId !== connectSourceId) {
        const outcome = connectSettlements(state, connectSourceId, tile.settlementId);
        applyOutcome(outcome);
        playSfx('route');
        setConnectSourceId(null);
      }
      return;
    }

    if (dist === 1) {
      const outcome = moveFounder(state, { q, r });
      applyOutcome(outcome);
      playSfx('reveal');
      haptic('light');
      if (outcome.state.pendingChallenge) {
        playSfx(outcome.state.pendingChallenge.kind === 'guardian' ? 'guardian' : 'rival');
        haptic('medium');
      }
      return;
    }

    setSelectedTile({ q, r });
  }

  function handleFound() {
    if (!state) return;
    const ownedCount = Object.values(state.settlements).filter((s) => s.owner === state.activeSide).length;
    const outcome = foundSettlement(state, `Outpost ${ownedCount + 1}`);
    applyOutcome(outcome);
    if (outcome.state !== state) playSfx('upgrade');
  }

  function handleUpgrade(settlementId: string) {
    if (!state) return;
    const outcome = upgradeSettlement(state, settlementId);
    applyOutcome(outcome);
    if (outcome.state !== state) playSfx('upgrade');
  }

  function handleSpecialize(settlementId: string, spec: Specialization) {
    if (!state) return;
    applyOutcome(setSpecialization(state, settlementId, spec));
  }

  function handleUnlockTech(techId: string, cost: number) {
    if (!state) return;
    const outcome = unlockTech(state, techId, cost);
    applyOutcome(outcome);
    if (outcome.state !== state) playSfx('tech');
  }

  function handleChallengeGuardian() {
    if (!state) return;
    applyOutcome(openGuardianChallenge(state));
    playSfx('guardian');
  }

  function handleChallengeMove(move: ChallengeMove) {
    if (!state || !state.pendingChallenge) return;
    const isGuardian = state.pendingChallenge.kind === 'guardian';
    const { state: next, result } = isGuardian ? resolveGuardianChallenge(state, move) : resolveRivalChallenge(state, move);
    setState(next);
    setToast(result.log);
    const won = result.winner === state.activeSide;
    playSfx(won ? (isGuardian ? 'victory' : 'comeback') : 'defeat');
    haptic(won ? 'heavy' : 'medium');
  }

  function handleEndTurn() {
    if (!state) return;
    const next = endTurn(state);
    setState(next);
    playSfx('endTurn');
    if (next.phase === 'defeat') playSfx('defeat');
  }

  if (screen === 'menu') {
    return <MainMenu onSolo={() => setScreen('solo')} onMultiplayer={() => setScreen('mpLobby')} />;
  }

  if (screen === 'solo') {
    return <IntroScreen onStart={handleStartSolo} />;
  }

  if (screen === 'mpLobby') {
    return <MultiplayerLobby onReady={handleMultiplayerReady} onBack={() => setScreen('menu')} />;
  }

  if (!state) {
    return <MainMenu onSolo={() => setScreen('solo')} onMultiplayer={() => setScreen('mpLobby')} />;
  }

  if (state.phase === 'victory' || state.phase === 'defeat') {
    return <EndScreen state={state} mySide={mySide} onRestart={handleRestart} />;
  }

  return (
    <div className="app-root">
      <HUD
        state={state}
        musicOn={musicOn}
        soundOn={soundOn}
        onToggleMusic={() => setMusicOn(toggleMusic())}
        onToggleSound={() => setSoundOn(toggleSound())}
        onOpenJournal={() => setJournalOpen(true)}
      />

      <div className="map-area">
        <HexCanvas state={state} onTileClick={handleTileClick} />
        {selectedTile && (
          <TileInfoPanel state={state} q={selectedTile.q} r={selectedTile.r} onClose={() => setSelectedTile(null)} />
        )}
        {toast && <div className="toast">{toast}</div>}
        {roomCode && <div className="room-code-badge">Room {roomCode}</div>}
      </div>

      <ActionBar
        state={state}
        connectMode={!!connectSourceId}
        isMyTurn={isMyTurn}
        onFound={handleFound}
        onUpgrade={handleUpgrade}
        onSpecialize={handleSpecialize}
        onStartConnect={() => {
          const founder = state.founders[state.activeSide];
          const tile = state.tiles[`${founder.q},${founder.r}`];
          if (tile?.settlementId) setConnectSourceId(tile.settlementId);
        }}
        onCancelConnect={() => setConnectSourceId(null)}
        onOpenTech={() => setTechOpen(true)}
        onEndTurn={handleEndTurn}
        onChallengeGuardian={handleChallengeGuardian}
      />

      {state.pendingChallenge && isMyTurn && (
        <ChallengeModal state={state} kind={state.pendingChallenge.kind} onChoose={handleChallengeMove} />
      )}
      {journalOpen && <JournalModal state={state} onClose={() => setJournalOpen(false)} />}
      {techOpen && <TechModal state={state} onUnlock={handleUnlockTech} onClose={() => setTechOpen(false)} />}
    </div>
  );
}
