import { describe, expect, it } from "vitest";
import {
  buildShapeRound,
  findDropHole,
  getShapeNamePhrase,
  isCorrectDrop,
  SHAPE_SORT_PHRASES,
  SHAPES,
  shapeCountForRound,
  toLocalDelta,
} from "./shape-sort-data";

/** Deterministic PRNG so shuffles are reproducible across many seeds. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const ids = (shapes: readonly { id: string }[]) => shapes.map((shape) => shape.id);

describe("SHAPES", () => {
  it("has five unique shapes, each with a word, a hex colour and a path", () => {
    expect(ids(SHAPES)).toEqual(["circle", "square", "triangle", "star", "heart"]);
    for (const shape of SHAPES) {
      expect(shape.word.length).toBeGreaterThan(0);
      expect(shape.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(shape.path).toMatch(/^M .* Z$/);
    }
    expect(new Set(SHAPES.map((shape) => shape.color)).size).toBe(SHAPES.length);
  });
});

describe("shapeCountForRound", () => {
  it("grows 3 → 4 → 5, then stays at 5", () => {
    expect(shapeCountForRound(1)).toBe(3);
    expect(shapeCountForRound(2)).toBe(4);
    expect(shapeCountForRound(3)).toBe(5);
    expect(shapeCountForRound(4)).toBe(5);
    expect(shapeCountForRound(50)).toBe(5);
  });

  it("never drops below three shapes", () => {
    expect(shapeCountForRound(0)).toBe(3);
    expect(shapeCountForRound(-4)).toBe(3);
  });
});

describe("buildShapeRound", () => {
  it("uses the same unique set for holes and pieces", () => {
    for (let round = 1; round <= 6; round += 1) {
      const { holes, pieces } = buildShapeRound(round, seeded(round));
      expect(holes).toHaveLength(shapeCountForRound(round));
      expect(new Set(ids(holes)).size).toBe(holes.length);
      expect([...ids(pieces)].sort()).toEqual([...ids(holes)].sort());
    }
  });

  it("never lines the tray up in the same order as the holes", () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const { holes, pieces } = buildShapeRound(1 + (seed % 4), seeded(seed));
      expect(ids(pieces)).not.toEqual(ids(holes));
    }
  });

  it("still scrambles the tray when the shuffle would have matched", () => {
    // random() = 0.999 leaves every Fisher-Yates swap in place.
    const { holes, pieces } = buildShapeRound(3, () => 0.999);
    expect(ids(holes)).toEqual(ids(SHAPES));
    expect(ids(pieces)).not.toEqual(ids(holes));
  });

  it("varies which shapes appear when fewer than five are used", () => {
    const sets = new Set<string>();
    for (let seed = 0; seed < 60; seed += 1) {
      sets.add([...ids(buildShapeRound(1, seeded(seed)).holes)].sort().join(","));
    }
    expect(sets.size).toBeGreaterThan(3);
  });
});

describe("isCorrectDrop", () => {
  it("only matches a piece with its own hole", () => {
    expect(isCorrectDrop("star", "star")).toBe(true);
    expect(isCorrectDrop("star", "heart")).toBe(false);
  });
});

describe("findDropHole", () => {
  const holes = [
    { id: "circle" as const, rect: { left: 0, top: 0, width: 100, height: 100 } },
    { id: "star" as const, rect: { left: 120, top: 0, width: 100, height: 100 } },
  ];

  it("finds the hole under the piece's centre", () => {
    expect(findDropHole({ x: 50, y: 50 }, holes)).toBe("circle");
    expect(findDropHole({ x: 170, y: 60 }, holes)).toBe("star");
  });

  it("forgives a near miss and picks the nearest hole", () => {
    expect(findDropHole({ x: 50, y: 118 }, holes)).toBe("circle");
    expect(findDropHole({ x: 112, y: 50 }, holes)).toBe("star");
  });

  it("returns null for a drop in open water", () => {
    expect(findDropHole({ x: 50, y: 400 }, holes)).toBeNull();
    expect(findDropHole({ x: 50, y: 50 }, [])).toBeNull();
  });
});

describe("toLocalDelta", () => {
  it("undoes the iPad frame's scale", () => {
    expect(toLocalDelta(50, -20, { a: 0.5, b: 0, c: 0, d: 0.5 })).toEqual({ x: 100, y: -40 });
  });

  it("undoes the portrait-phone 90° rotation", () => {
    // rotate(90deg): a finger moving right moves the piece up in its own frame.
    const local = toLocalDelta(10, 0, { a: 0, b: 1, c: -1, d: 0 });
    expect(local.x).toBeCloseTo(0);
    expect(local.y).toBeCloseTo(-10);
  });

  it("passes the delta through for an identity or degenerate frame", () => {
    expect(toLocalDelta(7, 9, { a: 1, b: 0, c: 0, d: 1 })).toEqual({ x: 7, y: 9 });
    expect(toLocalDelta(7, 9, { a: 0, b: 0, c: 0, d: 0 })).toEqual({ x: 7, y: 9 });
  });
});

describe("SHAPE_SORT_PHRASES", () => {
  it("lists every spoken line once, including each shape name", () => {
    expect(new Set(SHAPE_SORT_PHRASES).size).toBe(SHAPE_SORT_PHRASES.length);
    for (const shape of SHAPES) {
      expect(SHAPE_SORT_PHRASES).toContain(getShapeNamePhrase(shape));
    }
    expect(SHAPE_SORT_PHRASES).toContain("Almost! Try again.");
    expect(getShapeNamePhrase(SHAPES[3])).toBe("Star!");
  });
});
