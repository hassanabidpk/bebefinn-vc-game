/**
 * Pure math helpers for the ride games (Safari Ride / Ocean Dive).
 * Track progress is a fraction 0..1 along a closed loop, so distances wrap.
 */

/** Wrap any progress value into the [0, 1) range. */
export function wrapProgress(t: number): number {
  const wrapped = t % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

/** Shortest distance between two loop positions, always in [0, 0.5]. */
export function loopDistance(a: number, b: number): number {
  const d = Math.abs(wrapProgress(a) - wrapProgress(b));
  return Math.min(d, 1 - d);
}

export interface EncounterSpot {
  word: string;
  t: number;
}

/**
 * Pick the closest animal within `range` of the vehicle, skipping words in
 * `exclude` (already-announced animals stay quiet until the child moves on).
 */
export function pickEncounter(
  progress: number,
  spots: readonly EncounterSpot[],
  range: number,
  exclude: ReadonlySet<string> = new Set()
): EncounterSpot | null {
  let best: EncounterSpot | null = null;
  let bestDistance = Infinity;
  for (const spot of spots) {
    if (exclude.has(spot.word)) continue;
    const distance = loopDistance(progress, spot.t);
    if (distance <= range && distance < bestDistance) {
      best = spot;
      bestDistance = distance;
    }
  }
  return best;
}
