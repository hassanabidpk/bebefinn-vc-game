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

/** Spoken when a child taps a sticker in the sticker book. */
export function getStickerPhrase(word: string) {
  return `${word}!`;
}

export const DANCE_COMPLETE_PHRASE = "Amazing dancing!";

/** Spoken after the song by the animal friend who danced along. */
export function getDancePartnerPhrase(word: string) {
  return `${word} loved your dance!`;
}

/** Spoken when a child taps a dance move sticker. */
export function getDanceMovePhrase(label: string) {
  return `${label}!`;
}
