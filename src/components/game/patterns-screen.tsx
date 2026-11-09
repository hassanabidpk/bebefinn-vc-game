"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { gameMessages as m, symbolNames } from "@/lib/game-messages";
import { answerPattern, createPatternRound, PATTERN_TEMPLATES, type PatternSymbol } from "@/lib/patterns-data";
import { parsePatterns, PATTERNS_KEY } from "@/lib/patterns-progress";
import { useLocalGame } from "@/hooks/use-local-game";
import { useGameNarration } from "@/hooks/use-game-narration";
import { useGameAudio } from "@/hooks/use-game-audio";
import { ThinkingGameFrame } from "./thinking-game-frame";
import { SeaSymbol } from "./sea-symbol";
import { Confetti } from "./confetti";

export function PatternsScreen({ onHome }: { onHome: () => void }) {
  const { state, update } = useLocalGame(PATTERNS_KEY, parsePatterns);
  const { say, stop, muted, toggle } = useGameNarration();
  const { playTap, playCelebrate, playNext } = useGameAudio();
  const [ready, setReady] = useState(false);
  const [walking, setWalking] = useState<number | null>(null);
  const [idleHint, setIdleHint] = useState(false);
  const idleCancelled = useRef(false);
  const template = PATTERN_TEMPLATES.find(t => t.id === state?.templateId);
  const sequence = template ? [...template.sequence, ...(state?.solved ? [template.answer] : [])] : [];

  useEffect(() => {
    if (!state || !template) return;
    idleCancelled.current = false; setReady(false); setIdleHint(false); setWalking(state.solved ? 0 : null);
    if (state.solved) {
      const words = [...template.sequence, template.answer].map(s => symbolNames[s]).join(", ");
      say(`${words}. ${state.pearls === 5 ? m.bracelet : m.patternPraise}`, () => setReady(true));
    } else say(m.patternPrompt);
    // State decisions are persisted before their narration; only a new round/answer replays it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.templateId, state?.solved, say]);

  useEffect(() => {
    if (walking === null) return;
    const timer = setTimeout(() => setWalking(walking + 1 < sequence.length ? walking + 1 : null), 650);
    return () => clearTimeout(timer);
  }, [walking, sequence.length]);
  useEffect(() => {
    if (!state || state.solved || state.helped) return;
    const timer = setTimeout(() => { if (!idleCancelled.current) setIdleHint(true); }, 6000);
    return () => clearTimeout(timer);
  }, [state?.templateId, state?.solved, state?.helped]);

  const choose = useCallback((choice: PatternSymbol) => {
    idleCancelled.current = true; setIdleHint(false);
    update(previous => {
      const next = answerPattern(previous, choice);
      if (next !== previous) {
        if (next.solved) playCelebrate(); else playTap();
      }
      return next;
    });
  }, [playCelebrate, playTap, update]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || state?.solved) return;
      const index = Number(event.key) - 1;
      const choice = state?.choices[index];
      if (choice && /^[1-3]$/.test(event.key)) { event.preventDefault(); choose(choice); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [choose, state]);

  const replay = () => {
    idleCancelled.current = true; setIdleHint(false); setWalking(0);
    say(`${template?.sequence.map(s => symbolNames[s]).join(", ")}. ${m.patternPrompt}`);
  };
  const help = () => {
    idleCancelled.current = true; setIdleHint(false);
    update(previous => previous.solved ? previous : { ...previous, helped: true });
    say(m.patternHint);
  };
  return <ThinkingGameFrame title={m.patterns} onHome={() => { stop(); onHome(); }}
    onHelp={help} onReplay={replay} muted={muted} onVoice={toggle} controlsDisabled={!state || state.solved}>
    {state && template ? <>
      <div className="thinking-progress" aria-label={`${state.pearls} of 5 pearls; ${state.bracelets} bracelets`}>
        {Array.from({ length: 5 }, (_, i) => <span key={i} className={`pearl ${i < state.pearls ? "earned" : ""}`} aria-hidden="true" />)}
        <span className="bracelet-total" aria-hidden="true">📿 {state.bracelets}</span>
      </div>
      <h2 className="thinking-prompt" aria-live="polite">{state.solved ? (state.pearls === 5 ? m.bracelet : m.patternPraise) : m.patternPrompt}</h2>
      <ol className={`pattern-path ${state.helped || template.level === 0 ? "grouped" : ""}`}
        aria-label={m.sequence} style={{ "--pattern-unit": template.unitSize } as React.CSSProperties}>
        {Array.from({ length: template.sequence.length + 1 }, (_, i) => {
          const symbol = sequence[i];
          return <li key={i} className={`pattern-bubble ${i % template.unitSize === 0 ? "unit-start" : ""} ${(i + 1) % template.unitSize === 0 ? "unit-end" : ""} ${!symbol ? "missing" : ""} ${walking === i ? "spotlight" : ""}`}
            aria-label={symbol ? `${i + 1}: ${symbolNames[symbol]}` : m.missing}>
            {symbol ? <SeaSymbol symbol={symbol} /> : <span aria-hidden="true">?</span>}
            {i === 2 ? <span className="pattern-turn" aria-label={m.path}>↳</span> : null}
          </li>;
        })}
      </ol>
      <div className="pattern-choices" role="group" aria-label={m.choose}>
        {state.solved ? <button className="thinking-next" disabled={!ready} onClick={() => {
          stop(); playNext(); update(p => createPatternRound(p));
        }} aria-label={state.pearls === 5 ? m.newBracelet : m.next}>➜</button> : state.choices.map(choice =>
          <button key={choice} className={`pattern-choice ${state.helped && choice === template.answer ? "guided" : ""} ${idleHint ? "idle-cue" : ""}`}
            onClick={() => choose(choice)} aria-label={symbolNames[choice]}><SeaSymbol symbol={choice} /></button>)}
      </div>
      {state.solved ? <Confetti key={`${state.bracelets}-${state.pearls}`} /> : null}
    </> : <p role="status">{m.loading}</p>}
  </ThinkingGameFrame>;
}
