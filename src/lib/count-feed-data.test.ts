import { describe, expect, it } from "vitest";
import {
  buildCountFeedRound,
  COUNT_FEED_FRIENDS,
  COUNT_FEED_MAX,
  COUNT_FEED_PHRASES,
  countWord,
  friendForRound,
  getCountFeedCountPhrase,
  getCountFeedPraisePhrase,
  getCountFeedPromptPhrase,
  pickTarget,
  shellCountFor,
  targetRangeForRound,
} from "./count-feed-data";

const RANDOM_SWEEP = [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 0.999];

describe("countWord", () => {
  it("names one through ten", () => {
    expect(countWord(1)).toBe("One");
    expect(countWord(3)).toBe("Three");
    expect(countWord(10)).toBe("Ten");
    expect(COUNT_FEED_MAX).toBe(10);
  });
});

describe("targetRangeForRound", () => {
  it("ramps from up to 3, to up to 5, to up to 10", () => {
    for (const round of [0, 1, 2]) expect(targetRangeForRound(round)).toEqual({ min: 1, max: 3 });
    for (const round of [3, 4, 5]) expect(targetRangeForRound(round)).toEqual({ min: 1, max: 5 });
    for (const round of [6, 7, 20]) expect(targetRangeForRound(round)).toEqual({ min: 1, max: 10 });
  });
});

describe("pickTarget", () => {
  it("stays inside the round's range", () => {
    for (const round of [0, 3, 6]) {
      const { min, max } = targetRangeForRound(round);
      for (const r of RANDOM_SWEEP) {
        const target = pickTarget(round, undefined, () => r);
        expect(target).toBeGreaterThanOrEqual(min);
        expect(target).toBeLessThanOrEqual(max);
      }
    }
  });

  it("never repeats the previous target", () => {
    for (const round of [0, 3, 6]) {
      const { min, max } = targetRangeForRound(round);
      for (let previous = min; previous <= max; previous += 1) {
        for (const r of RANDOM_SWEEP) {
          expect(pickTarget(round, previous, () => r)).not.toBe(previous);
        }
      }
    }
  });

  it("can reach every number in the range", () => {
    const seen = new Set<number>();
    for (let step = 0; step < 100; step += 1) seen.add(pickTarget(6, undefined, () => step / 100));
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe("shellCountFor", () => {
  it("always offers more shells than the target, up to 12", () => {
    for (let target = 1; target <= COUNT_FEED_MAX; target += 1) {
      expect(shellCountFor(target)).toBe(target + 2);
    }
    expect(shellCountFor(10)).toBe(12);
  });
});

describe("friendForRound", () => {
  it("rotates through every friend and wraps around", () => {
    const friends = COUNT_FEED_FRIENDS.map((_, round) => friendForRound(round).word);
    expect(new Set(friends).size).toBe(COUNT_FEED_FRIENDS.length);
    expect(friendForRound(COUNT_FEED_FRIENDS.length)).toBe(COUNT_FEED_FRIENDS[0]);
  });
});

describe("buildCountFeedRound", () => {
  it("pairs the round's friend with a fresh target and its shell tray", () => {
    const round = buildCountFeedRound(4, 3, () => 0.5);
    expect(round.index).toBe(4);
    expect(round.friend).toBe(friendForRound(4));
    expect(round.target).not.toBe(3);
    expect(round.target).toBeLessThanOrEqual(5);
    expect(round.shellCount).toBe(shellCountFor(round.target));
  });
});

describe("phrases", () => {
  it("builds the round prompt with singular and plural shells", () => {
    expect(getCountFeedPromptPhrase("Octopus", 3)).toBe("Feed Octopus 3 shells!");
    expect(getCountFeedPromptPhrase("Turtle", 1)).toBe("Feed Turtle 1 shell!");
  });

  it("counts out loud and praises by name of the number", () => {
    expect(getCountFeedCountPhrase(1)).toBe("One!");
    expect(getCountFeedCountPhrase(10)).toBe("Ten!");
    expect(getCountFeedPraisePhrase(3)).toBe("Yum! Three shells!");
    expect(getCountFeedPraisePhrase(1)).toBe("Yum! One shell!");
  });

  it("registers every phrase the screen can speak, with no duplicates", () => {
    const expected = new Set<string>();
    for (let n = 1; n <= COUNT_FEED_MAX; n += 1) {
      expected.add(getCountFeedCountPhrase(n));
      expected.add(getCountFeedPraisePhrase(n));
      for (const friend of COUNT_FEED_FRIENDS) {
        expected.add(getCountFeedPromptPhrase(friend.word, n));
      }
    }
    expect(new Set(COUNT_FEED_PHRASES)).toEqual(expected);
    expect(COUNT_FEED_PHRASES).toHaveLength(expected.size);
    expect(COUNT_FEED_PHRASES).toHaveLength(70);
    expect(COUNT_FEED_PHRASES).toContain("Ten!");
  });
});
