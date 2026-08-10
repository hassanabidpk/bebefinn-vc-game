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

export function getLetterRescueChallenge(rescuedCount: number) {
  if (rescuedCount >= 4) return "sound" as const;
  if (rescuedCount >= 2) return "word" as const;
  return "match" as const;
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

/** Build one three-choice round without repeating the previous target. */
export function buildLetterRescueRound(
  previousLetter?: string,
  random: () => number = Math.random,
  excludedLetters: readonly string[] = []
): LetterRescueRound {
  const excluded = new Set(excludedLetters);
  if (previousLetter) excluded.add(previousLetter);
  const targets = LETTER_OPTIONS.filter((option) => !excluded.has(option.letter));
  const target = targets[Math.floor(random() * targets.length)];
  const distractors = shuffled(
    LETTER_OPTIONS.filter((option) => option.letter !== target.letter),
    random
  ).slice(0, 2);

  return {
    target,
    options: shuffled([target, ...distractors], random),
  };
}
