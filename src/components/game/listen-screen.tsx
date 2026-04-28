"use client";

import { useEffect, useRef, useState } from "react";
import { alphabetData } from "@/lib/alphabet-data";
import { useSpeech } from "@/hooks/use-speech";
import { BubbleBackground } from "./ocean-stage";
import type { LetterCase } from "./lesson-screen";

const LETTERS = alphabetData.filter((entry) => /^[A-Z]$/.test(entry.letter));
const TOTAL = LETTERS.length;

interface ListenScreenProps {
  onHome: () => void;
  letterCase: LetterCase;
}

export function ListenScreen({ onHome, letterCase }: ListenScreenProps) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speak, stop } = useSpeech();
  const item = LETTERS[idx];
  const display =
    letterCase === "lower"
      ? item.letter.toLowerCase()
      : letterCase === "both"
        ? `${item.letter}${item.letter.toLowerCase()}`
        : item.letter;
  const overlay = `radial-gradient(circle at 50% 10%, ${item.color}55 0%, transparent 32%), linear-gradient(180deg, ${item.color}33 0%, #0495d9 48%, #005580 100%)`;

  useEffect(() => {
    if (!playing) return;
    speak(`${item.letter}. ${item.word}`);
    stepTimer.current = setTimeout(() => {
      setIdx((i) => (i + 1) % TOTAL);
    }, 2200);
    return () => {
      if (stepTimer.current) clearTimeout(stepTimer.current);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, playing]);

  const togglePlaying = () => {
    setPlaying((p) => {
      if (p) stop();
      return !p;
    });
  };

  return (
    <div className="lesson" style={{ backgroundColor: `${item.color}22` }}>
      <div className="lesson-bg-overlay" style={{ background: overlay }} />
      <BubbleBackground />

      <header className="lesson-header">
        <button className="icon-btn" onClick={onHome} aria-label="Back home">←</button>
        <div className="progress-pill">
          <div className="progress-pill-row">
            <span className="progress-letter">🎵 Listen</span>
            <span className="progress-count">{idx + 1}/{TOTAL}</span>
          </div>
        </div>
        <div />
        <div />
      </header>

      <div className="listen-stage">
        <div className="listen-letter" key={`ll-${idx}`}>{display}</div>
        <div className="listen-emoji" key={`le-${idx}`}>{item.emoji}</div>
        <div className="listen-word">{item.word}</div>
        <div className="alphabet-strip">
          {LETTERS.map((a, i) => (
            <span key={a.letter} className={`strip-letter ${i === idx ? "active" : ""}`}>
              {a.letter}
            </span>
          ))}
        </div>
        <div className="listen-controls">
          <button
            className="icon-btn"
            onClick={() => setIdx((i) => (i - 1 + TOTAL) % TOTAL)}
            aria-label="Previous letter"
          >
            ⏮
          </button>
          <button
            className="play-pause"
            onClick={togglePlaying}
            aria-label={playing ? "Pause autoplay" : "Resume autoplay"}
          >
            {playing ? "⏸" : "▶"}
          </button>
          <button
            className="icon-btn"
            onClick={() => setIdx((i) => (i + 1) % TOTAL)}
            aria-label="Next letter"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
}
