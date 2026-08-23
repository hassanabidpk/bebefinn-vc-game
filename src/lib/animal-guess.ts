interface AnimalGuessOption {
  letter: string;
}

interface AnimalTargetOption {
  word: string;
}

/** Match a keyboard letter to the visible animal tile carrying that letter. */
export function findAnimalGuessIndex(
  key: string,
  options: readonly AnimalGuessOption[]
) {
  if (!/^[a-z]$/i.test(key)) return -1;
  const letter = key.toUpperCase();
  return options.findIndex((option) => option.letter.toUpperCase() === letter);
}

/** Pick a target while keeping recently played animals out of the pool. */
export function pickAnimalTargetIndex(
  options: readonly AnimalTargetOption[],
  recentWords: readonly string[] = [],
  random: () => number = Math.random
) {
  if (!options.length) return -1;

  const historyWindow = Math.min(6, Math.max(0, options.length - 1));
  const excluded = new Set(recentWords.slice(-historyWindow));
  const freshIndexes = options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => !excluded.has(option.word))
    .map(({ index }) => index);
  const candidates = freshIndexes.length
    ? freshIndexes
    : options.map((_, index) => index);

  return candidates[Math.floor(random() * candidates.length)];
}
