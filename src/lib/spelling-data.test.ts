import { describe, expect, it } from "vitest";
import {
  buildSpellingRound,
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

  it("only draws from the configured word pool", () => {
    const words = new Set(spellingWords.map((w) => w.word));
    for (let i = 0; i < 50; i += 1) {
      expect(words.has(buildSpellingRound().word.word)).toBe(true);
    }
  });

  it("models word gaps as non-tappable slots and excludes them from letters", () => {
    for (let i = 0; i < 300; i += 1) {
      const round = buildSpellingRound();
      const letterSlots = round.slots.filter((s) => !s.space);
      // Tappable letters line up with non-space slots, in order.
      expect(letterSlots.map((s) => s.char)).toEqual(round.letters);
      letterSlots.forEach((s, idx) => expect(s.tapIndex).toBe(idx));
      // Gap slots carry a space, no tap index, and never a bank tile.
      round.slots
        .filter((s) => s.space)
        .forEach((s) => {
          expect(s.char).toBe(" ");
          expect(s.tapIndex).toBe(-1);
        });
      // A multi-word entry keeps its display spaces as gap slots.
      const spaces = round.word.word.split("").filter((c) => c === " ").length;
      expect(round.slots.filter((s) => s.space)).toHaveLength(spaces);
    }
  });
});
