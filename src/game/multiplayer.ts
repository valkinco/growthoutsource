import { createClient } from '@supabase/supabase-js';
import { createMultiplayerGame } from './state';
import type { GameState, GuildId } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export function isMultiplayerConfigured(): boolean {
  return !!supabase;
}

interface GameRow {
  id: string;
  status: 'waiting' | 'active';
  guild_a: GuildId;
  guild_b: GuildId | null;
  seed: string;
  state: GameState | null;
}

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createRoom(guildA: GuildId): Promise<string> {
  if (!supabase) throw new Error('Multiplayer is not set up yet.');
  const code = randomCode();
  const seed = Math.random().toString(36).slice(2, 10);
  const { error } = await supabase.from('games').insert({ id: code, status: 'waiting', guild_a: guildA, guild_b: null, seed, state: null });
  if (error) throw new Error(error.message);
  return code;
}

export async function getRoom(code: string): Promise<GameRow | null> {
  if (!supabase) throw new Error('Multiplayer is not set up yet.');
  const { data, error } = await supabase.from('games').select('*').eq('id', code).maybeSingle();
  if (error) throw new Error(error.message);
  return data as GameRow | null;
}

export async function joinRoom(code: string, guildB: GuildId): Promise<GameState> {
  if (!supabase) throw new Error('Multiplayer is not set up yet.');
  const room = await getRoom(code);
  if (!room) throw new Error('No game found with that code.');
  if (room.status !== 'waiting') throw new Error('That game already has two players.');

  const state = createMultiplayerGame(room.seed, room.guild_a, guildB);
  state.phase = 'playing';

  // .eq('status','waiting') + checking the returned rows guards against two
  // people joining the same room at nearly the same moment.
  const { data, error } = await supabase
    .from('games')
    .update({ guild_b: guildB, status: 'active', state })
    .eq('id', code)
    .eq('status', 'waiting')
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('That game already has two players.');
  return state;
}

export async function pushGameState(code: string, state: GameState): Promise<void> {
  if (!supabase) return;
  await supabase.from('games').update({ state }).eq('id', code);
}

export async function fetchGameState(code: string): Promise<GameState | null> {
  const room = await getRoom(code);
  return room?.state ?? null;
}
