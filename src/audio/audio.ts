// Lightweight synthesized SFX/ambient hum — no external audio assets required for the vertical slice.
// Respects browser autoplay rules: audio context only starts after a user gesture.

type SfxName = 'reveal' | 'momentum' | 'upgrade' | 'route' | 'tech' | 'ruins' | 'rival' | 'beacon' | 'guardian' | 'endTurn' | 'victory' | 'defeat' | 'comeback';

let ctx: AudioContext | null = null;
let musicOn = loadPref('growthbound.music', true);
let soundOn = loadPref('growthbound.sound', true);
let musicNodes: { osc: OscillatorNode; gain: GainNode }[] = [];

function loadPref(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

function savePref(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // ignore
  }
}

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const SFX_FREQ: Record<SfxName, [number, number]> = {
  reveal: [520, 0.08],
  momentum: [660, 0.1],
  upgrade: [440, 0.18],
  route: [500, 0.14],
  tech: [720, 0.2],
  ruins: [380, 0.16],
  rival: [220, 0.2],
  beacon: [880, 0.4],
  guardian: [180, 0.3],
  endTurn: [330, 0.12],
  victory: [990, 0.5],
  defeat: [160, 0.5],
  comeback: [560, 0.25],
};

export function playSfx(name: SfxName) {
  if (!soundOn) return;
  const audioCtx = ensureCtx();
  if (!audioCtx) return;
  const [freq, duration] = SFX_FREQ[name];
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = name === 'defeat' || name === 'guardian' ? 'sawtooth' : 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration + 0.05);
}

export function startAmbientMusic() {
  if (!musicOn || musicNodes.length) return;
  const audioCtx = ensureCtx();
  if (!audioCtx) return;
  const freqs = [110, 165, 220];
  musicNodes = freqs.map((f, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.value = 0.02 - i * 0.005;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    return { osc, gain };
  });
}

export function stopAmbientMusic() {
  musicNodes.forEach(({ osc }) => {
    try {
      osc.stop();
    } catch {
      // already stopped
    }
  });
  musicNodes = [];
}

export function isMusicOn() {
  return musicOn;
}

export function isSoundOn() {
  return soundOn;
}

export function toggleMusic(): boolean {
  musicOn = !musicOn;
  savePref('growthbound.music', musicOn);
  if (musicOn) startAmbientMusic();
  else stopAmbientMusic();
  return musicOn;
}

export function toggleSound(): boolean {
  soundOn = !soundOn;
  savePref('growthbound.sound', soundOn);
  return soundOn;
}
