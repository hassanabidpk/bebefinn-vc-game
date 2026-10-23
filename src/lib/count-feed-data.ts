/**
 * Count & Feed: a hungry sea friend asks for a number of its favorite food
 * and the child taps them in one at a time while the game counts out loud. Round
 * logic and every spoken phrase live here so they can be unit-tested and
 * registered for the game TTS voice.
 */

export interface CountFeedFood {
  emoji: string;
  /** Spoken name for one, e.g. "crab". */
  one: string;
  /** Spoken name for several, e.g. "crabs". */
  many: string;
}

export interface CountFeedFriend {
  /** Key passed to AnimalPhoto — every friend has a real /animals/ photo. */
  word: string;
  color: string;
  /** What this friend really eats in the sea. */
  food: CountFeedFood;
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
  foodCount: number;
}

export const COUNT_FEED_FRIENDS: readonly CountFeedFriend[] = [
  { word: "Octopus", color: "#E86FA4", food: { emoji: "🦀", one: "crab", many: "crabs" } },
  { word: "Turtle", color: "#41A85F", food: { emoji: "🌿", one: "seaweed", many: "seaweeds" } },
  { word: "Whale", color: "#3D7EA6", food: { emoji: "🦐", one: "shrimp", many: "shrimp" } },
  { word: "Fish", color: "#54A0FF", food: { emoji: "🪱", one: "worm", many: "worms" } },
  { word: "Shark", color: "#7F8FA6", food: { emoji: "🐟", one: "fish", many: "fish" } },
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

/** Spare food beyond the target, so the child has to stop at the right number. */
const EXTRA_FOOD = 2;

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

/** A couple of spare pieces — tops out at 12 for a target of 10. */
export function foodCountFor(target: number) {
  return target + EXTRA_FOOD;
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
    foodCount: foodCountFor(target),
  };
}

function foodName(food: CountFeedFood, n: number) {
  return n === 1 ? food.one : food.many;
}

export function getCountFeedPromptPhrase(friend: CountFeedFriend, target: number) {
  return `Feed ${friend.word} ${target} ${foodName(friend.food, target)}!`;
}

/** Spoken on every food tap with the running count. */
export function getCountFeedCountPhrase(n: number) {
  return `${countWord(n)}!`;
}

export function getCountFeedPraisePhrase(food: CountFeedFood, target: number) {
  return `Yum! ${countWord(target)} ${foodName(food, target)}!`;
}

const COUNT_NUMBERS = Array.from({ length: COUNT_FEED_MAX }, (_, i) => i + 1);

/** Every exact phrase the Count & Feed screen can speak — register these for TTS. */
export const COUNT_FEED_PHRASES: readonly string[] = [
  ...new Set([
    ...COUNT_NUMBERS.map((n) => getCountFeedCountPhrase(n)),
    ...COUNT_FEED_FRIENDS.flatMap((friend) =>
      COUNT_NUMBERS.flatMap((n) => [
        getCountFeedPraisePhrase(friend.food, n),
        getCountFeedPromptPhrase(friend, n),
      ])
    ),
  ]),
];
