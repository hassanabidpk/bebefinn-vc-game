import { describe, expect, it } from "vitest";
import { buildLetterRescueRound } from "./letter-rescue-data";

describe("buildLetterRescueRound", () => {
  it("creates three unique letter choices containing the target", () => {
    const round = buildLetterRescueRound(undefined, () => 0.25);
    expect(round.options).toHaveLength(3);
    expect(new Set(round.options.map((option) => option.letter)).size).toBe(3);
    expect(round.options.some((option) => option.letter === round.target.letter)).toBe(true);
  });

  it("does not repeat the previous target", () => {
    const first = buildLetterRescueRound(undefined, () => 0);
    const second = buildLetterRescueRound(first.target.letter, () => 0);
    expect(second.target.letter).not.toBe(first.target.letter);
  });

  it("keeps each target paired with its learning word", () => {
    const round = buildLetterRescueRound(undefined, () => 0.12);
    expect(round.target.letter).toMatch(/^[A-Z]$/);
    expect(round.target.word.length).toBeGreaterThan(0);
  });

  it("can exclude letters already rescued in the current reef", () => {
    const round = buildLetterRescueRound(undefined, () => 0, ["A", "B", "C"]);
    expect(["A", "B", "C"]).not.toContain(round.target.letter);
  });
});
