import { alphabetData } from "./alphabet-data";

export interface LetterRescueOption {
  letter: string;
  word: string;
  emoji: string;
  color: string;
}

export interface LetterRescueRound {
  target: LetterRescueOption;
  options: LetterRescueOption[];
}

const LETTER_OPTIONS: LetterRescueOption[] = alphabetData
  .filter((entry) => /^[A-Z]$/.test(entry.letter))
  .map(({ letter, word, emoji, color }) => ({ letter, word, emoji, color }));

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
