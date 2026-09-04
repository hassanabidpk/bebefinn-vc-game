/**
 * Scoring + phrases for the Draw game. The screen measures two pixel
 * ratios on the child's canvas and this module turns them into a
 * toddler-friendly star rating (always at least one star — positive
 * reinforcement only, no fail states).
 */

export type DrawStars = 1 | 2 | 3;

/**
 * Combine the two measurements into one 0..1 score.
 * - coverage: fraction of the demo outline that has crayon ink near it
 *   (did they draw the whole animal?)
 * - precision: fraction of crayon ink that lies near the demo outline
 *   (did the ink follow the shape, or scribble everywhere?)
 * Coverage dominates — a wobbly-but-complete animal beats a tiny
 * perfect corner.
 */
export function combineScore(coverage: number, precision: number): number {
  const cov = Math.min(1, Math.max(0, coverage));
  const prec = Math.min(1, Math.max(0, precision));
  return cov * 0.65 + prec * 0.35;
}

/** Generous toddler thresholds — three stars should feel reachable. */
export function starsForScore(score: number): DrawStars {
  if (score >= 0.45) return 3;
  if (score >= 0.18) return 2;
  return 1;
}

export function getAnimalArticle(word: string) {
  return /^[AEIOU]/i.test(word) || /^X-ray\b/i.test(word) ? "an" : "a";
}

export function getDrawWatchPhrase(word: string) {
  return `Watch how to draw ${getAnimalArticle(word)} ${word}!`;
}

export const DRAW_YOUR_TURN_PHRASE = "Now your turn!";

export function getDrawPraisePhrase(stars: DrawStars, word: string) {
  if (stars === 3) return `Wow! You drew ${getAnimalArticle(word)} ${word}! Great job!`;
  if (stars === 2) return `Great drawing! You drew ${getAnimalArticle(word)} ${word}!`;
  return "Good try! Let's draw again!";
}
