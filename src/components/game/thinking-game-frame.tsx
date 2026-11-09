"use client";
import type { ReactNode } from "react";
import { gameMessages as m } from "@/lib/game-messages";
import { Mascot } from "./mascot";
export function ThinkingGameFrame({ title, onHome, onHelp, onReplay, onVoice, muted, controlsDisabled, children }: {
  title: string; onHome: () => void; onHelp: () => void; onReplay: () => void;
  onVoice: () => void; muted: boolean; controlsDisabled?: boolean; children: ReactNode;
}) {
  return <main className="thinking-game">
    <header className="thinking-header">
      <button className="thinking-icon" onClick={onHome} aria-label={m.home}>←</button>
      <div className="thinking-title"><span>Ocean Buddy</span><h1>{title}</h1></div>
      <button className="thinking-icon" onClick={onVoice} aria-label={muted ? m.voice : m.quiet} aria-pressed={muted}>{muted ? "🔇" : "🔊"}</button>
    </header>
    <div className="thinking-content">{children}</div>
    <footer className="thinking-footer">
      <button className="thinking-icon" onClick={onReplay} disabled={controlsDisabled} aria-label={m.replay}>↻</button>
      <div className="thinking-buddy"><Mascot size={76} /></div>
      <button className="thinking-icon" onClick={onHelp} disabled={controlsDisabled} aria-label={m.help}>☝</button>
    </footer>
  </main>;
}
