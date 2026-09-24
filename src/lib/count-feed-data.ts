/**
 * Count & Feed: a hungry sea friend asks for a number of shells and the
 * child taps them in one at a time while the game counts out loud. Round
 * logic and every spoken phrase live here so they can be unit-tested and
 * registered for the game TTS voice.
 */

export interface CountFeedFriend {
  /** Key passed to AnimalPhoto — every friend has a real /animals/ photo. */
  word: string;
  color: string;
}

export interface CountFeedRange {
  min: number;
  max: number;
}

export interface CountFeedRound {
  /** Zero-based round number within this play session. */
  index: number;
  friend: CountFeedFriend;
  target: number;
  shellCount: number;
}

export const COUNT_FEED_FRIENDS: readonly CountFeedFriend[] = [
  { word: "Octopus", color: "#E86FA4" },
  { word: "Turtle", color: "#41A85F" },
  { word: "Whale", color: "#3D7EA6" },
  { word: "Fish", color: "#54A0FF" },
  { word: "Shark", color: "#7F8FA6" },
];

const COUNT_WORDS = [
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
] as const;

export const COUNT_FEED_MAX = COUNT_WORDS.length;

/** Spare shells beyond the target, so the child has to stop at the right number. */
const EXTRA_SHELLS = 2;

/** "One".."Ten" for 1..10. */
export function countWord(n: number) {
  return COUNT_WORDS[n - 1];
}

/** Gentle ramp: three warm-up rounds up to 3, three more up to 5, then up to 10. */
export function targetRangeForRound(round: number): CountFeedRange {
  if (round < 3) return { min: 1, max: 3 };
  if (round < 6) return { min: 1, max: 5 };
  return { min: 1, max: COUNT_FEED_MAX };
}

/** Random target in the round's range, never the same number twice in a row. */
export function pickTarget(
  round: number,
  previous?: number,
  random: () => number = Math.random
) {
  const { min, max } = targetRangeForRound(round);
  const choices: number[] = [];
  for (let n = min; n <= max; n += 1) {
    if (n !== previous) choices.push(n);
  }
  return choices[Math.floor(random() * choices.length)];
}

/** A couple of spare shells — tops out at 12 shells for a target of 10. */
export function shellCountFor(target: number) {
  return target + EXTRA_SHELLS;
}

/** Friends take turns in a fixed order so every one gets fed. */
export function friendForRound(round: number) {
  return COUNT_FEED_FRIENDS[round % COUNT_FEED_FRIENDS.length];
}

export function buildCountFeedRound(
  index: number,
  previousTarget?: number,
  random: () => number = Math.random
): CountFeedRound {
  const target = pickTarget(index, previousTarget, random);
  return {
    index,
    friend: friendForRound(index),
    target,
    shellCount: shellCountFor(target),
  };
}

function shells(n: number) {
  return n === 1 ? "shell" : "shells";
}

export function getCountFeedPromptPhrase(friendWord: string, target: number) {
  return `Feed ${friendWord} ${target} ${shells(target)}!`;
}

/** Spoken on every shell tap with the running count. */
export function getCountFeedCountPhrase(n: number) {
  return `${countWord(n)}!`;
}

export function getCountFeedPraisePhrase(target: number) {
  return `Yum! ${countWord(target)} ${shells(target)}!`;
}

const COUNT_NUMBERS = Array.from({ length: COUNT_FEED_MAX }, (_, i) => i + 1);

/** Every exact phrase the Count & Feed screen can speak — register these for TTS. */
export const COUNT_FEED_PHRASES: readonly string[] = [
  ...COUNT_NUMBERS.map((n) => getCountFeedCountPhrase(n)),
  ...COUNT_NUMBERS.map((n) => getCountFeedPraisePhrase(n)),
  ...COUNT_FEED_FRIENDS.flatMap((friend) =>
    COUNT_NUMBERS.map((n) => getCountFeedPromptPhrase(friend.word, n))
  ),
];
