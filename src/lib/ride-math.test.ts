import { describe, expect, it } from "vitest";
import { loopDistance, pickEncounter, wrapProgress } from "./ride-math";

describe("wrapProgress", () => {
  it("keeps in-range values", () => {
    expect(wrapProgress(0.25)).toBeCloseTo(0.25);
    expect(wrapProgress(0)).toBe(0);
  });

  it("wraps values past the loop seam", () => {
    expect(wrapProgress(1.25)).toBeCloseTo(0.25);
    expect(wrapProgress(-0.25)).toBeCloseTo(0.75);
    expect(wrapProgress(1)).toBe(0);
  });
});

describe("loopDistance", () => {
  it("measures plain distance", () => {
    expect(loopDistance(0.2, 0.5)).toBeCloseTo(0.3);
  });

  it("takes the short way around the seam", () => {
    expect(loopDistance(0.95, 0.05)).toBeCloseTo(0.1);
    expect(loopDistance(0.05, 0.95)).toBeCloseTo(0.1);
  });

  it("never exceeds half a lap", () => {
    expect(loopDistance(0, 0.5)).toBeCloseTo(0.5);
  });
});

describe("pickEncounter", () => {
  const spots = [
    { word: "Lion", t: 0.1 },
    { word: "Elephant", t: 0.5 },
    { word: "Zebra", t: 0.98 },
  ];

  it("returns null when nothing is nearby", () => {
    expect(pickEncounter(0.3, spots, 0.05)).toBeNull();
  });

  it("finds the nearest animal in range", () => {
    expect(pickEncounter(0.12, spots, 0.05)?.word).toBe("Lion");
  });

  it("sees animals across the loop seam", () => {
    expect(pickEncounter(0.01, spots, 0.05)?.word).toBe("Zebra");
  });

  it("prefers the closer of two candidates", () => {
    const crowded = [
      { word: "Lion", t: 0.1 },
      { word: "Hippo", t: 0.14 },
    ];
    expect(pickEncounter(0.13, crowded, 0.1)?.word).toBe("Hippo");
  });

  it("skips excluded animals", () => {
    const excluded = new Set(["Lion"]);
    expect(pickEncounter(0.1, spots, 0.05, excluded)).toBeNull();
  });
});
