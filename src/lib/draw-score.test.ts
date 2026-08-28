import { describe, expect, it } from "vitest";
import {
  combineScore,
  starsForScore,
  getDrawPraisePhrase,
  getDrawWatchPhrase,
  DRAW_YOUR_TURN_PHRASE,
} from "./draw-score";

describe("combineScore", () => {
  it("weights coverage above precision", () => {
    expect(combineScore(1, 0)).toBeGreaterThan(combineScore(0, 1));
  });

  it("clamps inputs to 0..1", () => {
    expect(combineScore(2, 2)).toBe(1);
    expect(combineScore(-1, -1)).toBe(0);
  });

  it("gives a full score for a perfect trace", () => {
    expect(combineScore(1, 1)).toBe(1);
  });
});

describe("starsForScore", () => {
  it("never returns less than one star", () => {
    expect(starsForScore(0)).toBe(1);
    expect(starsForScore(-1)).toBe(1);
  });

  it("maps generous thresholds", () => {
    expect(starsForScore(0.17)).toBe(1);
    expect(starsForScore(0.18)).toBe(2);
    expect(starsForScore(0.44)).toBe(2);
    expect(starsForScore(0.45)).toBe(3);
    expect(starsForScore(1)).toBe(3);
  });
});

describe("phrases", () => {
  it("builds the watch phrase per animal", () => {
    expect(getDrawWatchPhrase("Shark")).toBe("Watch how to draw a Shark!");
  });

  it("keeps the three-star phrase identical to the original celebration line", () => {
    expect(getDrawPraisePhrase(3, "Shark")).toBe("Wow! You drew a Shark! Great job!");
  });

  it("stays positive at one star", () => {
    expect(getDrawPraisePhrase(1, "Shark")).toBe("Good try! Let's draw again!");
    expect(DRAW_YOUR_TURN_PHRASE).toBe("Now your turn!");
  });
});
