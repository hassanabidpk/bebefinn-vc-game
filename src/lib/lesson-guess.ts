/** Convert one keyboard key into the lesson answer it represents. */
export function lessonGuessFromKey(key: string): string | null {
  if (/^[a-z]$/i.test(key)) return key.toUpperCase();
  if (/^[1-9]$/.test(key)) return key;
  if (key === "0") return "10";
  return null;
}

/** True when a keyboard key correctly answers the current lesson. */
export function isCorrectLessonGuess(key: string, answer: string): boolean {
  return lessonGuessFromKey(key) === answer.toUpperCase();
}
