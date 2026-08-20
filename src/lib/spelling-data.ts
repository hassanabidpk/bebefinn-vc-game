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
  /** Source index for stable identity only; equal-letter tiles are interchangeable. */
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
  difficulty: SpellingDifficulty;
  key: number;
}

export interface SpellingDifficulty {
  level: 1 | 2 | 3 | 4;
  label: string;
  minLetters: number;
  maxLetters: number;
  shuffleBank: boolean;
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

export function getSpellingDifficulty(flawlessStreak: number): SpellingDifficulty {
  if (flawlessStreak < 2) {
    return { level: 1, label: "Warm Up", minLetters: 3, maxLetters: 3, shuffleBank: false };
  }
  if (flawlessStreak < 4) {
    return { level: 2, label: "Letter Mix", minLetters: 4, maxLetters: 4, shuffleBank: true };
  }
  if (flawlessStreak < 6) {
    return { level: 3, label: "Word Builder", minLetters: 5, maxLetters: 6, shuffleBank: true };
  }
  return {
    level: 4,
    label: "Super Speller",
    minLetters: 7,
    maxLetters: Number.POSITIVE_INFINITY,
    shuffleBank: true,
  };
}

export function nextSpellingStreak(current: number, mistakes: number) {
  return mistakes === 0 ? current + 1 : Math.max(0, current - 1);
}

function shuffled<T>(items: readonly T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith], result[index]];
  }
  return result;
}

/**
 * Pure round builder. Recent words are excluded when the active pool is large
 * enough, so a child sees variety instead of the same few cards. Beginner
 * banks stay in reading order; later levels shuffle the same exact letters.
 */
export function buildSpellingRound(
  recentWords: readonly string[] = [],
  difficulty: SpellingDifficulty = getSpellingDifficulty(0),
  random: () => number = Math.random,
  previousKey = 0
): SpellingRound {
  const eligible = spellingWords.filter(
    (entry) => {
      const length = entry.word.replace(/[^A-Za-z]/g, "").length;
      return length >= difficulty.minLetters && length <= difficulty.maxLetters;
    }
  );
  const pool = eligible.length ? eligible : spellingWords;
  const historyWindow = Math.min(5, Math.max(0, pool.length - 1));
  const excluded = new Set(recentWords.slice(-historyWindow));
  const fresh = pool.filter((entry) => !excluded.has(entry.word));
  const candidates = fresh.length ? fresh : pool;
  const word = candidates[Math.floor(random() * candidates.length)];

  const { slots, letters } = buildSpellingSlots(word.word);

  const orderedBank: BankTile[] = letters.map((letter, slot) => ({
    letter,
    slot,
    id: slot,
  }));
  const bank = difficulty.shuffleBank ? shuffled(orderedBank, random) : orderedBank;

  return {
    word,
    slots,
    letters,
    bank,
    difficulty,
    key: previousKey + 1,
  };
}
