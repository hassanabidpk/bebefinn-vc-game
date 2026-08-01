import { ANIMAL_INFO } from "./animal-info";
import { alphabetData, getAlphabetEntriesWithVariants } from "./alphabet-data";
import { spellingWords } from "./spelling-data";

const allowedPhrases = new Set<string>();
const coreGamePhrases = new Set<string>();
export const NOTEPAD_TAP_REMINDER = "Let's tap one at a time!";

function add(...phrases: Array<string | undefined>) {
  for (const phrase of phrases) {
    if (phrase) allowedPhrases.add(phrase);
  }
}

export function getStandaloneLetterSpeech(letter: string) {
  const normalized = letter.toUpperCase();
  return `${normalized}!`;
}

for (const entry of getAlphabetEntriesWithVariants()) {
  const spokenWord = entry.spokenWord ?? entry.word;
  const isNumber = /^[0-9]+$/.test(entry.letter);
  add(
    isNumber
      ? `${entry.letter} for ${spokenWord}!`
      : `${entry.letter}! ${entry.letter} for ${spokenWord}!`,
    `${entry.letter}. ${spokenWord}.`,
    spokenWord,
    `Find the ${entry.word}!`,
    `${entry.letter}! ${entry.word}!`
  );

  const info = ANIMAL_INFO[entry.word];
  if (info) add(info.spokenEn ?? info.en, info.zh);
}

for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
  add(getStandaloneLetterSpeech(letter), `Can you find ${letter}?`);
}

for (const number of ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]) {
  add(`${number}!`);
}

for (const { word } of spellingWords) {
  const letters = word.toUpperCase().replace(/[^A-Z]/g, "").split("");
  add(
    `Let's spell ${word}. Tap the letters in order.`,
    `Let's spell ${word}.`,
    `${letters.join(". ")}. ${word}!`
  );
}

add("Almost! Try again.", "Wonderful spelling!", NOTEPAD_TAP_REMINDER);
for (let streak = 5; streak <= 100; streak += 5) {
  add(`Amazing! ${streak} in a row!`);
}

export function isAllowedTtsPhrase(text: string) {
  return allowedPhrases.has(text);
}

export function getAllowedTtsPhraseCount() {
  return allowedPhrases.size;
}

export function getAllowedTtsPhrases() {
  return [...allowedPhrases];
}

for (const entry of alphabetData.filter((item) => /^[A-Z]$/.test(item.letter))) {
  coreGamePhrases.add(`${entry.letter}. ${entry.spokenWord ?? entry.word}.`);
  coreGamePhrases.add(`Find the ${entry.word}!`);
  coreGamePhrases.add(`${entry.letter}! ${entry.word}!`);
}

for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
  coreGamePhrases.add(getStandaloneLetterSpeech(letter));
  coreGamePhrases.add(`Can you find ${letter}?`);
}
for (const number of ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]) {
  coreGamePhrases.add(`${number}!`);
}

for (const { word } of spellingWords) {
  const letters = word.toUpperCase().replace(/[^A-Z]/g, "").split("");
  coreGamePhrases.add(`Let's spell ${word}. Tap the letters in order.`);
  coreGamePhrases.add(`Let's spell ${word}.`);
  coreGamePhrases.add(`${letters.join(". ")}. ${word}!`);
}

coreGamePhrases.add("Almost! Try again.");
coreGamePhrases.add("Wonderful spelling!");
coreGamePhrases.add(NOTEPAD_TAP_REMINDER);

export function getCoreGameTtsPhrases() {
  return [...coreGamePhrases];
}

export function getTtsVoiceForPhrase(text: string) {
  return /[\u3400-\u9fff]/.test(text) ? "Aoede" : "Leda";
}
