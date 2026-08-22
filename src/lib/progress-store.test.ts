import { describe, expect, it } from "vitest";
import {
  countStickers,
  emptyProgress,
  parseProgress,
  withSticker,
} from "./progress-store";

describe("withSticker", () => {
  it("adds a new sticker and keeps insertion order", () => {
    let progress = emptyProgress();
    progress = withSticker(progress, "rideAnimals", "Lion");
    progress = withSticker(progress, "rideAnimals", "Elephant");
    expect(progress.rideAnimals).toEqual(["Lion", "Elephant"]);
  });

  it("ignores duplicates and empty ids", () => {
    let progress = withSticker(emptyProgress(), "rescueLetters", "A");
    const same = withSticker(progress, "rescueLetters", "A");
    expect(same).toBe(progress);
    expect(withSticker(progress, "spellWords", "")).toBe(progress);
  });

  it("does not mutate the previous value", () => {
    const before = emptyProgress();
    withSticker(before, "spellWords", "Fox");
    expect(before.spellWords).toEqual([]);
  });
});

describe("countStickers", () => {
  it("sums across all categories", () => {
    let progress = emptyProgress();
    progress = withSticker(progress, "rideAnimals", "Whale");
    progress = withSticker(progress, "rescueLetters", "B");
    progress = withSticker(progress, "spellWords", "Fox");
    expect(countStickers(progress)).toBe(3);
  });
});

describe("parseProgress", () => {
  it("round-trips a valid payload", () => {
    const progress = withSticker(emptyProgress(), "rideAnimals", "Zebra");
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
  });

  it("resets on null, corrupt JSON, wrong version, or bad shapes", () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress("{oops")).toEqual(emptyProgress());
    expect(parseProgress(JSON.stringify({ version: 2 }))).toEqual(emptyProgress());
    const sneaky = JSON.stringify({ version: 1, rideAnimals: [1, "Lion", null] });
    expect(parseProgress(sneaky).rideAnimals).toEqual(["Lion"]);
  });
});

describe("dance move stickers", () => {
  it("stores dance moves and counts them", () => {
    const progress = withSticker(withSticker(emptyProgress(), "danceMoves", "clap"), "danceMoves", "clap");
    expect(progress.danceMoves).toEqual(["clap"]);
    expect(countStickers(progress)).toBe(1);
  });

  it("reads payloads saved before dance moves existed", () => {
    const legacy = JSON.stringify({ version: 1, rideAnimals: ["Lion"], rescueLetters: [], spellWords: [] });
    expect(parseProgress(legacy)).toEqual({
      version: 1,
      rideAnimals: ["Lion"],
      rescueLetters: [],
      spellWords: [],
      danceMoves: [],
    });
  });
});
