import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDeck,
  createMemoryBoard,
  flipMemoryCard,
  hideMismatchedCards,
  isBoardCleared,
  isMatch,
  MEMORY_MATCH_ANIMALS,
  MEMORY_MATCH_PHRASES,
  MEMORY_MATCH_PRAISE,
  getMemoryMatchPraise,
  pairCountForRound,
  type MemoryMatchBoard,
} from "./memory-match-data";

/** Deterministic stand-in for Math.random (Park–Miller) so shuffles are repeatable. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

/** Find the two ids of the pair for `word` on a board. */
function pairIds(board: MemoryMatchBoard, word: string) {
  return board.cards.filter((card) => card.word === word).map((card) => card.id);
}

/** Ids of one card from each of two different pairs — a guaranteed mismatch. */
function mismatchIds(board: MemoryMatchBoard) {
  const first = board.cards[0];
  const second = board.cards.find((card) => card.word !== first.word);
  if (!second) throw new Error("board needs two different animals");
  return [first.id, second.id] as const;
}

describe("MEMORY_MATCH_ANIMALS", () => {
  it("uses only alphabet animals that have a real photo", () => {
    expect(MEMORY_MATCH_ANIMALS.map((animal) => animal.word)).toEqual([
      "Alpaca",
      "Bear",
      "Cat",
      "Dog",
      "Elephant",
      "Fish",
      "Gorilla",
      "Hippo",
      "Jellyfish",
      "Kangaroo",
      "Lion",
      "Octopus",
      "Panda",
      "Quokka",
      "Shark",
      "Turtle",
      "Unicorn",
      "Vulture",
      "Whale",
      "Yak",
      "Zebra",
    ]);
    for (const { word } of MEMORY_MATCH_ANIMALS) {
      const base = join(process.cwd(), "public", "animals", word.toLowerCase());
      expect(existsSync(`${base}.png`) || existsSync(`${base}.jpeg`), `${word} photo`).toBe(true);
    }
  });
});

describe("pairCountForRound", () => {
  it("grows 2 → 3 → 4 → 6 pairs and then stays at 6", () => {
    expect([0, 1, 2, 3, 4, 10].map(pairCountForRound)).toEqual([2, 3, 4, 6, 6, 6]);
  });
});

describe("buildDeck", () => {
  it("deals every animal exactly twice with unique card ids", () => {
    for (const pairCount of [2, 3, 4, 6]) {
      const deck = buildDeck(pairCount, seeded(pairCount));
      expect(deck).toHaveLength(pairCount * 2);
      expect(new Set(deck.map((card) => card.id)).size).toBe(pairCount * 2);

      const counts = new Map<string, number>();
      for (const card of deck) counts.set(card.word, (counts.get(card.word) ?? 0) + 1);
      expect(counts.size).toBe(pairCount);
      expect([...counts.values()].every((count) => count === 2)).toBe(true);
    }
  });

  it("is repeatable for the same random source and varies with another", () => {
    const words = (seed: number) => buildDeck(6, seeded(seed)).map((card) => card.word);
    expect(words(7)).toEqual(words(7));
    expect(words(7)).not.toEqual(words(8));
  });
});

describe("isMatch", () => {
  it("matches two different cards of the same animal only", () => {
    const [a, b, c] = [
      { id: 0, word: "Cat", spokenWord: "Cat", color: "#FF9F43" },
      { id: 1, word: "Cat", spokenWord: "Cat", color: "#FF9F43" },
      { id: 2, word: "Dog", spokenWord: "Dog", color: "#A0522D" },
    ];
    expect(isMatch(a, b)).toBe(true);
    expect(isMatch(a, a)).toBe(false);
    expect(isMatch(a, c)).toBe(false);
  });
});

describe("flipMemoryCard", () => {
  it("keeps a matching pair up and clears the board after the last pair", () => {
    let board = createMemoryBoard(0, seeded(3));
    const words = [...new Set(board.cards.map((card) => card.word))];

    for (const [index, word] of words.entries()) {
      const [first, second] = pairIds(board, word);
      const flipped = flipMemoryCard(board, first);
      expect(flipped.outcome).toBe("flipped");
      expect(flipped.board.faceUp).toEqual([first]);

      const matched = flipMemoryCard(flipped.board, second);
      expect(matched.outcome).toBe("matched");
      expect(matched.board.faceUp).toEqual([]);
      expect(matched.board.matched).toEqual(expect.arrayContaining([first, second]));
      expect(isBoardCleared(matched.board)).toBe(index === words.length - 1);
      board = matched.board;
    }
  });

  it("leaves a mismatch showing until it is hidden, with nothing lost", () => {
    const board = createMemoryBoard(1, seeded(5));
    const [first, second] = mismatchIds(board);
    const mismatch = flipMemoryCard(flipMemoryCard(board, first).board, second);

    expect(mismatch.outcome).toBe("mismatched");
    expect(mismatch.board.faceUp).toEqual([first, second]);
    expect(mismatch.board.matched).toEqual([]);

    const hidden = hideMismatchedCards(mismatch.board);
    expect(hidden.faceUp).toEqual([]);
    expect(hidden.matched).toEqual([]);
    expect(hidden.cards).toBe(board.cards);
  });

  it("ignores taps while two cards show and on face-up or matched cards", () => {
    const board = createMemoryBoard(2, seeded(9));
    const [first, second] = mismatchIds(board);
    const oneUp = flipMemoryCard(board, first).board;
    expect(flipMemoryCard(oneUp, first)).toEqual({ board: oneUp, outcome: "ignored" });

    const twoUp = flipMemoryCard(oneUp, second).board;
    for (const card of board.cards) {
      expect(flipMemoryCard(twoUp, card.id).outcome, `card ${card.id}`).toBe("ignored");
    }

    const [pairA, pairB] = pairIds(board, board.cards[0].word);
    const matched = flipMemoryCard(flipMemoryCard(board, pairA).board, pairB).board;
    expect(flipMemoryCard(matched, pairA)).toEqual({ board: matched, outcome: "ignored" });
    expect(flipMemoryCard(board, 999).outcome).toBe("ignored");
  });

  it("only hides a pair of unmatched cards", () => {
    const board = createMemoryBoard(0, seeded(2));
    const oneUp = flipMemoryCard(board, board.cards[0].id).board;
    expect(hideMismatchedCards(oneUp)).toBe(oneUp);
  });
});

describe("MEMORY_MATCH_PHRASES", () => {
  it("lists each animal call and the praise lines once", () => {
    expect(MEMORY_MATCH_PHRASES).toContain("Cat!");
    expect(MEMORY_MATCH_PHRASES).toContain("Zebra!");
    for (const praise of MEMORY_MATCH_PRAISE) expect(MEMORY_MATCH_PHRASES).toContain(praise);
    expect(MEMORY_MATCH_PHRASES).toHaveLength(MEMORY_MATCH_ANIMALS.length + MEMORY_MATCH_PRAISE.length);
    expect(new Set(MEMORY_MATCH_PHRASES).size).toBe(MEMORY_MATCH_PHRASES.length);
  });

  it("only praises with registered lines", () => {
    for (const round of [0, 1, 2, 3, 12]) {
      expect(MEMORY_MATCH_PHRASES).toContain(getMemoryMatchPraise(round));
    }
  });
});
