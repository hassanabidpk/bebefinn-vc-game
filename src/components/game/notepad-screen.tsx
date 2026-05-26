"use client";

/**
 * Notepad — a free-typing playground for toddlers. Big paper, big keys.
 * Tap a letter or number; it lands on the page in its lesson colour and
 * the narrator says it out loud. Tap any previously-typed character to
 * hear it again. Physical keyboard mirrors the on-screen keys.
 */

import { useEffect, useRef, useState } from "react";
import { alphabetData } from "@/lib/alphabet-data";
import { useSpeech } from "@/hooks/use-speech";
import { useGameAudio } from "@/hooks/use-game-audio";
import { BubbleBackground } from "./ocean-stage";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

const COLOR_BY_CHAR: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const entry of alphabetData) {
    out[entry.letter] = entry.color;
    // Number lessons have letter "1".."10"; map single digits too.
    if (/^[0-9]$/.test(entry.letter)) out[entry.letter] = entry.color;
  }
  // Ensure 0 has a colour even though the lesson is "10".
  out["0"] = out["0"] || "#F39C12";
  return out;
})();

const SPOKEN: Record<string, string> = {
  "0": "Zero",
  "1": "One",
  "2": "Two",
  "3": "Three",
  "4": "Four",
  "5": "Five",
  "6": "Six",
  "7": "Seven",
  "8": "Eight",
  "9": "Nine",
};

interface NotepadScreenProps {
  onHome: () => void;
}

interface Stroke {
  id: number;
  ch: string;
}

export function NotepadScreen({ onHome }: NotepadScreenProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const nextId = useRef(1);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const { speak } = useSpeech();
  const { playTap } = useGameAudio();

  // Keep the latest character in view as the page fills up.
  useEffect(() => {
    const p = paperRef.current;
    if (!p) return;
    p.scrollTo({ top: p.scrollHeight, behavior: "smooth" });
  }, [strokes.length]);

  const speakChar = (ch: string) => {
    const word = SPOKEN[ch] ?? ch;
    speak(`${word}!`);
  };

  const append = (ch: string) => {
    const id = nextId.current++;
    setStrokes((s) => [...s, { id, ch }]);
    speakChar(ch);
    try {
      playTap();
    } catch {
      /* sfx best-effort */
    }
  };
  const backspace = () => {
    setStrokes((s) => s.slice(0, -1));
  };
  const clear = () => setStrokes([]);

  // Physical keyboard: A-Z, 0-9, Backspace, Delete, Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k.length === 1 && /[a-zA-Z]/.test(k)) {
        e.preventDefault();
        append(k.toUpperCase());
        return;
      }
      if (k.length === 1 && /[0-9]/.test(k)) {
        e.preventDefault();
        append(k);
        return;
      }
      if (k === "Backspace") {
        e.preventDefault();
        backspace();
        return;
      }
      if (k === "Delete" || k === "Escape") {
        e.preventDefault();
        clear();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="notepad-screen">
      <BubbleBackground />

      <header className="lesson-header">
        <button className="icon-btn" onClick={onHome} aria-label="Back home">
          ←
        </button>
        <div className="progress-pill">
          <div className="progress-pill-row">
            <span className="progress-letter">📝 Notepad</span>
            <span className="progress-count">{strokes.length}</span>
          </div>
        </div>
        <button
          className="icon-btn"
          onClick={backspace}
          aria-label="Erase last"
          disabled={!strokes.length}
        >
          ⌫
        </button>
        <button
          className="icon-btn coral"
          onClick={clear}
          aria-label="Clear all"
          disabled={!strokes.length}
        >
          ✕
        </button>
      </header>

      <div
        className="notepad-paper"
        role="region"
        aria-label="Notepad page"
        ref={paperRef}
      >
        {strokes.length === 0 ? (
          <div className="notepad-placeholder">Tap a letter or number to start!</div>
        ) : (
          <div className="notepad-strokes">
            {strokes.map((s) => (
              <button
                key={s.id}
                className="notepad-char"
                style={{ color: COLOR_BY_CHAR[s.ch] || "#0E5274" }}
                onClick={() => speakChar(s.ch)}
                aria-label={`Speak ${s.ch}`}
              >
                {s.ch}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="notepad-keyboard">
        <div className="notepad-row notepad-row-letters">
          {LETTERS.map((ch) => (
            <button
              key={ch}
              className="notepad-key"
              style={
                {
                  color: COLOR_BY_CHAR[ch] || "#0E5274",
                  ["--key-color" as string]: COLOR_BY_CHAR[ch] || "#0E5274",
                } as React.CSSProperties
              }
              onClick={() => append(ch)}
              aria-label={ch}
            >
              {ch}
            </button>
          ))}
        </div>
        <div className="notepad-row notepad-row-digits">
          {DIGITS.map((ch) => (
            <button
              key={ch}
              className="notepad-key notepad-key-digit"
              style={
                {
                  color: COLOR_BY_CHAR[ch] || "#FF6B6B",
                  ["--key-color" as string]: COLOR_BY_CHAR[ch] || "#FF6B6B",
                } as React.CSSProperties
              }
              onClick={() => append(ch)}
              aria-label={SPOKEN[ch] ?? ch}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
