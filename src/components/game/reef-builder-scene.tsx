"use client";
import type { CSSProperties } from "react";
import { REEF_STEPS, REEF_TARGETS, type ReefTargetId } from "@/lib/reef-builder-data";
import { gameMessages as m } from "@/lib/game-messages";
import { SeaSymbol } from "./sea-symbol";

export function ReefBuilderScene({ placed, color, selected, hint, hideTargets, onTarget, registerTarget }: {
  placed: number; hideTargets: boolean; color: string; selected: boolean; hint: boolean;
  onTarget: (target: ReefTargetId) => void;
  registerTarget: (id: ReefTargetId, element: HTMLButtonElement | null) => void;
}) {
  const step = REEF_STEPS[placed];
  return <div className="reef-scene" style={{ backgroundColor: color }}>
    <svg viewBox="0 0 800 420" preserveAspectRatio="none" className="reef-landscape" aria-hidden="true">
      <path d="M0 342Q190 300 400 348T800 320V420H0Z" fill="#ffe3a2"/>
      <path d="M190 251Q168 156 297 153Q397 137 425 251Z" fill="#8ca3b4" stroke="#3e5c70" strokeWidth="5"/>
      <path d="M245 251Q238 181 304 179Q374 181 369 251Z" fill="#284e63"/>
      <path d="M533 300Q550 236 529 182M551 300Q594 240 576 208M564 299Q625 261 613 226" fill="none" stroke="#318265" strokeWidth="20" strokeLinecap="round"/>
      <g fill="none" stroke="#6ab6c9" strokeWidth="3"><circle cx="710" cy="90" r="12"/><circle cx="744" cy="58" r="8"/></g>
    </svg>
    {REEF_STEPS.slice(0, placed).map(s => <span key={s.target} className="reef-friend" aria-hidden="true"
      style={{ left: `${REEF_TARGETS[s.target].x}%`, top: `${REEF_TARGETS[s.target].y}%` }}><SeaSymbol symbol={s.symbol} /></span>)}
    {!hideTargets && step?.options.map(id => <button key={id} ref={element => registerTarget(id, element)}
      className={`reef-pad ${hint && id === step.target ? "guided" : ""} ${selected ? "selecting" : ""}`}
      style={{ left: `${REEF_TARGETS[id].x}%`, top: `${REEF_TARGETS[id].y}%` } as CSSProperties}
      onClick={() => onTarget(id)} aria-label={m[id]}>
      {hint && id === step.target ? <span className="reef-ghost" aria-hidden="true"><SeaSymbol symbol={step.symbol}/></span> : <span aria-hidden="true">·</span>}
    </button>)}
  </div>;
}
