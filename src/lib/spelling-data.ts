export interface SpellingWord {
  /** Title-case word (or phrase), also the key passed to AnimalPhoto for art. */
  word: string;
  color: string;
}

/**
 * Short, picturable words for ages 3-4 — mostly animals and food, plus a few
 * family and country words. Every word has a real picture:
 * Cat/Dog/Bear/Lion/Fish/Whale/Shark/Elephant reuse the photos under
 * /public/animals/, and the rest use generated cards under /public/spelling/
 * (see scripts/generate-images.ts). All words map to a key in
 * animal-photo.tsx CARD_IMAGES. Multi-word entries keep their spaces as
 * non-tappable gap slots.
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
  { word: "Chicken", color: "#E8A33D" },
  { word: "Rice", color: "#F4E7C1" },
  // family
  { word: "Mommy", color: "#E056A0" },
  { word: "Papa", color: "#4A90D9" },
  { word: "Amma", color: "#C0785A" },
  // countries
  { word: "Singapore", color: "#E74C3C" },
  { word: "Thailand", color: "#4A90D9" },
  { word: "Taiwan", color: "#27AE60" },
  { word: "China", color: "#E74C3C" },
];

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
  /** Index into the round's letters this tile fills. */
  slot: number;
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

export function buildSpellingSlots(word: string) {
  let tap = 0;
  const slots: Slot[] = word
    .toUpperCase()
    .split("")
    .map((ch) => {
      const isLetter = ch >= "A" && ch <= "Z";
      return isLetter
        ? { char: ch, space: false, tapIndex: tap++ }
        : { char: " ", space: true, tapIndex: -1 };
    });

  return {
    slots,
    letters: slots.filter((slot) => !slot.space).map((slot) => slot.char),
  };
}

export function spellingMaxLettersForStars(stars: number) {
  if (stars < 3) return 3;
  if (stars < 7) return 4;
  if (stars < 11) return 6;
  return Number.POSITIVE_INFINITY;
}

/**
 * Pure round builder. Picks a word (never the previous one) and splits it into
 * ordered slots (spaces become non-tappable gaps). The bank holds exactly the
 * word's letters in reading order — no distractors, no shuffle — so a toddler
 * sees "C A T" under the slots, not a jumble, and matches left to right.
 */
export function buildSpellingRound(
  prev?: SpellingRound,
  maxLetters = Number.POSITIVE_INFINITY
): SpellingRound {
  const eligible = spellingWords.filter(
    (entry) => entry.word.replace(/[^A-Za-z]/g, "").length <= maxLetters
  );
  const pool = eligible.length ? eligible : spellingWords;
  let idx = Math.floor(Math.random() * pool.length);
  if (prev && pool.length > 1) {
    while (pool[idx].word === prev.word.word) {
      idx = Math.floor(Math.random() * pool.length);
    }
  }
  const word = pool[idx];

  const { slots, letters } = buildSpellingSlots(word.word);

  const bank: BankTile[] = letters.map((letter, slot) => ({
    letter,
    slot,
    id: slot,
  }));

  return {
    word,
    slots,
    letters,
    bank,
    key: (prev?.key ?? 0) + 1,
  };
}
