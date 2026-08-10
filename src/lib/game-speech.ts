export type LetterRescueChallenge = "match" | "word" | "sound";

function article(word: string) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

export function getRescuePromptPhrase(
  challenge: LetterRescueChallenge,
  letter: string,
  spokenWord: string
) {
  if (challenge === "word") return `Which letter goes with ${spokenWord}?`;
  if (challenge === "sound") return `Listen. Find the letter ${letter}!`;
  return `Find the letter ${letter}!`;
}

export function getRescueRetryPhrase(prompt: string) {
  return `Almost! Let's try again. ${prompt}`;
}

export function getRescueSuccessPhrase(letter: string, spokenWord: string) {
  return `${letter} for ${spokenWord}!`;
}

export const RESCUE_COMPLETE_PHRASE = "Amazing! Your letter reef is complete!";

export function getRideEncounterPhrase(word: string, fact: string) {
  return `Look! It's ${article(word)} ${word}!${fact ? ` ${fact}` : ""}`;
}

export function getRidePhotoPhrase(word: string) {
  return `Great photo of the ${word}!`;
}

export function getRideCompletePhrase(world: "safari" | "ocean") {
  return `Amazing! You saw all the ${world} animals!`;
}

export function getRideModePhrase(mode: "auto" | "drive") {
  return mode === "auto" ? "I will drive! Enjoy the ride!" : "You drive! Use the arrows!";
}
