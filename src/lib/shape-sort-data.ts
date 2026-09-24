/**
 * Shape Sort — drag (or tap, then tap) each loose shape into its matching
 * hole on the sandy sorter board. Pure data + round logic; the screen renders.
 *
 * Every path is drawn for one shared 100x100 viewBox so a piece and its hole
 * use the exact same outline — the hole just paints it as a dark silhouette.
 * Outlines stay inside 4..96 so a round-joined stroke never clips.
 */

export type ShapeId = "circle" | "square" | "triangle" | "star" | "heart";

export interface ShapeDef {
  id: ShapeId;
  /** Spoken + aria name, e.g. "Star" */
  word: string;
  /** Bright, kid-friendly fill for the loose piece */
  color: string;
  /** SVG path d for SHAPE_VIEW_BOX */
  path: string;
}

export const SHAPE_VIEW_BOX = "0 0 100 100";

export const SHAPES: readonly ShapeDef[] = [
  {
    id: "circle",
    word: "Circle",
    color: "#FF9F43",
    // Two half arcs, radius 42 around (50, 50).
    path: "M 8 50 A 42 42 0 1 1 92 50 A 42 42 0 1 1 8 50 Z",
  },
  {
    id: "square",
    word: "Square",
    color: "#54A0FF",
    path: "M 22 12 H 78 Q 88 12 88 22 V 78 Q 88 88 78 88 H 22 Q 12 88 12 78 V 22 Q 12 12 22 12 Z",
  },
  {
    id: "triangle",
    word: "Triangle",
    color: "#6BCB77",
    // Softened corners; nudged down so it sits visually centred.
    path: "M 44 19 Q 50 8 56 19 L 90 81 Q 95.5 91 84 91 L 16 91 Q 4.5 91 10 81 Z",
  },
  {
    id: "star",
    word: "Star",
    color: "#FFD93D",
    // Chubby five-point star: outer radius 46, inner 22, around (50, 53).
    path: "M 50 7 L 62.9 35.2 L 93.7 38.8 L 70.9 59.8 L 77 90.2 L 50 75 L 23 90.2 L 29.1 59.8 L 6.3 38.8 L 37.1 35.2 Z",
  },
  {
    id: "heart",
    word: "Heart",
    color: "#FF6B8A",
    path: "M 50 88 C 20 68 6 50 6 32 C 6 18 17 8 30 8 C 39 8 46 13 50 21 C 54 13 61 8 70 8 C 83 8 94 18 94 32 C 94 50 80 68 50 88 Z",
  },
];

const FIRST_ROUND_SHAPES = 3;

/** Round 1 → 3 shapes, round 2 → 4, round 3 onward → all 5. */
export function shapeCountForRound(round: number): number {
  const grown = FIRST_ROUND_SHAPES + Math.floor(round) - 1;
  return Math.min(SHAPES.length, Math.max(FIRST_ROUND_SHAPES, grown));
}

export interface ShapeRound {
  /** Board holes, left to right */
  holes: ShapeDef[];
  /** Loose pieces in the tray, left to right — the same set, shuffled apart */
  pieces: ShapeDef[];
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith], result[index]];
  }
  return result;
}

/** Pick this round's shapes (a varied subset below 5) and shuffle holes and pieces independently. */
export function buildShapeRound(round: number, random: () => number = Math.random): ShapeRound {
  const holes = shuffled(SHAPES, random).slice(0, shapeCountForRound(round));
  let pieces = shuffled(holes, random);
  // A tray lined up exactly under its holes is no sorting at all — rotate by one.
  if (pieces.length > 1 && pieces.every((piece, index) => piece.id === holes[index].id)) {
    pieces = [...pieces.slice(1), pieces[0]];
  }
  return { holes, pieces };
}

export function isCorrectDrop(pieceId: ShapeId, holeId: ShapeId): boolean {
  return pieceId === holeId;
}

export interface DropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DropTarget {
  id: ShapeId;
  rect: DropRect;
}

/** Extra catch area around each hole, as a fraction of its size — little fingers are not precise. */
const DROP_SLACK = 0.25;

/** The hole a piece released at `point` lands in (nearest centre wins), or null for open water. */
export function findDropHole(
  point: { x: number; y: number },
  targets: readonly DropTarget[]
): ShapeId | null {
  let best: ShapeId | null = null;
  let bestDistance = Infinity;
  for (const { id, rect } of targets) {
    const slackX = rect.width * DROP_SLACK;
    const slackY = rect.height * DROP_SLACK;
    const caught =
      point.x >= rect.left - slackX &&
      point.x <= rect.left + rect.width + slackX &&
      point.y >= rect.top - slackY &&
      point.y <= rect.top + rect.height + slackY;
    if (!caught) continue;
    const distance = Math.hypot(
      point.x - (rect.left + rect.width / 2),
      point.y - (rect.top + rect.height / 2)
    );
    if (distance < bestDistance) {
      best = id;
      bestDistance = distance;
    }
  }
  return best;
}

/** The 2x2 linear part of a CSS transform matrix (DOMMatrix a, b, c, d; translation ignored). */
export interface LinearTransform {
  a: number;
  b: number;
  c: number;
  d: number;
}

/**
 * Turn a finger movement in screen pixels into a translate in the piece's own
 * CSS pixels. The game sits inside a scaled — and on portrait phones rotated —
 * iPad frame, so a raw screen delta would make the piece lag, overshoot, or
 * slide sideways under the finger.
 */
export function toLocalDelta(dx: number, dy: number, { a, b, c, d }: LinearTransform) {
  const determinant = a * d - b * c;
  if (!determinant) return { x: dx, y: dy };
  return {
    x: (d * dx - c * dy) / determinant,
    y: (a * dy - b * dx) / determinant,
  };
}

export const SHAPE_SORT_PROMPT_PHRASE = "Put each shape in its home!";
export const SHAPE_SORT_PRAISE_PHRASE = "Great sorting!";
/** Shared with Spelling. Spoken only on a wrong HOLE, never on a drop in open water. */
export const SHAPE_SORT_RETRY_PHRASE = "Almost! Try again.";

export function getShapeNamePhrase(shape: ShapeDef) {
  return `${shape.word}!`;
}

/** Every exact phrase the Shape Sort screen can speak — register these for TTS. */
export const SHAPE_SORT_PHRASES: readonly string[] = [
  SHAPE_SORT_PROMPT_PHRASE,
  SHAPE_SORT_PRAISE_PHRASE,
  SHAPE_SORT_RETRY_PHRASE,
  ...SHAPES.map((shape) => getShapeNamePhrase(shape)),
];
