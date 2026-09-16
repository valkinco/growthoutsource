// Core data model for Growthbound: The Last Signal.
// Kept free of any rendering/DOM concerns so it can run headless (tests, sims, future native app).
//
// The state is indexed by "side" (player/rival) for founder, momentum, guild, traits,
// and tech so the same engine drives both Solo (rival = AI) and async 2-player
// (rival = a second human) without two parallel game implementations.

export type Axial = { q: number; r: number };

export function axialKey(a: Axial): string {
  return `${a.q},${a.r}`;
}

export type TerrainType =
  | 'plains'
  | 'forest'
  | 'mountain'
  | 'water'
  | 'ruins'
  | 'resource'
  | 'signalTower'
  | 'beacon';

export type VeilState = 'hidden' | 'clue' | 'revealed';

export interface Tile {
  q: number;
  r: number;
  terrain: TerrainType;
  veil: VeilState;
  /** true once a settlement stands on this tile */
  settlementId?: string;
  /** guardian standing watch on this tile (usually the beacon tile) */
  guardianId?: string;
  /** hint text shown while the tile is still under a clue, e.g. "smoke on the horizon" */
  clueHint?: string;
}

export type PlayerId = 'player' | 'rival';

export function otherSide(side: PlayerId): PlayerId {
  return side === 'player' ? 'rival' : 'player';
}

export type SettlementLevel = 'outpost' | 'town' | 'city';
export type Specialization = 'maker' | 'market' | 'watchtower' | 'bastion' | null;

export interface Settlement {
  id: string;
  owner: PlayerId;
  q: number;
  r: number;
  level: SettlementLevel;
  specialization: Specialization;
  connected: boolean;
  name: string;
}

export interface Route {
  id: string;
  a: string; // settlement id
  b: string; // settlement id
}

export type TraitName = 'vision' | 'execution' | 'grit' | 'resilience';
export type Traits = Record<TraitName, number>;

export type GuildId = 'pathfinders' | 'forgeborn' | 'unbroken' | 'keepers';

export interface Guild {
  id: GuildId;
  name: string;
  coreTrait: TraitName;
  description: string;
  strength: string;
  weakness: string;
}

export type TechBranch = 'explore' | 'build' | 'connect' | 'challenge';

export interface Tech {
  id: string;
  branch: TechBranch;
  name: string;
  tier: number; // 1-4
  description: string;
  cost: number;
}

export interface Guardian {
  id: string;
  name: string;
  theme: string;
  q: number;
  r: number;
  strength: number; // used in challenge resolution
  resolved: boolean;
  outcome?: 'befriended' | 'defeated' | 'released';
}

export type ChallengeMove = 'push' | 'build' | 'endure';

export interface ChallengeResult {
  playerMove: ChallengeMove;
  rivalMove: ChallengeMove;
  playerScore: number;
  rivalScore: number;
  winner: PlayerId | 'draw';
  log: string;
}

export interface StoryEntry {
  id: string;
  title: string;
  text: string;
  turn: number;
}

export type GamePhase = 'intro' | 'playing' | 'challenge' | 'victory' | 'defeat';

export type GameMode = 'solo' | 'multiplayer';

export interface FounderState {
  q: number;
  r: number;
  movement: number;
  movementRemaining: number;
  retreating: boolean;
}

export interface GameState {
  seed: string;
  mode: GameMode;
  turn: number;
  phase: GamePhase;
  mapRadius: number;
  tiles: Record<string, Tile>;
  settlements: Record<string, Settlement>;
  routes: Route[];
  guardian: Guardian;
  founders: Record<PlayerId, FounderState>;
  /** whose turn it is to act; always 'player' in Solo mode (the AI never "acts" through a founder) */
  activeSide: PlayerId;
  guilds: Record<PlayerId, GuildId>;
  traits: Record<PlayerId, Traits>;
  momentum: Record<PlayerId, number>;
  unlockedTech: Record<PlayerId, string[]>;
  journal: StoryEntry[];
  pendingChallenge: { targetQ: number; targetR: number; kind: 'guardian' | 'rival' } | null;
  /**
   * Each side's default response if challenged before their next turn — lets
   * multiplayer Challenges resolve fairly without the defender needing to be
   * online at that moment. Not shown to the attacker outright; they see the
   * same Vision-gated fuzzy read as against the Solo AI (see ai.ts).
   */
  standingPosture: Record<PlayerId, ChallengeMove>;
  beaconActivated: boolean;
  lastRivalIntent: ChallengeMove | null;
  ending: string | null;
  /** set once the campaign ends, so a multiplayer client can tell "you won" from "you lost" */
  winnerSide: PlayerId | null;
}
