export type SeaSymbolId = "shell" | "starfish" | "fish" | "crab";
export type PatternSymbol = Exclude<SeaSymbolId, "crab">;
export const PATTERN_SYMBOLS: readonly PatternSymbol[] = ["shell", "starfish", "fish"];
const UNITS = [[0, 1], [0, 0, 1], [0, 1, 1], [0, 1, 2]] as const;
export const PATTERN_TEMPLATES = UNITS.flatMap((unit, level) =>
  PATTERN_SYMBOLS.map((_, variant) => {
    const symbols = PATTERN_SYMBOLS.map((__, i) => PATTERN_SYMBOLS[(i + variant) % 3]);
    const count = level === 0 ? 4 : 5;
    const sequence = Array.from({ length: count }, (__, i) => symbols[unit[i % unit.length]]);
    return { id: `${level}-${variant}`, level, unitSize: unit.length, sequence,
      answer: symbols[unit[count % unit.length]],
      options: symbols.slice(0, level < 2 ? 2 : 3) };
  })
);
export interface PatternsProgress {
  version: 1; level: number; independent: number; bracelets: number; pearls: number;
  templateId: string; choices: PatternSymbol[]; solved: boolean; helped: boolean;
  answerPositions: number[];
}
export function createPatternRound(
  previous?: PatternsProgress, random: () => number = Math.random
): PatternsProgress {
  const level = previous?.level ?? 0;
  const warmup = !previous || previous.pearls === 5;
  const templates = PATTERN_TEMPLATES.filter(t => t.level === (warmup ? 0 : level));
  const choicesAvailable = templates.filter(t => t.id !== previous?.templateId);
  const template = choicesAvailable[Math.floor(random() * choicesAvailable.length)];
  const choices = [...template.options];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  const history = previous?.answerPositions ?? [];
  if (history.length === 2 && history[0] === history[1] && choices.indexOf(template.answer) === history[0]) {
    const i = choices.indexOf(template.answer); const j = (i + 1) % choices.length;
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { version: 1, level, independent: previous?.independent ?? 0,
    bracelets: previous?.bracelets ?? 0, pearls: warmup ? 0 : previous.pearls,
    templateId: template.id, choices, solved: false, helped: false, answerPositions: history };
}
export function answerPattern(state: PatternsProgress, answer: PatternSymbol): PatternsProgress {
  if (state.solved) return state;
  const template = PATTERN_TEMPLATES.find(t => t.id === state.templateId)!;
  if (answer !== template.answer) return { ...state, helped: true };
  const independent = state.helped ? 0 : state.independent + 1;
  const level = independent >= 2 ? Math.min(3, state.level + 1) : state.level;
  const pearls = state.pearls + 1;
  return { ...state, solved: true, pearls, level, independent: independent >= 2 ? 0 : independent,
    bracelets: state.bracelets + (pearls === 5 ? 1 : 0),
    answerPositions: [...state.answerPositions, state.choices.indexOf(answer)].slice(-2) };
}
