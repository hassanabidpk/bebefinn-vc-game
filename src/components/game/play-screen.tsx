"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { alphabetData } from "@/lib/alphabet-data";
import { useSpeech } from "@/hooks/use-speech";
import { useGeminiTTS } from "@/hooks/use-gemini-tts";
import { useGameAudio } from "@/hooks/use-game-audio";
import { BubbleBackground } from "./ocean-stage";
import { AnimalPhoto, isRealAnimal } from "./animal-photo";
import type { LetterCase } from "./lesson-screen";

// Only letters that have a real animal photo are eligible — the game
// is "find the animal" and a card without a photo can't be a target.
const ANIMAL_LESSONS = alphabetData.filter(
  (entry) => /^[A-Z]$/.test(entry.letter) && isRealAnimal(entry.word)
);
const TILE_COUNT = 4;

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
  // Avoid repeating the previous target back-to-back.
  let targetIdx = Math.floor(Math.random() * ANIMAL_LESSONS.length);
  if (prev) {
    while (ANIMAL_LESSONS[targetIdx].word === prev.target.word) {
      targetIdx = Math.floor(Math.random() * ANIMAL_LESSONS.length);
    }
  }
  const distractors = new Set<number>();
  while (distractors.size < TILE_COUNT - 1) {
    const r = Math.floor(Math.random() * ANIMAL_LESSONS.length);
    if (r !== targetIdx) distractors.add(r);
  }
  const tiles = [targetIdx, ...distractors].map((i) => {
    const e = ANIMAL_LESSONS[i];
    return { letter: e.letter, word: e.word, color: e.color };
  });
  // Fisher-Yates shuffle
  for (let i = tiles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  const target = ANIMAL_LESSONS[targetIdx];
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

export function PlayScreen({ onHome }: PlayScreenProps) {
  const [round, setRound] = useState<Round>(() => buildRound());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ idx: number; correct: boolean } | null>(null);
  const [sparkAt, setSparkAt] = useState<{ x: number; y: number } | null>(null);
  const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speak } = useSpeech();
  const { play: geminiPlay, prefetch: geminiPrefetch } = useGeminiTTS();
  const { playAnimalSound } = useGameAudio();

  // Speak the prompt with Gemini Leda; fall back to browser TTS on
  // network errors so kids always hear something.
  const speakPrompt = (text: string) => {
    geminiPlay(text, { voice: "Leda" }).catch(() => speak(text));
  };

  useEffect(() => {
    if (promptTimer.current) clearTimeout(promptTimer.current);
    const phrase = `Find the ${round.target.word}!`;
    // Prefetch ahead of any later replays.
    geminiPrefetch(phrase, "Leda");
    promptTimer.current = setTimeout(() => speakPrompt(phrase), 250);
    return () => {
      if (promptTimer.current) clearTimeout(promptTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.key]);

  const onTile = (e: React.MouseEvent<HTMLButtonElement>, i: number) => {
    if (feedback) return;
    const tile = round.tiles[i];
    const correct = tile.word === round.target.word;
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
      // Animal sound first for instant tactile feedback, then narration.
      playAnimalSound(tile.word.toLowerCase());
      setTimeout(() => speakPrompt(`${tile.letter}! ${tile.word}!`), 350);
      setScore((s) => s + 10 + streak * 2);
      setStreak((s) => s + 1);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => {
        setFeedback(null);
        setSparkAt(null);
        setRound((rr) => buildRound(rr));
      }, 1500);
    } else {
      speakPrompt("Try again!");
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
            <span className="progress-letter">🐾 Find the Animal</span>
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
          <span>Find the</span>
          <span className="target-letter" style={{ color: round.target.color }}>
            {round.target.word}
          </span>
          <button
            className="prompt-speak"
            onClick={(e) => {
              e.stopPropagation();
              speakPrompt(`Find the ${round.target.word}!`);
            }}
            aria-label="Speak target word"
          >
            🔊
          </button>
        </div>
      </div>

      <div className="play-grid play-grid-animals" key={round.key}>
        {round.tiles.map((t, i) => (
          <button
            key={`${round.key}-${i}`}
            className={`play-tile play-tile-animal ${
              feedback?.idx === i ? (feedback.correct ? "correct" : "wrong") : ""
            }`}
            onClick={(e) => onTile(e, i)}
            aria-label={t.word}
          >
            <AnimalPhoto word={t.word} color={t.color} size={170} />
            <span className="play-tile-label" style={{ color: t.color }}>
              {t.word}
            </span>
          </button>
        ))}
      </div>

      {sparkAt ? <Sparkles x={sparkAt.x} y={sparkAt.y} /> : null}
    </div>
  );
}
