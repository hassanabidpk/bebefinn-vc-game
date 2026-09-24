import { alphabetData } from "./alphabet-data";

export interface MemoryMatchAnimal {
  word: string;
  spokenWord: string;
  color: string;
}

export interface MemoryCard extends MemoryMatchAnimal {
  /** Unique per card — the two cards of a pair share a word, never an id. */
  id: number;
}

export interface MemoryMatchBoard {
  /** 0-based round; decides the pair count via pairCountForRound. */
  round: number;
  cards: MemoryCard[];
  /** Ids turned up but not yet matched — at most two. */
  faceUp: number[];
  matched: number[];
}

export type MemoryFlipOutcome = "ignored" | "flipped" | "matched" | "mismatched";

export interface MemoryFlipResult {
  board: MemoryMatchBoard;
  outcome: MemoryFlipOutcome;
}

/**
 * Alphabet animals with a real photo under /public/animals/ — the same pool
 * play-screen gets from isRealAnimal() in animal-photo.tsx, kept as a plain
 * list so this module stays React-free. Nest is left out: it is not an animal.
 */
const PHOTO_ANIMAL_WORDS = new Set([
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

export const MEMORY_MATCH_ANIMALS: readonly MemoryMatchAnimal[] = alphabetData
  .filter((entry) => /^[A-Z]$/.test(entry.letter) && PHOTO_ANIMAL_WORDS.has(entry.word))
  .map(({ word, spokenWord, color }) => ({ word, spokenWord: spokenWord ?? word, color }));

/** Boards grow 2 → 3 → 4 → 6 pairs, then stay at 6. */
export const MEMORY_MATCH_PAIR_STEPS = [2, 3, 4, 6] as const;

export const MEMORY_MATCH_PRAISE = ["You found them all!", "Great memory!"] as const;

export function pairCountForRound(round: number) {
  const step = Math.min(Math.max(0, round), MEMORY_MATCH_PAIR_STEPS.length - 1);
  return MEMORY_MATCH_PAIR_STEPS[step];
}

export function getMemoryMatchPairPhrase(spokenWord: string) {
  return `${spokenWord}!`;
}

export function getMemoryMatchPraise(round: number) {
  return MEMORY_MATCH_PRAISE[Math.max(0, round) % MEMORY_MATCH_PRAISE.length];
}

/** Every exact phrase the Memory Match screen can speak, for TTS registration. */
export const MEMORY_MATCH_PHRASES: readonly string[] = [
  ...MEMORY_MATCH_ANIMALS.map((animal) => getMemoryMatchPairPhrase(animal.spokenWord)),
  ...MEMORY_MATCH_PRAISE,
];

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith], result[index]];
  }
  return result;
}

/** Pick `pairCount` different animals, deal each twice, and shuffle. */
export function buildDeck(pairCount: number, random: () => number = Math.random): MemoryCard[] {
  const animals = shuffled(MEMORY_MATCH_ANIMALS, random).slice(0, pairCount);
  const cards = animals.flatMap((animal) => [animal, animal]).map((animal, id) => ({ ...animal, id }));
  return shuffled(cards, random);
}

export function createMemoryBoard(round: number, random: () => number = Math.random): MemoryMatchBoard {
  return { round, cards: buildDeck(pairCountForRound(round), random), faceUp: [], matched: [] };
}

export function isMatch(first: MemoryCard, second: MemoryCard) {
  return first.id !== second.id && first.word === second.word;
}

/**
 * Turn one card up. Taps are ignored while two unmatched cards are showing
 * and on cards that are already up or matched. A matching second card moves
 * both into `matched`; a mismatch leaves both up until hideMismatchedCards.
 */
export function flipMemoryCard(board: MemoryMatchBoard, cardId: number): MemoryFlipResult {
  const card = board.cards.find((candidate) => candidate.id === cardId);
  if (
    !card ||
    board.faceUp.length >= 2 ||
    board.faceUp.includes(cardId) ||
    board.matched.includes(cardId)
  ) {
    return { board, outcome: "ignored" };
  }

  if (board.faceUp.length === 0) {
    return { board: { ...board, faceUp: [cardId] }, outcome: "flipped" };
  }

  const first = board.cards.find((candidate) => candidate.id === board.faceUp[0]);
  if (first && isMatch(first, card)) {
    return {
      board: { ...board, faceUp: [], matched: [...board.matched, first.id, card.id] },
      outcome: "matched",
    };
  }
  return { board: { ...board, faceUp: [...board.faceUp, cardId] }, outcome: "mismatched" };
}

/** Gently turn a mismatched pair back down; any other board is unchanged. */
export function hideMismatchedCards(board: MemoryMatchBoard): MemoryMatchBoard {
  return board.faceUp.length === 2 ? { ...board, faceUp: [] } : board;
}

export function isBoardCleared(board: MemoryMatchBoard) {
  return board.matched.length === board.cards.length;
}
