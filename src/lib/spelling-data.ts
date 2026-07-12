export interface SpellingWord {
  /** Title-case word, also the key passed to AnimalPhoto for art. */
  word: string;
  /** Emoji sticker for words without a photo; ignored when a photo exists. */
  emoji?: string;
  color: string;
}

/**
 * Short, picturable words for ages 3-4. "Cat"/"Dog" reuse the realistic
 * photos in animal-photo.tsx; the rest render as emoji stickers (their
 * keys are added to EMOJI_STICKERS there). All words are 3 letters so the
 * slot row and letter bank stay small enough for little fingers.
 */
export const spellingWords: SpellingWord[] = [
  { word: "Cat", color: "#FF9F43" },
  { word: "Dog", color: "#A0522D" },
  { word: "Cow", emoji: "🐄", color: "#7F8C8D" },
  { word: "Pig", emoji: "🐷", color: "#FF6B8A" },
  { word: "Bee", emoji: "🐝", color: "#F1C40F" },
  { word: "Sun", emoji: "☀️", color: "#F39C12" },
  { word: "Bus", emoji: "🚌", color: "#E74C3C" },
  { word: "Fox", emoji: "🦊", color: "#E67E22" },
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
/** Extra letters offered in the bank beyond the word's own letters. */
export const DISTRACTOR_COUNT = 2;

export interface BankTile {
  letter: string;
  /** Index into the word's letters for a correct tile; null for distractors. */
  slot: number | null;
  /** Stable id so identical letters render as distinct tiles. */
  id: number;
}

export interface SpellingRound {
  word: SpellingWord;
  /** Upper-case letters, one per slot, in order. */
  letters: string[];
  bank: BankTile[];
  key: number;
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pure round builder. Picks a word (never the previous one), splits it into
 * ordered letter slots, and builds a shuffled bank of the correct letters
 * plus DISTRACTOR_COUNT random letters not already needed by the word.
 */
export function buildSpellingRound(prev?: SpellingRound): SpellingRound {
  let idx = Math.floor(Math.random() * spellingWords.length);
  if (prev && spellingWords.length > 1) {
    while (spellingWords[idx].word === prev.word.word) {
      idx = Math.floor(Math.random() * spellingWords.length);
    }
  }
  const word = spellingWords[idx];
  const letters = word.word.toUpperCase().split("");

  let nextId = 0;
  const correctTiles: BankTile[] = letters.map((letter, slot) => ({
    letter,
    slot,
    id: nextId++,
  }));

  const needed = new Set(letters);
  const pool = shuffle(ALPHABET.filter((l) => !needed.has(l)));
  const distractors: BankTile[] = pool
    .slice(0, DISTRACTOR_COUNT)
    .map((letter) => ({ letter, slot: null, id: nextId++ }));

  return {
    word,
    letters,
    bank: shuffle([...correctTiles, ...distractors]),
    key: (prev?.key ?? 0) + 1,
  };
}
