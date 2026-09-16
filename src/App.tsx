import { useEffect, useState } from 'react';
import type { ChallengeMove, GameState, GuildId, Specialization } from './game/types';
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
import { playSfx, startAmbientMusic, isMusicOn, isSoundOn, toggleMusic, toggleSound } from './audio/audio';
import './index.css';

function newSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [state, setState] = useState<GameState | null>(() => loadGame());
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [selectedTile, setSelectedTile] = useState<{ q: number; r: number } | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [musicOn, setMusicOn] = useState(isMusicOn());
  const [soundOn, setSoundOn] = useState(isSoundOn());

  useEffect(() => {
    if (state && state.phase === 'playing') saveGame(state);
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  function handleStart(guild: GuildId) {
    const fresh = createNewGame(newSeed(), guild);
    fresh.phase = 'playing';
    setState(fresh);
    startAmbientMusic();
  }

  function handleRestart() {
    clearSave();
    setState(null);
    setConnectSourceId(null);
    setSelectedTile(null);
  }

  function applyOutcome(outcome: { state: GameState; message?: string }) {
    setState(outcome.state);
    if (outcome.message) setToast(outcome.message);
  }

  function handleTileClick(q: number, r: number) {
    if (!state) return;
    const dist = cubeDistance(state.founder, { q, r });

    if (connectSourceId) {
      const tile = state.tiles[`${q},${r}`];
      if (tile?.settlementId && state.settlements[tile.settlementId]?.owner === 'player' && tile.settlementId !== connectSourceId) {
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
      if (outcome.state.pendingChallenge) playSfx(outcome.state.pendingChallenge.kind === 'guardian' ? 'guardian' : 'rival');
      return;
    }

    setSelectedTile({ q, r });
  }

  function handleFound() {
    if (!state) return;
    const outcome = foundSettlement(state, `Outpost ${Object.keys(state.settlements).length}`);
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

  function handleChallengeMove(move: ChallengeMove) {
    if (!state || !state.pendingChallenge) return;
    const isGuardian = state.pendingChallenge.kind === 'guardian';
    const { state: next, result } = isGuardian ? resolveGuardianChallenge(state, move) : resolveRivalChallenge(state, move);
    setState(next);
    setToast(result.log);
    playSfx(result.winner === 'player' ? (isGuardian ? 'victory' : 'comeback') : 'defeat');
  }

  function handleChallengeGuardian() {
    if (!state) return;
    applyOutcome(openGuardianChallenge(state));
    playSfx('guardian');
  }

  function handleEndTurn() {
    if (!state) return;
    const next = endTurn(state);
    setState(next);
    playSfx('endTurn');
    if (next.phase === 'defeat') playSfx('defeat');
  }

  if (!state) {
    return <IntroScreen onStart={handleStart} />;
  }

  if (state.phase === 'victory' || state.phase === 'defeat') {
    return <EndScreen state={state} onRestart={handleRestart} />;
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
      </div>

      <ActionBar
        state={state}
        connectMode={!!connectSourceId}
        onFound={handleFound}
        onUpgrade={handleUpgrade}
        onSpecialize={handleSpecialize}
        onStartConnect={() => {
          const tile = state.tiles[`${state.founder.q},${state.founder.r}`];
          if (tile?.settlementId) setConnectSourceId(tile.settlementId);
        }}
        onCancelConnect={() => setConnectSourceId(null)}
        onOpenTech={() => setTechOpen(true)}
        onEndTurn={handleEndTurn}
        onChallengeGuardian={handleChallengeGuardian}
      />

      {state.pendingChallenge && (
        <ChallengeModal state={state} kind={state.pendingChallenge.kind} onChoose={handleChallengeMove} />
      )}
      {journalOpen && <JournalModal state={state} onClose={() => setJournalOpen(false)} />}
      {techOpen && <TechModal state={state} onUnlock={handleUnlockTech} onClose={() => setTechOpen(false)} />}
    </div>
  );
}
