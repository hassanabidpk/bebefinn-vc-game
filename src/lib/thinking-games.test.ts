import { describe, expect, it } from "vitest";
import { answerPattern, createPatternRound, PATTERN_TEMPLATES, type PatternSymbol } from "./patterns-data";
import { parsePatterns } from "./patterns-progress";
import { emptyReef, parseReef, placeReef, REEF_SCENES, REEF_STEPS, REEF_TARGETS, reefDropTarget, visitReef } from "./reef-builder-data";

describe("Bubble Patterns", () => {
  it("has 12 valid authored puzzles with one answer and no duplicate choices", () => {
    expect(PATTERN_TEMPLATES).toHaveLength(12);
    expect(new Set(PATTERN_TEMPLATES.map(t => t.id)).size).toBe(12);
    for (const t of PATTERN_TEMPLATES) {
      expect(t.options.filter(o => o === t.answer)).toHaveLength(1);
      expect(new Set(t.options).size).toBe(t.options.length);
      expect(t.sequence.length).toBeLessThanOrEqual(5);
      const cycle = [...t.sequence, t.answer];
      for (let i = t.unitSize; i < cycle.length; i++) expect(cycle[i]).toBe(cycle[i % t.unitSize]);
    }
  });
  it("awards exactly one pearl for an accepted answer, including after reloading", () => {
    const p = createPatternRound(undefined, () => 0);
    const answer = PATTERN_TEMPLATES.find(t => t.id === p.templateId)!.answer;
    const won = answerPattern(p, answer);
    expect(won.pearls).toBe(1);
    expect(answerPattern(won, answer)).toBe(won);
    const restored = parsePatterns(JSON.stringify(won));
    expect(answerPattern(restored, answer)).toBe(restored);
    expect(restored.pearls).toBe(1);
  });
  it("keeps wrong and helped guesses rewarding without promoting difficulty", () => {
    const p = createPatternRound(undefined, () => 0);
    const t = PATTERN_TEMPLATES.find(t => t.id === p.templateId)!;
    const wrong = answerPattern(p, p.choices.find(c => c !== t.answer)!);
    expect(wrong.pearls).toBe(0);
    expect(wrong.helped).toBe(true);
    const won = answerPattern(wrong, t.answer);
    expect(won.pearls).toBe(1);
    expect(won.independent).toBe(0);
  });
  it("grows difficulty and completes a bracelet without duplicate awards", () => {
    let p = createPatternRound(undefined, () => 0);
    for (let i = 1; i <= 5; i++) {
      const t = PATTERN_TEMPLATES.find(t => t.id === p.templateId)!;
      p = answerPattern(p, t.answer);
      expect(p.pearls).toBe(i);
      expect(p.bracelets).toBe(i === 5 ? 1 : 0);
      if (i !== 5) p = createPatternRound(p, () => 0);
    }
    expect(p.level).toBe(2);
    const next = createPatternRound(p, () => 0);
    expect(next.pearls).toBe(0);
    expect(next.bracelets).toBe(1);
    expect(PATTERN_TEMPLATES.find(t => t.id === next.templateId)!.level).toBe(0);
  });
  it("does not put the answer in the same position three times", () => {
    let p = createPatternRound(undefined, () => 0);
    const positions: number[] = [];
    for (let i = 0; i < 40; i++) {
      const answer = PATTERN_TEMPLATES.find(t => t.id === p.templateId)!.answer;
      positions.push(p.choices.indexOf(answer));
      p = createPatternRound(answerPattern(p, answer), () => 0);
    }
    for (let i = 2; i < positions.length; i++) expect(new Set(positions.slice(i - 2, i + 1)).size).toBeGreaterThan(1);
  });
  it("rejects malformed progress and impossible saved puzzles", () => {
    for (const raw of [null, "{", "null", "[]", '{"version":2}']) expect(parsePatterns(raw).pearls).toBe(0);
    const p = createPatternRound(undefined, () => 0);
    for (const change of [{ choices: ["crab", "fish"] }, { choices: ["shell", "shell"] }, { pearls: 5 }, { solved: true, pearls: 0 }, { level: 99 }, { bracelets: -1 }, { answerPositions: [9] }]) {
      expect(parsePatterns(JSON.stringify({ ...p, ...change })).solved).toBe(false);
      expect(parsePatterns(JSON.stringify({ ...p, ...change })).pearls).toBe(0);
    }
    // Every normal generated progress snapshot can round-trip.
    for (const t of PATTERN_TEMPLATES) {
      const state = { ...p, level: t.level, templateId: t.id, choices: t.options as PatternSymbol[] };
      expect(parsePatterns(JSON.stringify(state))).toEqual(state);
    }
  });
});

describe("Little Reef Builder", () => {
  it("has four distinct relationships with exactly one eligible destination", () => {
    expect(REEF_SCENES).toHaveLength(3);
    expect(new Set(REEF_STEPS.map(s => s.target)).size).toBe(4);
    const used = new Set<string>();
    for (const step of REEF_STEPS) {
      expect(step.options.filter(t => t === step.target)).toHaveLength(1);
      expect(step.options.every(t => !used.has(t))).toBe(true);
      used.add(step.target);
      expect(REEF_TARGETS[step.target]).toBeDefined();
    }
  });
  it("ignores wrong placements, resumes saved decisions, and awards unique reef tiles", () => {
    let p = emptyReef();
    expect(placeReef(p, "water")).toBe(p);
    for (const step of REEF_STEPS) {
      p = placeReef(p, step.target);
      const restored = parseReef(JSON.stringify(p));
      expect(restored).toEqual(p);
      expect(placeReef(restored, step.target)).toBe(restored);
    }
    expect(p.earned).toEqual(["sunny"]);
    p = visitReef(p, 0);
    for (const step of REEF_STEPS) p = placeReef(p, step.target);
    expect(p.earned).toEqual(["sunny"]);
    p = visitReef(p, 1);
    expect(p.scene).toBe(1);
  });
  it("does not allow visiting locked scenes or loading impossible rewards", () => {
    const p = emptyReef();
    expect(visitReef(p, 1)).toBe(p);
    expect(visitReef(p, 20)).toBe(p);
    for (const data of [null, {}, { ...p, scene: 2 }, { ...p, placed: 4 }, { ...p, placed: -1 }, { ...p, earned: ["not-a-reef"] }, { ...p, earned: ["cove"] }, { ...p, earned: ["kelp"] }, { ...p, earned: ["sunny", "kelp"] }]) {
      expect(parseReef(JSON.stringify(data))).toEqual(p);
    }
  });
  it("uses client coordinates, enlarged catch areas and stable nearest-target ties", () => {
    const targets = [{ id: "above" as const, left: 0, top: 0, width: 64, height: 64 }, { id: "below" as const, left: 64, top: 0, width: 64, height: 64 }];
    expect(reefDropTarget({ x: 32, y: 32 }, targets)).toBe("above");
    expect(reefDropTarget({ x: -5, y: 32 }, targets)).toBe("above");
    expect(reefDropTarget({ x: 64, y: 32 }, targets)).toBe("above");
    expect(reefDropTarget({ x: 200, y: 200 }, targets)).toBeNull();
  });
});
