import { describe, expect, it } from "vitest";
import {
  COLORING_CRAYONS,
  COLORING_PAGES,
  COLORING_PHRASES,
  getColoringPickPhrase,
  getColoringPraisePhrase,
  getCrayonPhrase,
  isPageComplete,
  type ColoringPage,
} from "./coloring-pages";

function fillAll(page: ColoringPage, hex = "#FF5A5F") {
  return Object.fromEntries(page.regions.map((region) => [region.id, hex]));
}

describe("COLORING_PAGES", () => {
  it("has the four ocean pictures in order", () => {
    expect(COLORING_PAGES.map((page) => page.word)).toEqual([
      "Fish",
      "Turtle",
      "Octopus",
      "Starfish",
    ]);
  });

  it("uses a unique id and a hex accent color per page", () => {
    const ids = COLORING_PAGES.map((page) => page.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const page of COLORING_PAGES) {
      expect(page.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("gives every page five to eight fillable regions", () => {
    for (const page of COLORING_PAGES) {
      expect(page.regions.length).toBeGreaterThanOrEqual(5);
      expect(page.regions.length).toBeLessThanOrEqual(8);
    }
  });

  it("keeps region ids unique within each page", () => {
    for (const page of COLORING_PAGES) {
      const ids = page.regions.map((region) => region.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("closes every region path and starts every path with a move command", () => {
    for (const page of COLORING_PAGES) {
      for (const region of page.regions) {
        expect(region.d.startsWith("M")).toBe(true);
        expect(region.d.endsWith("Z")).toBe(true);
      }
      for (const detail of page.details) {
        expect(detail.d.startsWith("M")).toBe(true);
        expect(detail.d.trim()).toBe(detail.d);
      }
    }
  });

  it("keeps every number inside the 512 viewBox", () => {
    for (const page of COLORING_PAGES) {
      const paths = [...page.regions, ...page.details].map((shape) => shape.d);
      for (const path of paths) {
        for (const raw of path.match(/-?\d+(?:\.\d+)?/g) ?? []) {
          const n = Number(raw);
          expect(n).toBeGreaterThanOrEqual(0);
          expect(n).toBeLessThanOrEqual(512);
        }
      }
    }
  });

  it("gives every page a face drawn on top", () => {
    for (const page of COLORING_PAGES) {
      expect(page.details.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("COLORING_CRAYONS", () => {
  it("matches the Draw game's six crayons", () => {
    expect(COLORING_CRAYONS).toEqual([
      { name: "Red", hex: "#FF5A5F" },
      { name: "Orange", hex: "#FF9F43" },
      { name: "Yellow", hex: "#FFD93D" },
      { name: "Green", hex: "#6BCB77" },
      { name: "Blue", hex: "#4DA6FF" },
      { name: "Purple", hex: "#A66BFF" },
    ]);
  });
});

describe("isPageComplete", () => {
  const [fish, turtle] = COLORING_PAGES;

  it("is false for a blank page", () => {
    expect(isPageComplete({}, fish)).toBe(false);
  });

  it("is false while any one region is still white", () => {
    for (const region of fish.regions) {
      const filled: Record<string, string> = fillAll(fish);
      delete filled[region.id];
      expect(isPageComplete(filled, fish)).toBe(false);
    }
  });

  it("is true once every region has a color, whatever the colors are", () => {
    expect(isPageComplete(fillAll(fish), fish)).toBe(true);
    const rainbow = Object.fromEntries(
      fish.regions.map((region, i) => [region.id, COLORING_CRAYONS[i % 6].hex])
    );
    expect(isPageComplete(rainbow, fish)).toBe(true);
  });

  it("ignores colors for regions that belong to another page", () => {
    expect(isPageComplete({ ...fillAll(turtle), tail: "#FF5A5F" }, fish)).toBe(false);
    expect(isPageComplete({ ...fillAll(fish), bogus: "#FF5A5F" }, fish)).toBe(true);
  });

  it("treats an empty color string as unfilled", () => {
    expect(isPageComplete({ ...fillAll(fish), tail: "" }, fish)).toBe(false);
  });
});

describe("COLORING_PHRASES", () => {
  it("lists every crayon name and each picture's pick and praise lines", () => {
    expect(COLORING_PHRASES).toEqual([
      "Red!",
      "Orange!",
      "Yellow!",
      "Green!",
      "Blue!",
      "Purple!",
      "Let's color the Fish!",
      "Beautiful Fish!",
      "Let's color the Turtle!",
      "Beautiful Turtle!",
      "Let's color the Octopus!",
      "Beautiful Octopus!",
      "Let's color the Starfish!",
      "Beautiful Starfish!",
    ]);
  });

  it("covers everything the phrase helpers can produce", () => {
    for (const crayon of COLORING_CRAYONS) {
      expect(COLORING_PHRASES).toContain(getCrayonPhrase(crayon.name));
    }
    for (const page of COLORING_PAGES) {
      expect(COLORING_PHRASES).toContain(getColoringPickPhrase(page.word));
      expect(COLORING_PHRASES).toContain(getColoringPraisePhrase(page.word));
    }
  });

  it("has no duplicates", () => {
    expect(new Set(COLORING_PHRASES).size).toBe(COLORING_PHRASES.length);
  });
});
