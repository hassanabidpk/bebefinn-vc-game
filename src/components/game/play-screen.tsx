"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { alphabetData } from "@/lib/alphabet-data";
import { useSpeech } from "@/hooks/use-speech";
import { BubbleBackground } from "./ocean-stage";
import type { LetterCase } from "./lesson-screen";

const LETTERS = alphabetData.filter((entry) => /^[A-Z]$/.test(entry.letter));
const TILE_COUNT = 8;

interface Tile {
  letter: string;
  word: string;
  color: string;
}

interface Round {
  target: Tile;
  tiles: Tile[];
  key: number;
}

function buildRound(prev?: Round): Round {
  const targetIdx = Math.floor(Math.random() * LETTERS.length);
  const distractors = new Set<number>();
  while (distractors.size < TILE_COUNT - 1) {
    const r = Math.floor(Math.random() * LETTERS.length);
    if (r !== targetIdx) distractors.add(r);
  }
  const tiles = [targetIdx, ...distractors].map((i) => {
    const e = LETTERS[i];
    return { letter: e.letter, word: e.word, color: e.color };
  });
  // Fisher-Yates shuffle
  for (let i = tiles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  const target = LETTERS[targetIdx];
  return {
    target: { letter: target.letter, word: target.word, color: target.color },
    tiles,
    key: (prev?.key ?? 0) + 1,
  };
}

interface SparkleSpec {
  id: number;
  emoji: string;
  dx: number;
  dy: number;
  delay: number;
}

function Sparkles({ x, y }: { x: number; y: number }) {
  const sparks = useMemo<SparkleSpec[]>(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const d = 60 + Math.random() * 40;
      return {
        id: i,
        emoji: ["✨", "⭐", "💫", "🌟"][i % 4],
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d - 20,
        delay: i * 0.04,
      };
    });
  }, []);

  return (
    <>
      {sparks.map((s) => (
        <span
          key={s.id}
          className="sparkle"
          style={
            {
              left: x,
              top: y,
              ["--dx" as string]: `${s.dx}px`,
              ["--dy" as string]: `${s.dy}px`,
              animationDelay: `${s.delay}s`,
            } as React.CSSProperties
          }
        >
          {s.emoji}
        </span>
      ))}
    </>
  );
}

interface PlayScreenProps {
  onHome: () => void;
  letterCase: LetterCase;
}

export function PlayScreen({ onHome, letterCase }: PlayScreenProps) {
  const [round, setRound] = useState<Round>(() => buildRound());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ idx: number; correct: boolean } | null>(null);
  const [sparkAt, setSparkAt] = useState<{ x: number; y: number } | null>(null);
  const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speak } = useSpeech();

  useEffect(() => {
    if (promptTimer.current) clearTimeout(promptTimer.current);
    promptTimer.current = setTimeout(() => {
      speak(`Find the letter… ${round.target.letter}`);
    }, 250);
    return () => {
      if (promptTimer.current) clearTimeout(promptTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.key]);

  const fmt = (l: string) =>
    letterCase === "lower"
      ? l.toLowerCase()
      : letterCase === "both"
        ? `${l}${l.toLowerCase()}`
        : l;

  const onTile = (e: React.MouseEvent<HTMLButtonElement>, i: number) => {
    if (feedback) return;
    const tile = round.tiles[i];
    const correct = tile.letter === round.target.letter;
    setFeedback({ idx: i, correct });

    if (correct) {
      const tileRect = e.currentTarget.getBoundingClientRect();
      const screen = e.currentTarget.closest(".ipad-screen") as HTMLElement | null;
      if (screen) {
        const screenRect = screen.getBoundingClientRect();
        setSparkAt({
          x: tileRect.left + tileRect.width / 2 - screenRect.left,
          y: tileRect.top + tileRect.height / 2 - screenRect.top,
        });
      }
      speak(`${tile.letter}! ${tile.word}!`);
      setScore((s) => s + 10 + streak * 2);
      setStreak((s) => s + 1);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => {
        setFeedback(null);
        setSparkAt(null);
        setRound((rr) => buildRound(rr));
      }, 1100);
    } else {
      speak("Try again!");
      setStreak(0);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => setFeedback(null), 700);
    }
  };

  const overlay = `radial-gradient(circle at 50% 10%, ${round.target.color}55 0%, transparent 32%), linear-gradient(180deg, ${round.target.color}33 0%, #0495d9 48%, #005580 100%)`;

  return (
    <div className="play-screen" style={{ backgroundColor: `${round.target.color}22` }}>
      <div className="lesson-bg-overlay" style={{ background: overlay }} />
      <BubbleBackground />

      <header className="lesson-header">
        <button className="icon-btn" onClick={onHome} aria-label="Back home">←</button>
        <div className="progress-pill">
          <div className="progress-pill-row">
            <span className="progress-letter">🎮 Find the Letter</span>
            <span className="progress-count">Streak {streak}</span>
          </div>
        </div>
        <div />
        <div className="score-pill">
          <span className="star">⭐</span>
          {score}
        </div>
      </header>

      <div className="play-prompt-row">
        <div className="prompt-bubble">
          <span>Tap the letter</span>
          <span className="target-letter">{fmt(round.target.letter)}</span>
          <button
            className="prompt-speak"
            onClick={(e) => {
              e.stopPropagation();
              speak(round.target.letter);
            }}
            aria-label="Speak target letter"
          >
            🔊
          </button>
        </div>
      </div>

      <div className="play-grid" key={round.key}>
        {round.tiles.map((t, i) => (
          <button
            key={`${round.key}-${i}`}
            className={`play-tile ${
              feedback?.idx === i ? (feedback.correct ? "correct" : "wrong") : ""
            }`}
            onClick={(e) => onTile(e, i)}
          >
            {fmt(t.letter)}
          </button>
        ))}
      </div>

      {sparkAt ? <Sparkles x={sparkAt.x} y={sparkAt.y} /> : null}
    </div>
  );
}
