import { describe, expect, it } from "vitest";
import {
  buildSpellingRound,
  buildSpellingSlots,
  getSpellingDifficulty,
  nextSpellingStreak,
  spellingWords,
} from "./spelling-data";

describe("buildSpellingRound", () => {
  it("builds a bank of exactly the word's letters, in reading order", () => {
    for (let i = 0; i < 200; i += 1) {
      const round = buildSpellingRound([], getSpellingDifficulty(0));
      // One tile per letter, no distractors.
      expect(round.bank).toHaveLength(round.letters.length);
      // Bank order matches the word's letter order (C, A, T — not shuffled).
      expect(round.bank.map((t) => t.letter)).toEqual(round.letters);
      round.bank.forEach((tile, i) => expect(tile.slot).toBe(i));
    }
  });

  it("gives every bank tile a unique id", () => {
    const round = buildSpellingRound();
    const ids = round.bank.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not repeat any of the five most recent words", () => {
    const recent = ["Cat", "Dog", "Cow", "Pig", "Bee"];
    for (let i = 0; i < 100; i += 1) {
      const next = buildSpellingRound(recent, getSpellingDifficulty(0));
      expect(recent).not.toContain(next.word.word);
    }
  });

  it("increases word length and shuffles after flawless rounds", () => {
    expect(getSpellingDifficulty(0)).toMatchObject({ level: 1, minLetters: 3, maxLetters: 3, shuffleBank: false });
    expect(getSpellingDifficulty(2)).toMatchObject({ level: 2, minLetters: 4, maxLetters: 4, shuffleBank: true });
    expect(getSpellingDifficulty(4)).toMatchObject({ level: 3, minLetters: 5, maxLetters: 6, shuffleBank: true });
    expect(getSpellingDifficulty(6)).toMatchObject({ level: 4, minLetters: 7, shuffleBank: true });

    for (let i = 0; i < 100; i += 1) {
      const round = buildSpellingRound([], getSpellingDifficulty(4));
      expect(round.letters.length).toBeGreaterThanOrEqual(5);
      expect(round.letters.length).toBeLessThanOrEqual(6);
    }
  });

  it("raises a flawless streak and eases difficulty after a mistake", () => {
    expect(nextSpellingStreak(2, 0)).toBe(3);
    expect(nextSpellingStreak(2, 1)).toBe(1);
    expect(nextSpellingStreak(0, 3)).toBe(0);
  });

  it("keeps beginner letters ordered and mixes advanced banks", () => {
    const beginner = buildSpellingRound([], getSpellingDifficulty(0), () => 0);
    expect(beginner.bank.map((tile) => tile.letter)).toEqual(beginner.letters);

    const advanced = buildSpellingRound([], getSpellingDifficulty(2), () => 0);
    expect(advanced.bank.map((tile) => tile.id)).not.toEqual(
      advanced.letters.map((_, index) => index)
    );
  });

  it("only draws from the configured word pool", () => {
    const words = new Set(spellingWords.map((w) => w.word));
    for (let i = 0; i < 50; i += 1) {
      expect(words.has(buildSpellingRound().word.word)).toBe(true);
    }
  });

  it("uses the approved foods and countries", () => {
    const words = spellingWords.map((entry) => entry.word);
    expect(words).toEqual(expect.arrayContaining([
      "Chicken",
      "Rice",
      "Noodles",
      "Singapore",
      "Thailand",
      "Taiwan",
      "China",
    ]));
    expect(words).not.toContain("Chicken Rice");
    expect(words).not.toContain("Tengah");
  });

  it("models word gaps as non-tappable slots and excludes them from letters", () => {
    const { slots, letters } = buildSpellingSlots("Chicken Rice");
    const letterSlots = slots.filter((slot) => !slot.space);
    expect(letterSlots.map((slot) => slot.char)).toEqual(letters);
    letterSlots.forEach((slot, idx) => expect(slot.tapIndex).toBe(idx));

    const gapSlots = slots.filter((slot) => slot.space);
    expect(gapSlots).toHaveLength(1);
    expect(gapSlots[0]).toEqual({ char: " ", space: true, tapIndex: -1 });
  });
});
