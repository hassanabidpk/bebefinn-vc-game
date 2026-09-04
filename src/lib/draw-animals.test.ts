import { describe, expect, it } from "vitest";
import { DRAW_ANIMALS, getDrawSteps } from "./draw-animals";

const EXPECTED_WORDS = [
  "Shark",
  "Whale",
  "Mouse",
  "Rabbit",
  "Lion",
  "Tiger",
  "Eagle",
  "Fish",
  "Ant",
  "Turtle",
  "Bear",
  "Cat",
  "Dog",
  "Elephant",
  "Giraffe",
  "Horse",
  "Octopus",
  "Penguin",
  "Iguana",
  "Jellyfish",
  "Kangaroo",
  "Narwhal",
  "Quokka",
  "Urchin",
  "Vulture",
  "X-ray Fish",
  "Yak",
  "Zebra",
];

describe("DRAW_ANIMALS", () => {
  it("has the complete tutorial animal catalog in order", () => {
    expect(DRAW_ANIMALS).toHaveLength(28);
    expect(DRAW_ANIMALS.map((a) => a.word)).toEqual(EXPECTED_WORDS);
  });

  it("has at least one drawing animal for every letter A to Z", () => {
    const initials = new Set(DRAW_ANIMALS.map((animal) => animal.word[0].toUpperCase()));
    expect([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].every((letter) => initials.has(letter))).toBe(true);
  });

  it("uses a unique word and a non-empty emoji per animal", () => {
    const words = DRAW_ANIMALS.map((a) => a.word);
    expect(new Set(words).size).toBe(words.length);
    for (const animal of DRAW_ANIMALS) {
      expect(animal.emoji.length).toBeGreaterThan(0);
    }
  });

  it("gives every animal a hex stroke color", () => {
    for (const animal of DRAW_ANIMALS) {
      expect(animal.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("builds each animal from five to seven cumulative steps", () => {
    for (const animal of DRAW_ANIMALS) {
      expect(animal.steps.length).toBeGreaterThanOrEqual(5);
      expect(animal.steps.length).toBeLessThanOrEqual(7);
    }
  });

  it("adds at least one path per step and starts every path with a move command", () => {
    for (const animal of DRAW_ANIMALS) {
      for (const step of animal.steps) {
        expect(step.paths.length).toBeGreaterThan(0);
        for (const path of step.paths) {
          expect(path.startsWith("M")).toBe(true);
          expect(path.trim()).toBe(path);
        }
      }
    }
  });

  it("speaks a short cheerful line on every step", () => {
    for (const animal of DRAW_ANIMALS) {
      for (const step of animal.steps) {
        expect(step.say.trim().length).toBeGreaterThan(0);
        const words = step.say.trim().split(/\s+/);
        expect(words.length).toBeGreaterThanOrEqual(3);
        expect(words.length).toBeLessThanOrEqual(8);
      }
    }
  });

  it("keeps every coordinate inside the 512 viewBox with a safe margin", () => {
    for (const animal of DRAW_ANIMALS) {
      for (const step of animal.steps) {
        for (const path of step.paths) {
          for (const raw of path.match(/-?\d+(?:\.\d+)?/g) ?? []) {
            const n = Number(raw);
            expect(n).toBeGreaterThanOrEqual(0);
            expect(n).toBeLessThanOrEqual(512);
          }
        }
      }
    }
  });

  it("finishes with a face step that draws eyes and a mouth", () => {
    for (const animal of DRAW_ANIMALS) {
      const last = animal.steps[animal.steps.length - 1];
      expect(last.paths.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("never marks the final face step as a detail pass", () => {
    for (const animal of DRAW_ANIMALS) {
      expect(animal.steps[animal.steps.length - 1].detail).toBeUndefined();
    }
  });
});

describe("getDrawSteps", () => {
  it("returns every step unchanged on medium", () => {
    for (const animal of DRAW_ANIMALS) {
      expect(getDrawSteps(animal, "medium")).toEqual(animal.steps);
    }
  });

  it("draws each animal in three or four steps on simple", () => {
    for (const animal of DRAW_ANIMALS) {
      const simple = getDrawSteps(animal, "simple");
      expect(simple.length).toBeGreaterThanOrEqual(3);
      expect(simple.length).toBeLessThanOrEqual(4);
    }
  });

  it("keeps the face as the last simple step", () => {
    for (const animal of DRAW_ANIMALS) {
      const simple = getDrawSteps(animal, "simple");
      const medium = getDrawSteps(animal, "medium");
      expect(simple[simple.length - 1]).toBe(medium[medium.length - 1]);
    }
  });

  it("keeps simple steps as a subsequence of the medium steps", () => {
    for (const animal of DRAW_ANIMALS) {
      const medium = getDrawSteps(animal, "medium");
      let cursor = 0;
      for (const step of getDrawSteps(animal, "simple")) {
        const found = medium.indexOf(step, cursor);
        expect(found).toBeGreaterThanOrEqual(0);
        cursor = found + 1;
      }
    }
  });

  it("drops exactly the steps flagged as detail", () => {
    for (const animal of DRAW_ANIMALS) {
      const simple = getDrawSteps(animal, "simple");
      expect(simple).toEqual(animal.steps.filter((step) => !step.detail));
      expect(simple.some((step) => step.detail)).toBe(false);
    }
  });
});
