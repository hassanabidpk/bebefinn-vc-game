import { describe, expect, it } from "vitest";
import { DRAW_ANIMALS } from "./draw-animals";

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
];

describe("DRAW_ANIMALS", () => {
  it("has the ten tutorial animals in order", () => {
    expect(DRAW_ANIMALS).toHaveLength(10);
    expect(DRAW_ANIMALS.map((a) => a.word)).toEqual(EXPECTED_WORDS);
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

  it("builds each animal from four to six cumulative steps", () => {
    for (const animal of DRAW_ANIMALS) {
      expect(animal.steps.length).toBeGreaterThanOrEqual(4);
      expect(animal.steps.length).toBeLessThanOrEqual(6);
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
});
