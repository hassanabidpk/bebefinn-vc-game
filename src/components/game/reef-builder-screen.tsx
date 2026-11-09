"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { gameMessages as m, symbolNames } from "@/lib/game-messages";
import { parseReef, placeReef, REEF_SCENES, REEF_STEPS, reefDropTarget, visitReef, type ReefTargetId } from "@/lib/reef-builder-data";
import { useLocalGame } from "@/hooks/use-local-game";
import { useGameNarration } from "@/hooks/use-game-narration";
import { useGameAudio } from "@/hooks/use-game-audio";
import { SeaSymbol } from "./sea-symbol";
import { ReefBuilderScene } from "./reef-builder-scene";
import { ThinkingGameFrame } from "./thinking-game-frame";
import { Confetti } from "./confetti";

export function ReefBuilderScreen({ onHome }: { onHome: () => void }) {
  const { state, update } = useLocalGame("ocean-buddy-builder-v1", parseReef);
  const { say, stop, muted, toggle } = useGameNarration();
  const { playTap, playCelebrate } = useGameAudio();
  const [selected, setSelected] = useState(false);
  const [hint, setHint] = useState(false);
  const [ready, setReady] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const waitingRef = useRef(false);
  const targets = useRef(new Map<ReefTargetId, HTMLButtonElement>());
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const step = state ? REEF_STEPS[state.placed] : undefined;
  const done = state?.placed === 4;
  const scene = REEF_SCENES[state?.scene ?? 0];

  useEffect(() => {
    if (!state) return;
    setSelected(false); setHint(state.scene === 0 && state.placed < 2); setReady(false);
    if (state.placed === 4) say(m.builderPraise, () => setReady(true));
    else if (waitingRef.current) say(m[REEF_STEPS[state.placed - 1].target], () => setReady(true));
    else say(REEF_STEPS[state.placed].prompt);
    // Only navigation should restart the instruction; earning a tile does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.scene, state?.placed, say]);

  const replay = () => { if (step && !waitingRef.current) { setHint(true); say(step.prompt); } };
  const place = (id: ReefTargetId, fromDrag = false) => {
    if (!step || waitingRef.current) return;
    if (!selected && !fromDrag) { setHint(true); say(m.select); return; }
    if (id !== step.target) {
      setSelected(false); setHint(true); playTap(); say(step.prompt); return;
    }
    // Commit once before starting any speech or animation. Both tap and drag use this path.
    drag.current = null; waitingRef.current = true; setWaiting(true); setSelected(false); setReady(false);
    update(p => placeReef(p, id)); playCelebrate();

  };
  const next = () => {
    stop(); suppressClick.current = false; waitingRef.current = false; setWaiting(false); setReady(false);
    if (state && state.placed < 4) { setHint(state.scene === 0 && state.placed < 2); say(REEF_STEPS[state.placed].prompt); }
  };
  const visit = (index: number) => {
    stop(); suppressClick.current = false; waitingRef.current = false; setWaiting(false); setReady(false); setHint(false); drag.current = null;
    update(p => visitReef(p, index));
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>, dropped: boolean) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null; event.currentTarget.style.transform = "";
    // Cancellation does not produce a follow-up click; leave keyboard selection usable.
    suppressClick.current = dropped && current.moved;
    if (!dropped) { setSelected(false); return; }
    if (!current.moved) return;
    const id = reefDropTarget({ x: event.clientX, y: event.clientY }, [...targets.current].map(([id, node]) => ({ id, ...node.getBoundingClientRect().toJSON() })));
    if (id) place(id, true); else setSelected(false);
  };

  return <ThinkingGameFrame title={m.builder} onHome={() => { stop(); onHome(); }}
    onHelp={replay} onReplay={replay} muted={muted} onVoice={toggle} controlsDisabled={!state || done || waiting}>
    {state ? <>
      <div className="reef-shelf" role="group" aria-label={m.reefShelf}>
        {REEF_SCENES.map((s, i) => <button key={s.id} className={state.scene === i ? "current" : ""}
          disabled={waiting || state.scene === i || (i > 0 && !state.earned.includes(REEF_SCENES[i - 1].id))}
          onClick={() => visit(i)} aria-label={`${s.name}${state.earned.includes(s.id) ? `, ${m.completed}` : ""}`}
          aria-pressed={state.scene === i}><span aria-hidden="true">{s.icon} {state.earned.includes(s.id) ? "⭐" : ""}</span><span>{s.name}</span></button>)}
      </div>
      <h2 className="thinking-prompt" aria-live="polite">{done ? m.builderPraise : waiting ? m[REEF_STEPS[state.placed - 1].target] : step?.prompt}</h2>
      <div className="reef-play-area">
        <div className="reef-picture-cue" aria-hidden="true">
          <span>{done ? "⭐" : waiting ? "✨" : "☝"}</span>
          {step && !waiting ? <div className={`relation-model relation-${step.target}`}>
            <span className="model-landmark">{step.target === "beside" ? "🌿" : "🪨"}</span><span className="model-friend"><SeaSymbol symbol={step.symbol}/></span>
          </div> : null}
        </div>
        <ReefBuilderScene placed={state.placed} hideTargets={waiting} color={scene.color} selected={selected} hint={hint && !waiting}
          onTarget={place} registerTarget={(id, element) => { if (element) targets.current.set(id, element); else targets.current.delete(id); }} />
        {waiting && !done ? <div className="reef-next-overlay"><button className="thinking-next" disabled={!ready} onClick={next} aria-label={m.next}>➜</button></div> : null}
      </div>
      <div className="reef-tray">
        {done ? <>
          <button className="thinking-icon" disabled={!ready} onClick={() => visit(state.scene)} aria-label={m.replayReef}>↻</button>
          <button className="thinking-next" disabled={!ready} onClick={() => visit((state.scene + 1) % REEF_SCENES.length)} aria-label={m.newReef}>➜</button>
        </> : step && !waiting ? <>
          <button key={`${state.scene}-${state.placed}`} className={`reef-piece ${selected ? "selected" : ""}`} aria-label={symbolNames[step.symbol]} aria-pressed={selected}
            onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setSelected(value => !value); playTap(); }}
            onPointerDown={event => {
              if (drag.current || waitingRef.current || (event.pointerType === "mouse" && event.button !== 0)) return;
              suppressClick.current = false; event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
            }}
            onPointerMove={event => {
              const current = drag.current; if (!current || current.id !== event.pointerId) return;
              const x = event.clientX - current.x; const y = event.clientY - current.y;
              if (Math.hypot(x, y) > 8) { current.moved = true; setSelected(true); }
              if (current.moved) event.currentTarget.style.transform = `translate(${x}px, ${y}px)`;
            }} onPointerUp={event => endDrag(event, true)} onPointerCancel={event => endDrag(event, false)} onLostPointerCapture={event => endDrag(event, false)}>
            <SeaSymbol symbol={step.symbol}/>
          </button>
          <span className="reef-tap-cue" aria-live="polite">{selected ? m.place : m.select}</span>
        </> : null}
      </div>
      {done ? <Confetti key={scene.id}/> : null}
    </> : <p role="status">{m.loading}</p>}
  </ThinkingGameFrame>;
}
