import { describe, expect, it } from "vitest";
import {
  buildSpellingRound,
  buildSpellingSlots,
  spellingMaxLettersForStars,
  spellingWords,
  type SpellingRound,
} from "./spelling-data";

describe("buildSpellingRound", () => {
  it("builds a bank of exactly the word's letters, in reading order", () => {
    for (let i = 0; i < 200; i += 1) {
      const round = buildSpellingRound();
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

  it("never repeats the previous word", () => {
    let prev: SpellingRound = buildSpellingRound();
    for (let i = 0; i < 200; i += 1) {
      const next = buildSpellingRound(prev);
      expect(next.word.word).not.toBe(prev.word.word);
      prev = next;
    }
  });

  it("starts with short words and unlocks longer words gradually", () => {
    expect(spellingMaxLettersForStars(0)).toBe(3);
    expect(spellingMaxLettersForStars(3)).toBe(4);
    expect(spellingMaxLettersForStars(7)).toBe(6);
    expect(spellingMaxLettersForStars(11)).toBe(Number.POSITIVE_INFINITY);

    for (let i = 0; i < 100; i += 1) {
      const round = buildSpellingRound(undefined, spellingMaxLettersForStars(0));
      expect(round.letters.length).toBeLessThanOrEqual(3);
    }
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
