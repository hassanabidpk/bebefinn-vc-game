export interface SpellingWord {
  /** Title-case word (or phrase), also the key passed to AnimalPhoto for art. */
  word: string;
  color: string;
}

/**
 * Short, picturable words for ages 3-4 — mostly animals and food, plus a few
 * family and Singapore words. Every word has a real picture:
 * Cat/Dog/Bear/Lion/Fish/Whale/Shark/Elephant reuse the photos under
 * /public/animals/, and the rest use generated cards under /public/spelling/
 * (see scripts/generate-images.ts). All words map to a key in
 * animal-photo.tsx CARD_IMAGES. Multi-word entries (e.g. "Chicken Rice")
 * keep their space as a non-tappable gap slot.
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
  { word: "Zoo", color: "#6BCB77" },
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
  // longer animals
  { word: "Whale", color: "#2980B9" },
  { word: "Shark", color: "#34495E" },
  { word: "Elephant", color: "#95A5A6" },
  // food
  { word: "Cake", color: "#FF6B8A" },
  { word: "Milk", color: "#74B9FF" },
  { word: "Corn", color: "#F1C40F" },
  { word: "Pear", color: "#6BCB77" },
  { word: "Eggs", color: "#F39C12" },
  { word: "Apple", color: "#E74C3C" },
  { word: "Banana", color: "#F1C40F" },
  { word: "Noodles", color: "#F5B041" },
  { word: "Cookies", color: "#A0522D" },
  { word: "Chicken Rice", color: "#E8A33D" },
  // family
  { word: "Mommy", color: "#E056A0" },
  { word: "Papa", color: "#4A90D9" },
  { word: "Amma", color: "#C0785A" },
  // places
  { word: "Singapore", color: "#E74C3C" },
  { word: "Tengah", color: "#27AE60" },
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
/** Extra letters offered in the bank beyond the word's own letters. */
export const DISTRACTOR_COUNT = 2;

export interface Slot {
  /** Uppercase letter for a tappable slot, or " " for a word gap. */
  char: string;
  /** True for a non-tappable gap between words (auto-filled, no bank tile). */
  space: boolean;
  /** Index into the round's `letters` for a tappable slot; -1 for a gap. */
  tapIndex: number;
}

export interface BankTile {
  letter: string;
  /** Index into the round's letters for a correct tile; null for distractors. */
  slot: number | null;
  /** Stable id so identical letters render as distinct tiles. */
  id: number;
}

export interface SpellingRound {
  word: SpellingWord;
  /** Display sequence including word gaps. */
  slots: Slot[];
  /** Upper-case tappable letters, in order (gaps excluded). */
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
 * ordered slots (spaces become non-tappable gaps), and builds a shuffled bank
 * of the correct letters plus DISTRACTOR_COUNT random letters not already
 * needed by the word.
 */
export function buildSpellingRound(prev?: SpellingRound): SpellingRound {
  let idx = Math.floor(Math.random() * spellingWords.length);
  if (prev && spellingWords.length > 1) {
    while (spellingWords[idx].word === prev.word.word) {
      idx = Math.floor(Math.random() * spellingWords.length);
    }
  }
  const word = spellingWords[idx];

  let tap = 0;
  const slots: Slot[] = word.word
    .toUpperCase()
    .split("")
    .map((ch) => {
      const isLetter = ch >= "A" && ch <= "Z";
      return isLetter
        ? { char: ch, space: false, tapIndex: tap++ }
        : { char: " ", space: true, tapIndex: -1 };
    });
  const letters = slots.filter((s) => !s.space).map((s) => s.char);

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
    slots,
    letters,
    bank: shuffle([...correctTiles, ...distractors]),
    key: (prev?.key ?? 0) + 1,
  };
}
