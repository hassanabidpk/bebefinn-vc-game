import { describe, expect, it } from "vitest";
import {
  buildSpellingRound,
  DISTRACTOR_COUNT,
  spellingWords,
  type SpellingRound,
} from "./spelling-data";

describe("buildSpellingRound", () => {
  it("builds a bank with every needed letter instance plus distractors", () => {
    for (let i = 0; i < 200; i += 1) {
      const round = buildSpellingRound();
      expect(round.bank).toHaveLength(round.letters.length + DISTRACTOR_COUNT);

      // Each slot has exactly one correct tile, matching the word letter.
      round.letters.forEach((letter, slot) => {
        const tiles = round.bank.filter((t) => t.slot === slot);
        expect(tiles).toHaveLength(1);
        expect(tiles[0].letter).toBe(letter);
      });

      // Distractors are not among the word's letters.
      const needed = new Set(round.letters);
      round.bank
        .filter((t) => t.slot === null)
        .forEach((t) => expect(needed.has(t.letter)).toBe(false));
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

  it("only draws from the configured word pool", () => {
    const words = new Set(spellingWords.map((w) => w.word));
    for (let i = 0; i < 50; i += 1) {
      expect(words.has(buildSpellingRound().word.word)).toBe(true);
    }
  });
});
