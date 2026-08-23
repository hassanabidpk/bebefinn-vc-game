"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { alphabetData } from "@/lib/alphabet-data";
import { findAnimalGuessIndex, pickAnimalTargetIndex } from "@/lib/animal-guess";
import { useFriendlySpeech } from "@/hooks/use-friendly-speech";
import { useGameAudio } from "@/hooks/use-game-audio";
import { BubbleBackground } from "./ocean-stage";
import { AnimalPhoto, isRealAnimal } from "./animal-photo";
import { Confetti } from "./confetti";
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

function buildRound(recentWords: readonly string[] = [], previousKey = 0): Round {
  const targetIdx = pickAnimalTargetIndex(ANIMAL_LESSONS, recentWords);
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
    key: previousKey + 1,
  };
}

interface SparkleSpec {
  id: number;
  emoji: string;
  dx: number;
  dy: number;
  delay: number;
}

function Sparkles() {
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
              left: "50%",
              top: "50%",
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
  const [milestone, setMilestone] = useState(0);
  const recentTargetsRef = useRef<string[]>([round.target.word]);
  const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const narrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const milestoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundWatchdogTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speak, prefetch } = useFriendlySpeech();
  const { playAnimalSound } = useGameAudio();

  // Immediate device speech keeps tap feedback responsive when cloud TTS is unavailable.
  const speakPrompt = useCallback((text: string, onEnd?: () => void) => {
    speak(text, { onEnd });
  }, [speak]);

  useEffect(() => {
    if (promptTimer.current) clearTimeout(promptTimer.current);
    const phrase = `Find the ${round.target.word}!`;
    prefetch(phrase);
    prefetch(`${round.target.letter}! ${round.target.word}!`);
    promptTimer.current = setTimeout(() => speakPrompt(phrase), 250);
    return () => {
      if (promptTimer.current) clearTimeout(promptTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefetch, round.key, round.target.word, speakPrompt]);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      if (narrationTimer.current) clearTimeout(narrationTimer.current);
      if (milestoneTimer.current) clearTimeout(milestoneTimer.current);
      if (roundWatchdogTimer.current) clearTimeout(roundWatchdogTimer.current);
    };
  }, []);

  const onTile = useCallback((i: number) => {
    if (feedback) return;
    if (promptTimer.current) {
      clearTimeout(promptTimer.current);
      promptTimer.current = null;
    }
    const tile = round.tiles[i];
    const correct = tile.word === round.target.word;
    setFeedback({ idx: i, correct });

    if (correct) {
      setScore((s) => s + 10 + streak * 2);
      const newStreak = streak + 1;
      setStreak(newStreak);
      const successPhrase = newStreak % 5 === 0
        ? `Amazing! ${newStreak} in a row!`
        : `${tile.letter}! ${tile.word}!`;

      let advancing = false;
      const advanceRound = () => {
        if (advancing) return;
        advancing = true;
        if (roundWatchdogTimer.current) {
          clearTimeout(roundWatchdogTimer.current);
          roundWatchdogTimer.current = null;
        }
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => {
          setFeedback(null);
          setRound((currentRound) => {
            const next = buildRound(recentTargetsRef.current, currentRound.key);
            recentTargetsRef.current = [...recentTargetsRef.current, next.target.word].slice(-6);
            return next;
          });
        }, 300);
      };
      // A stalled HTMLAudioElement or speech engine must never trap a child
      // on a disabled round. Healthy four-second clips and praise finish first.
      roundWatchdogTimer.current = setTimeout(advanceRound, 12000);

      // Every 5 in a row, celebrate out loud — toddlers can't read the count.
      if (newStreak % 5 === 0) {
        setMilestone((m) => m + 1);
        milestoneTimer.current = setTimeout(() => setMilestone(0), 3000);
      }

      // Play the full animal clip, then the full spoken praise, and only
      // then reveal the next animal. Long four-second clips are never cut off.
      playAnimalSound(tile.word.toLowerCase(), () => {
        narrationTimer.current = setTimeout(
          () => speakPrompt(successPhrase, advanceRound),
          180
        );
      });
    } else {
      speakPrompt("Almost! Try again.");
      setStreak(0);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => setFeedback(null), 700);
    }
  }, [feedback, playAnimalSound, round, speakPrompt, streak]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || feedback) return;
      const index = findAnimalGuessIndex(event.key, round.tiles);
      if (index < 0) return;
      event.preventDefault();
      onTile(index);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [feedback, onTile, round.tiles]);

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
            disabled={Boolean(feedback)}
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
            onClick={() => onTile(i)}
            aria-label={t.word}
          >
            <AnimalPhoto word={t.word} color={t.color} size={170} />
            <span className="play-tile-label" style={{ color: t.color }}>
              {t.word}
            </span>
            {feedback?.idx === i && feedback.correct ? <Sparkles /> : null}
          </button>
        ))}
      </div>

      {milestone ? <Confetti key={`streak-${milestone}`} /> : null}
    </div>
  );
}
