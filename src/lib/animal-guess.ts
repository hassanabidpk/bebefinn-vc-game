interface AnimalGuessOption {
  letter: string;
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
