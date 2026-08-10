import { describe, expect, it } from "vitest";
import { alphabetData } from "./alphabet-data";
import {
  buildLetterRescueRound,
  getLetterRescueChallenge,
  getReadableRescueColor,
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

describe("getLetterRescueChallenge", () => {
  it.each([
    [0, "match"],
    [1, "match"],
    [2, "word"],
    [3, "word"],
    [4, "sound"],
    [5, "sound"],
    [6, "sound"],
  ] as const)("uses the expected challenge after %i rescues", (rescuedCount, expected) => {
    expect(getLetterRescueChallenge(rescuedCount)).toBe(expected);
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
