// Best-effort haptic feedback. navigator.vibrate is Android-Chrome only (iOS Safari
// has no web vibration API) — this is a bonus touch, never load-bearing for feedback.

type HapticStrength = 'light' | 'medium' | 'heavy';

const PATTERNS: Record<HapticStrength, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: [30, 40, 30],
};

export function haptic(strength: HapticStrength) {
  try {
    navigator.vibrate?.(PATTERNS[strength]);
  } catch {
    // unsupported — silently ignore
  }
}
