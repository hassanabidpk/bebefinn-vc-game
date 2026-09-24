"use client";

/**
 * Notepad — a free-typing playground for toddlers. Big paper, big keys.
 * Tap a letter or number; it lands on the page in its lesson colour and
 * the narrator says it out loud. Tap any previously-typed character to
 * hear it again. Physical keyboard mirrors the on-screen keys.
 * Typing the alphabet in order earns boosters every five letters and a
 * big round of applause at Z.
 */

import { useEffect, useRef, useState } from "react";
import { alphabetData } from "@/lib/alphabet-data";
import { useFriendlySpeech } from "@/hooks/use-friendly-speech";
import { useGameAudio } from "@/hooks/use-game-audio";
import {
  NOTEPAD_ALPHABET_COMPLETE_PHRASE,
  createNotepadTapState,
  getAlphabetMilestone,
  getAlphabetRunLength,
  getNotepadBoosterPhrase,
  registerNotepadTap,
} from "@/lib/notepad-input";
import { getStandaloneLetterSpeech, NOTEPAD_TAP_REMINDER } from "@/lib/tts-phrases";
import { BubbleBackground } from "./ocean-stage";
import { Confetti } from "./confetti";

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

interface Cheer {
  kind: "booster" | "complete";
  letter: string;
  key: number;
}

const BOOSTER_MS = 1800;
const APPLAUSE_MS = 4500;

export function NotepadScreen({ onHome }: NotepadScreenProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const nextId = useRef(1);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const tapStateRef = useRef(createNotepadTapState());
  // Mirrors strokes so the (mount-once) keyboard handler sees the latest page.
  const charsRef = useRef<string[]>([]);
  const [cheer, setCheer] = useState<Cheer | null>(null);
  const cheerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speak } = useFriendlySpeech();
  const { playTap, playCelebrate, playApplause } = useGameAudio();

  useEffect(
    () => () => {
      if (cheerTimer.current) clearTimeout(cheerTimer.current);
    },
    []
  );

  // Keep the latest character in view as the page fills up.
  useEffect(() => {
    const p = paperRef.current;
    if (!p) return;
    p.scrollTo({ top: p.scrollHeight, behavior: "smooth" });
  }, [strokes.length]);

  const speakChar = (ch: string) => {
    const word = SPOKEN[ch] ?? ch;
    speak(/^[A-Z]$/.test(ch) ? getStandaloneLetterSpeech(ch) : `${word}!`);
  };

  const acceptTap = () => {
    const decision = registerNotepadTap(tapStateRef.current, Date.now());
    if (decision === "remind") speak(NOTEPAD_TAP_REMINDER);
    return decision === "accept";
  };

  const celebrate = (kind: Cheer["kind"], run: number) => {
    if (cheerTimer.current) clearTimeout(cheerTimer.current);
    setCheer({ kind, letter: LETTERS[run - 1], key: Date.now() });
    cheerTimer.current = setTimeout(
      () => setCheer(null),
      kind === "complete" ? APPLAUSE_MS : BOOSTER_MS
    );
    speak(kind === "complete" ? NOTEPAD_ALPHABET_COMPLETE_PHRASE : getNotepadBoosterPhrase(run));
    try {
      if (kind === "complete") playApplause();
      else playCelebrate();
    } catch {
      /* sfx best-effort */
    }
  };

  const append = (ch: string) => {
    if (!acceptTap()) return;
    const id = nextId.current++;
    setStrokes((s) => [...s, { id, ch }]);
    charsRef.current = [...charsRef.current, ch];
    const run = getAlphabetRunLength(charsRef.current);
    const milestone = getAlphabetMilestone(run);
    if (milestone) {
      // The cheer names the letter ("A to E!"), so it replaces the letter call.
      celebrate(milestone, run);
      return;
    }
    speakChar(ch);
    try {
      playTap();
    } catch {
      /* sfx best-effort */
    }
  };
  const backspace = () => {
    setStrokes((s) => s.slice(0, -1));
    charsRef.current = charsRef.current.slice(0, -1);
  };
  const clear = () => {
    setStrokes([]);
    charsRef.current = [];
  };

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
                onClick={() => {
                  if (acceptTap()) speakChar(s.ch);
                }}
                aria-label={`Speak ${s.ch}`}
              >
                {s.ch}
              </button>
            ))}
          </div>
        )}
      </div>

      {cheer?.kind === "booster" ? (
        <div key={cheer.key} className="notepad-booster" aria-hidden="true">
          <span className="notepad-booster-rocket">🚀</span>
          <span className="notepad-booster-run">A→{cheer.letter}</span>
          <span className="notepad-booster-star">⭐</span>
        </div>
      ) : null}
      {cheer?.kind === "complete" ? (
        <div key={cheer.key} className="notepad-applause" aria-hidden="true">
          <Confetti />
          <div className="notepad-applause-badge">
            <span className="notepad-applause-hands">👏🎉👏</span>
            <span className="notepad-applause-run">A→Z</span>
          </div>
        </div>
      ) : null}

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
