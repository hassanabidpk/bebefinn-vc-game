export interface SpellingWord {
  /** Title-case word, also the key passed to AnimalPhoto for art. */
  word: string;
  color: string;
}

/**
 * Short, picturable words for ages 3-4 — mostly animals and food. Every
 * word has a real picture: "Cat"/"Dog"/"Bear"/"Lion"/"Fish" reuse the
 * photos under /public/animals/, and the rest use generated cards under
 * /public/spelling/ (see scripts/generate-images.ts). All words map to a
 * key in animal-photo.tsx CARD_IMAGES. Three- and four-letter words are
 * mixed; the slot row and letter bank stay small for little fingers.
 */
export const spellingWords: SpellingWord[] = [
  // 3-letter
  { word: "Cat", color: "#FF9F43" },
  { word: "Dog", color: "#A0522D" },
  { word: "Cow", color: "#7F8C8D" },
  { word: "Pig", color: "#FF6B8A" },
  { word: "Bee", color: "#F1C40F" },
  { word: "Sun", color: "#F39C12" },
  { word: "Bus", color: "#E74C3C" },
  { word: "Fox", color: "#E67E22" },
  // 4-letter animals
  { word: "Bear", color: "#A0522D" },
  { word: "Lion", color: "#F39C12" },
  { word: "Fish", color: "#54A0FF" },
  { word: "Frog", color: "#27AE60" },
  { word: "Goat", color: "#95A5A6" },
  { word: "Duck", color: "#F1C40F" },
  { word: "Deer", color: "#B5651D" },
  { word: "Crab", color: "#E74C3C" },
  { word: "Seal", color: "#7F8C8D" },
  // 4-letter food
  { word: "Cake", color: "#FF6B8A" },
  { word: "Milk", color: "#74B9FF" },
  { word: "Corn", color: "#F1C40F" },
  { word: "Pear", color: "#6BCB77" },
  { word: "Eggs", color: "#F39C12" },
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
