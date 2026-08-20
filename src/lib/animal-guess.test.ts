import { describe, expect, it } from "vitest";
import { findAnimalGuessIndex } from "./animal-guess";

const animals = [
  { letter: "E" },
  { letter: "L" },
  { letter: "D" },
  { letter: "Z" },
];

describe("findAnimalGuessIndex", () => {
  it("accepts the animal's first letter in either case", () => {
    expect(findAnimalGuessIndex("l", animals)).toBe(1);
    expect(findAnimalGuessIndex("L", animals)).toBe(1);
  });

  it("can select a visible distractor as a wrong keyboard guess", () => {
    expect(findAnimalGuessIndex("d", animals)).toBe(2);
  });

  it("ignores keys that do not represent a visible animal", () => {
    expect(findAnimalGuessIndex("ArrowLeft", animals)).toBe(-1);
    expect(findAnimalGuessIndex("q", animals)).toBe(-1);
  });
});
