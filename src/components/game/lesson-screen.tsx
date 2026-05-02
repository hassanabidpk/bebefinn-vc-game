"use client";

import { useEffect, useRef, useState } from "react";
import { alphabetData } from "@/lib/alphabet-data";
import { useGameAudio } from "@/hooks/use-game-audio";
import { useSpeech } from "@/hooks/use-speech";
import { Mascot } from "./mascot";
import { SpeakingBars } from "./speaking-bars";
import { Confetti } from "./confetti";
import { BubbleBackground } from "./ocean-stage";
import { AnimalPhoto, hasAnimalPhoto, hasAnimalVideo, getAnimalVideo } from "./animal-photo";
import { getAnimalInfo } from "@/lib/animal-info";

// Lessons cover the 26 letters plus the 10 number lessons (1–9 and 10).
const LETTERS = alphabetData.filter((entry) =>
  /^[A-Z]$|^[1-9]$|^10$/.test(entry.letter)
);
const TOTAL = LETTERS.length;

export type LetterCase = "upper" | "lower" | "both";

interface LessonScreenProps {
  index: number;
  onIndex: (i: number) => void;
  onHome: () => void;
  letterCase: LetterCase;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
}

export function LessonScreen({
  index,
  onIndex,
  onHome,
  letterCase,
  isMusicPlaying,
  onToggleMusic,
}: LessonScreenProps) {
  const item = LETTERS[Math.max(0, Math.min(index, TOTAL - 1))];
  const [isGuessing, setIsGuessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const flipBackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animalSoundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakOffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speak, speakBilingual, stop } = useSpeech();
  const { playAnimalSound } = useGameAudio();

  const display =
    letterCase === "lower"
      ? item.letter.toLowerCase()
      : letterCase === "both"
        ? `${item.letter}${item.letter.toLowerCase()}`
        : item.letter;
  const isFirst = index === 0;
  const isLast = index === TOTAL - 1;
  const progressPct = ((index + 1) / TOTAL) * 100;
  const overlay = `radial-gradient(circle at 50% 10%, ${item.color}55 0%, transparent 32%), linear-gradient(180deg, ${item.color}33 0%, #0495d9 48%, #005580 100%)`;

  const clearAllTimers = () => {
    [guessTimer, speechTimer, animalSoundTimer, confettiTimer, speakOffTimer, flipBackTimer].forEach((ref) => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
  };

  // Keyboard shortcut: A-Z, 1-9 (numbers), 0 (=10), and ←/→ to navigate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k.length === 1 && k >= "a" && k <= "z") {
        const target = LETTERS.findIndex((it) => it.letter.toLowerCase() === k);
        if (target >= 0 && target !== index) {
          e.preventDefault();
          onIndex(target);
        }
        return;
      }
      if (k.length === 1 && k >= "1" && k <= "9") {
        const target = LETTERS.findIndex((it) => it.letter === k);
        if (target >= 0 && target !== index) {
          e.preventDefault();
          onIndex(target);
        }
        return;
      }
      if (k === "0") {
        const target = LETTERS.findIndex((it) => it.letter === "10");
        if (target >= 0 && target !== index) {
          e.preventDefault();
          onIndex(target);
        }
        return;
      }
      if (e.key === "ArrowRight" && index < TOTAL - 1) {
        e.preventDefault();
        onIndex(index + 1);
      } else if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        onIndex(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onIndex]);

  // Guess → reveal → speak → confetti, kicked off whenever the lesson changes.
  useEffect(() => {
    clearAllTimers();
    setIsGuessing(true);
    setIsSpeaking(false);
    setShowConfetti(false);
    setVideoOpen(false);
    setFlipped(false);

    guessTimer.current = setTimeout(() => {
      setIsGuessing(false);
      setIsSpeaking(true);

      const hasPhoto = hasAnimalPhoto(item.word);
      const isNumber = /^[0-9]+$/.test(item.letter);
      const phrase = isNumber
        ? `${item.letter} for ${item.word}!`
        : `${item.letter}! ${item.letter} for ${item.word}!`;
      if (hasPhoto) {
        playAnimalSound(item.word.toLowerCase());
        speechTimer.current = setTimeout(() => speak(phrase), 900);
      } else {
        speak(phrase);
      }

      setShowConfetti(true);
      confettiTimer.current = setTimeout(() => setShowConfetti(false), 1600);
      speakOffTimer.current = setTimeout(() => setIsSpeaking(false), 3200);
    }, 860);

    return () => {
      clearAllTimers();
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleReplay = () => {
    clearAllTimers();
    setIsSpeaking(true);
    const hasPhoto = hasAnimalPhoto(item.word);
    const isNumber = /^[0-9]+$/.test(item.letter);
    const phrase = isNumber
      ? `${item.letter} for ${item.word}!`
      : `${item.letter}! ${item.letter} for ${item.word}!`;
    if (hasPhoto) {
      playAnimalSound(item.word.toLowerCase());
      speechTimer.current = setTimeout(() => speak(phrase), 900);
    } else {
      speak(phrase);
    }
    speakOffTimer.current = setTimeout(() => setIsSpeaking(false), 3200);
  };

  const handlePrev = () => {
    if (isFirst) return;
    onIndex(index - 1);
  };
  const handleNext = () => {
    if (isLast) return;
    onIndex(index + 1);
  };

  return (
    <div
      className="lesson"
      style={{ backgroundColor: `${item.color}22` }}
      data-letter={item.letter}
    >
      <div className="lesson-bg-overlay" style={{ background: overlay }} />
      <BubbleBackground />
      <div className="lesson-floor-tint" />
      <span className="lesson-decor" style={{ left: "8%" }}>🪸</span>
      <span className="lesson-decor" style={{ right: "9%" }}>🐚</span>
      <span className="lesson-decor" style={{ left: "22%", bottom: 60 }}>⭐</span>

      {showConfetti ? <Confetti /> : null}

      <header className="lesson-header lesson-header--with-picker">
        <button className="icon-btn" onClick={onHome} aria-label="Back home">←</button>
        <div className="progress-pill">
          <div className="progress-pill-row">
            <span className="progress-letter">{isGuessing ? "?" : item.letter}</span>
            <span className="progress-count">{index + 1}/{TOTAL}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <button
          className="icon-btn"
          onClick={() => setPickerOpen((v) => !v)}
          aria-label={pickerOpen ? "Close letter picker" : "Open letter picker"}
        >
          ⌨
        </button>
        <button
          className="icon-btn"
          onClick={onToggleMusic}
          aria-label={isMusicPlaying ? "Pause music" : "Play music"}
        >
          {isMusicPlaying ? "♫" : "♪"}
        </button>
        <button className="icon-btn" onClick={handleReplay} aria-label="Replay">🔊</button>
      </header>

      {pickerOpen ? (
        <div className="letter-picker-overlay" onClick={() => setPickerOpen(false)}>
          <div
            className="letter-picker"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Pick a letter"
          >
            <div className="letter-picker-header">
              <span>Pick a letter</span>
              <button
                className="letter-picker-close"
                onClick={() => setPickerOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="letter-picker-grid">
              {LETTERS.map((it, i) => (
                <button
                  key={it.letter}
                  className={`letter-picker-tile ${i === index ? "active" : ""}`}
                  style={{
                    color: it.color,
                    boxShadow: i === index ? `0 0 0 4px ${it.color}` : undefined,
                  }}
                  onClick={() => {
                    setPickerOpen(false);
                    if (i !== index) onIndex(i);
                  }}
                  aria-label={`${it.letter} for ${it.word}`}
                >
                  {it.letter}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="lesson-body">
        <div className="lesson-mascot-col">
          <Mascot size={170} animation={isSpeaking ? "talking" : "idle"} onClick={handleReplay} />
          <div
            className={`speech-bubble ${isSpeaking ? "active" : ""}`}
            style={{ color: item.color }}
            key={`sb-${index}-${isGuessing ? "g" : "r"}`}
          >
            <SpeakingBars active={isSpeaking} color={item.color} />
            <span>{isGuessing ? "Guess!" : `${item.letter} for ${item.word}!`}</span>
          </div>
        </div>

        <div className="lesson-card-col">
          <div
            className={`lesson-card-flip ${flipped ? "is-flipped" : ""}`}
            onClick={() => {
              if (flipped) {
                stop();
                if (flipBackTimer.current) clearTimeout(flipBackTimer.current);
                setFlipped(false);
              } else {
                handleReplay();
              }
            }}
          >
            <div className="lesson-card lesson-card-front">
              <div className="lesson-card-grid">
                <div
                  className="big-letter"
                  key={`l-${index}-${isGuessing ? "g" : "r"}`}
                  style={{
                    color: item.color,
                    textShadow: `5px 7px 0 ${item.color}33, 0 2px 0 #ffffff66`,
                  }}
                >
                  {isGuessing ? "?" : display}
                </div>
                <div
                  className={`big-emoji ${isGuessing ? "guessing" : ""}`}
                  key={`e-${index}-${isGuessing ? "g" : "r"}`}
                >
                  {hasAnimalPhoto(item.word) ? (
                    <AnimalPhoto word={item.word} color={item.color} size={440} />
                  ) : (
                    <span>{item.emoji}</span>
                  )}
                  {isGuessing ? <span className="guess-mark">?</span> : null}
                </div>
              </div>
              {!isGuessing ? (
                <button
                  className="info-pip"
                  style={{ color: item.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const info = getAnimalInfo(item.word);
                    if (!info) {
                      speak(item.word);
                      return;
                    }
                    stop();
                    setFlipped(true);
                    if (flipBackTimer.current) clearTimeout(flipBackTimer.current);
                    // After speech, auto-flip back so the lesson resets cleanly.
                    speakBilingual(info.en, info.zh, () => {
                      flipBackTimer.current = setTimeout(() => setFlipped(false), 1400);
                    });
                  }}
                  aria-label="Show info"
                >
                  i
                </button>
              ) : null}
              {!isGuessing && hasAnimalVideo(item.word) ? (
                <button
                  className="video-pip"
                  style={{ color: item.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    stop();
                    setVideoOpen(true);
                  }}
                  aria-label="Play video"
                >
                  ▶
                </button>
              ) : null}
            </div>

            <div
              className="lesson-card lesson-card-back"
              style={{
                background: `linear-gradient(180deg, ${item.color}cc 0%, ${item.color}88 100%)`,
              }}
            >
              {(() => {
                const info = getAnimalInfo(item.word);
                if (!info) return null;
                return (
                  <div className="card-back-content">
                    <div className="card-back-word">
                      {item.letter} · {item.word}
                    </div>
                    <div className="card-back-en">{info.en}</div>
                    <div className="card-back-zh">{info.zh}</div>
                    {info.pinyin ? (
                      <div className="card-back-pinyin">{info.pinyin}</div>
                    ) : null}
                  </div>
                );
              })()}
              <button
                className="info-pip card-back-close"
                onClick={(e) => {
                  e.stopPropagation();
                  stop();
                  if (flipBackTimer.current) clearTimeout(flipBackTimer.current);
                  setFlipped(false);
                }}
                aria-label="Back to picture"
              >
                ↩
              </button>
            </div>
          </div>
        </div>
      </div>

      {videoOpen && hasAnimalVideo(item.word) ? (
        <div
          className="video-overlay"
          onClick={() => setVideoOpen(false)}
          role="dialog"
          aria-label={`${item.word} video`}
        >
          <div className="video-frame" onClick={(e) => e.stopPropagation()}>
            <button
              className="video-close"
              onClick={() => setVideoOpen(false)}
              aria-label="Close video"
            >
              ✕
            </button>
            <video
              className="video-player"
              src={getAnimalVideo(item.word)}
              autoPlay
              controls
              playsInline
            />
          </div>
        </div>
      ) : null}

      <footer className="lesson-footer">
        <div className="word-banner" key={`w-${index}-${isGuessing ? "g" : "r"}`}>
          {isGuessing ? "What is it?" : `${item.letter} for ${item.word}`}
        </div>
        <div className="nav-row">
          <button
            className="nav-btn"
            onClick={handlePrev}
            disabled={isFirst}
            aria-label="Previous"
          >
            ◀
          </button>
          <div
            className="dot-strip"
            style={{ ["--dot-count" as string]: TOTAL } as React.CSSProperties}
          >
            {LETTERS.map((it, i) => (
              <span
                key={it.letter}
                className={`dot ${i === index ? "active" : ""}`}
                style={{ backgroundColor: i <= index ? it.color : "rgba(255,255,255,0.38)" }}
              />
            ))}
          </div>
          <button
            className="nav-btn coral"
            onClick={handleNext}
            disabled={isLast}
            aria-label={isLast ? "Finish" : "Next"}
          >
            {isLast ? "★" : "▶"}
          </button>
        </div>
      </footer>
    </div>
  );
}
