import { alphabetData } from "./alphabet-data";

export interface LetterRescueOption {
  letter: string;
  word: string;
  spokenWord: string;
  emoji: string;
  color: string;
}

export interface LetterRescueRound {
  target: LetterRescueOption;
  options: LetterRescueOption[];
  difficulty: LetterRescueDifficulty;
}

export interface LetterRescueDifficulty {
  level: 1 | 2 | 3 | 4;
  label: string;
  challenge: "match" | "word" | "sound";
  optionCount: 3 | 4 | 5;
  nearbyDistractors: boolean;
}

const LETTER_OPTIONS: LetterRescueOption[] = alphabetData
  .filter((entry) => /^[A-Z]$/.test(entry.letter))
  .map(({ letter, word, spokenWord, emoji, color }) => ({
    letter,
    word,
    spokenWord: spokenWord ?? word,
    emoji,
    color,
  }));

export function getLetterRescueDifficulty(
  correctStreak: number,
  roundNumber: number
): LetterRescueDifficulty {
  if (correctStreak < 2) {
    return { level: 1, label: "Letter Match", challenge: "match", optionCount: 3, nearbyDistractors: false };
  }
  if (correctStreak < 4) {
    return {
      level: 2,
      label: roundNumber % 2 === 0 ? "Word Clue" : "Letter Match",
      challenge: roundNumber % 2 === 0 ? "word" : "match",
      optionCount: 4,
      nearbyDistractors: false,
    };
  }
  if (correctStreak < 6) {
    return {
      level: 3,
      label: roundNumber % 2 === 0 ? "Listening Challenge" : "Word Clue",
      challenge: roundNumber % 2 === 0 ? "sound" : "word",
      optionCount: 4,
      nearbyDistractors: true,
    };
  }
  const challenges = ["word", "sound", "match"] as const;
  const labels = ["Word Clue", "Listening Challenge", "Letter Match"] as const;
  const variation = roundNumber % challenges.length;
  return {
    level: 4,
    label: labels[variation],
    challenge: challenges[variation],
    optionCount: 5,
    nearbyDistractors: true,
  };
}

export function nextLetterRescueStreak(current: number, misses: number) {
  return misses === 0 ? current + 1 : Math.max(0, current - 2);
}

function srgbChannel(value: number) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return 0.2126 * srgbChannel(red) + 0.7152 * srgbChannel(green) + 0.0722 * srgbChannel(blue);
}

/** Preserve each lesson hue while guaranteeing readable text on white cards. */
export function getReadableRescueColor(hex: string) {
  const normalized = hex.startsWith("#") ? hex : `#${hex}`;
  const value = normalized.replace("#", "");
  let red = Number.parseInt(value.slice(0, 2), 16);
  let green = Number.parseInt(value.slice(2, 4), 16);
  let blue = Number.parseInt(value.slice(4, 6), 16);

  for (let step = 0; step < 12; step += 1) {
    const candidate = `#${[red, green, blue]
      .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
      .join("")}`;
    if (1.05 / (luminance(candidate) + 0.05) >= 4.5) return candidate;
    red *= 0.82;
    green *= 0.82;
    blue *= 0.82;
  }
  return "#00334d";
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith], result[index]];
  }
  return result;
}

function getDistractors(
  target: LetterRescueOption,
  count: number,
  difficulty: LetterRescueDifficulty,
  random: () => number
) {
  const candidates = LETTER_OPTIONS.filter((option) => option.letter !== target.letter);
  if (!difficulty.nearbyDistractors) return shuffled(candidates, random).slice(0, count);

  const targetIndex = LETTER_OPTIONS.findIndex((option) => option.letter === target.letter);
  return candidates
    .map((option) => ({
      option,
      distance: Math.abs(
        LETTER_OPTIONS.findIndex((candidate) => candidate.letter === option.letter) - targetIndex
      ),
      tieBreaker: random(),
    }))
    .sort((left, right) => left.distance - right.distance || left.tieBreaker - right.tieBreaker)
    .slice(0, count)
    .map(({ option }) => option);
}

/** Build one adaptive round without repeating the previous/current-reef targets. */
export function buildLetterRescueRound(
  previousLetter?: string,
  random: () => number = Math.random,
  excludedLetters: readonly string[] = [],
  difficulty: LetterRescueDifficulty = getLetterRescueDifficulty(0, 0)
): LetterRescueRound {
  const excluded = new Set(excludedLetters);
  if (previousLetter) excluded.add(previousLetter);
  const targets = LETTER_OPTIONS.filter((option) => !excluded.has(option.letter));
  const target = targets[Math.floor(random() * targets.length)];
  const distractors = getDistractors(target, difficulty.optionCount - 1, difficulty, random);

  return {
    target,
    options: shuffled([target, ...distractors], random),
    difficulty,
  };
}
