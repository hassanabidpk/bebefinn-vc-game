import { createPatternRound, PATTERN_TEMPLATES, type PatternsProgress } from "./patterns-data";
export const PATTERNS_KEY = "ocean-buddy-patterns-v1";
export function parsePatterns(raw: string | null): PatternsProgress {
  try {
    const p = JSON.parse(raw ?? "null") as PatternsProgress | null;
    const t = PATTERN_TEMPLATES.find(t => t.id === p?.templateId);
    if (!p || p.version !== 1 || !t || !Array.isArray(p.choices) ||
      p.choices.length !== t.options.length || new Set(p.choices).size !== p.choices.length ||
      !p.choices.every(c => t.options.includes(c)) || typeof p.solved !== "boolean" || typeof p.helped !== "boolean" ||
      !Number.isInteger(p.level) || p.level < t.level || p.level > 3 ||
      !Number.isInteger(p.independent) || p.independent < 0 || p.independent > 1 ||
      !Number.isSafeInteger(p.bracelets) || p.bracelets < 0 ||
      !Number.isInteger(p.pearls) || p.pearls < 0 || p.pearls > 5 ||
      (p.pearls === 5 && !p.solved) || (p.solved && p.pearls === 0) ||
      !Array.isArray(p.answerPositions) || p.answerPositions.length > 2 ||
      !p.answerPositions.every(n => Number.isInteger(n) && n >= 0 && n < 3)) return createPatternRound();
    return { version: 1, level: p.level, independent: p.independent, bracelets: p.bracelets,
      pearls: p.pearls, templateId: t.id, choices: [...p.choices], solved: p.solved,
      helped: p.helped, answerPositions: [...p.answerPositions] };
  } catch { return createPatternRound(); }
}
