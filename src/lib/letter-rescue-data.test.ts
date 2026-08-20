import { describe, expect, it } from "vitest";
import { alphabetData } from "./alphabet-data";
import {
  buildLetterRescueRound,
  getLetterRescueDifficulty,
  getReadableRescueColor,
  nextLetterRescueStreak,
} from "./letter-rescue-data";

function srgbChannel(value: number) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function contrastAgainstWhite(hex: string) {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const luminance =
    0.2126 * srgbChannel(red) + 0.7152 * srgbChannel(green) + 0.0722 * srgbChannel(blue);
  return 1.05 / (luminance + 0.05);
}

describe("buildLetterRescueRound", () => {
  it("creates three unique letter choices containing the target", () => {
    const round = buildLetterRescueRound(undefined, () => 0.25);
    expect(round.options).toHaveLength(3);
    expect(new Set(round.options.map((option) => option.letter)).size).toBe(3);
    expect(round.options.some((option) => option.letter === round.target.letter)).toBe(true);
  });

  it("grows from three random choices to five nearby choices", () => {
    const medium = getLetterRescueDifficulty(2, 2);
    const hard = getLetterRescueDifficulty(6, 6);
    expect(buildLetterRescueRound(undefined, () => 0.25, [], medium).options).toHaveLength(4);

    const hardRound = buildLetterRescueRound(undefined, () => 0.5, [], hard);
    expect(hardRound.options).toHaveLength(5);
    const targetCode = hardRound.target.letter.charCodeAt(0);
    const distractorDistances = hardRound.options
      .filter((option) => option.letter !== hardRound.target.letter)
      .map((option) => Math.abs(option.letter.charCodeAt(0) - targetCode));
    expect(Math.max(...distractorDistances)).toBeLessThanOrEqual(2);
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

  it("keeps the custom Xaven label while using the requested Zaven pronunciation", () => {
    const round = buildLetterRescueRound(undefined, () => 0.9);

    expect(round.target).toMatchObject({
      letter: "X",
      word: "Handsome Xaven",
      spokenWord: "Handsome Zaven",
    });
  });
});

describe("adaptive Rescue difficulty", () => {
  it("adds clue variation and choices as the correct streak grows", () => {
    expect(getLetterRescueDifficulty(0, 0)).toMatchObject({ level: 1, challenge: "match", optionCount: 3 });
    expect(getLetterRescueDifficulty(2, 2)).toMatchObject({ level: 2, challenge: "word", optionCount: 4 });
    expect(getLetterRescueDifficulty(4, 4)).toMatchObject({ level: 3, challenge: "sound", optionCount: 4 });
    expect(getLetterRescueDifficulty(6, 6)).toMatchObject({ level: 4, challenge: "word", optionCount: 5 });
    expect(getLetterRescueDifficulty(6, 7).challenge).toBe("sound");
    expect(getLetterRescueDifficulty(6, 8).challenge).toBe("match");
  });

  it("raises a clean streak and eases down after misses", () => {
    expect(nextLetterRescueStreak(3, 0)).toBe(4);
    expect(nextLetterRescueStreak(3, 1)).toBe(1);
    expect(nextLetterRescueStreak(1, 2)).toBe(0);
  });
});

describe("getReadableRescueColor", () => {
  it("makes every current letter color meet WCAG AA contrast on white cards", () => {
    const letterColors = alphabetData
      .filter((entry) => /^[A-Z]$/.test(entry.letter))
      .map((entry) => [entry.letter, getReadableRescueColor(entry.color)] as const);

    for (const [letter, color] of letterColors) {
      expect(color, `${letter} should produce a six-digit hex color`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(contrastAgainstWhite(color), `${letter} should meet 4.5:1 against white`).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });
});
