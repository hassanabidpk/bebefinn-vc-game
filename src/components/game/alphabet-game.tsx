"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { alphabetData } from "@/lib/alphabet-data";
import { BebeFinnCharacter } from "./bebefinn-character";
import { useSpeech } from "@/hooks/use-speech";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { useGameAudio } from "@/hooks/use-game-audio";
import { AnimalStage, getAnimalKind } from "./animal-stage";

interface AlphabetGameProps {
  isMusicPlaying: boolean;
  onBack: () => void;
  onToggleMusic: () => void;
}

export function AlphabetGame({
  isMusicPlaying,
  onBack,
  onToggleMusic,
}: AlphabetGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGuessing, setIsGuessing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { speak, stop, isSpeaking } = useSpeech();
  const {
    playAnimalSound,
    playCelebrate,
    playGuessSuspense,
    playLetterCall,
    playNext,
    playPrevious,
    playTap,
  } = useGameAudio();
  const hasSpokenRef = useRef(false);
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entry = alphabetData[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === alphabetData.length - 1;
  const animalKind = getAnimalKind(entry.word);
  const progressPercent = ((currentIndex + 1) / alphabetData.length) * 100;

  const speakCurrent = useCallback(() => {
    const item = alphabetData[currentIndex];
    const isNumberLesson = /^\d+$/.test(item.letter);
    playLetterCall(currentIndex);

    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
    }
    if (animalTimerRef.current) {
      clearTimeout(animalTimerRef.current);
    }

    speechTimerRef.current = setTimeout(() => {
      speak(
        isNumberLesson
          ? `${item.letter} for ${item.word}!`
          : `${item.letter}! ${item.letter} for ${item.word}!`
      );
    }, 280);

    animalTimerRef.current = setTimeout(() => {
      playAnimalSound(item.word);
    }, 1550);
  }, [currentIndex, playAnimalSound, playLetterCall, speak]);

  const revealCurrent = useCallback(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
    }
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
    }
    if (animalTimerRef.current) {
      clearTimeout(animalTimerRef.current);
    }

    setIsGuessing(true);
    playGuessSuspense(currentIndex);

    revealTimerRef.current = setTimeout(() => {
      setIsGuessing(false);
      speakCurrent();
    }, 860);
  }, [currentIndex, playGuessSuspense, speakCurrent]);

  // Speak the current letter on change (after first user interaction)
  useEffect(() => {
    if (hasSpokenRef.current) {
      revealCurrent();
    }
  }, [currentIndex, revealCurrent]);

  const handlePrev = useCallback(() => {
    hasSpokenRef.current = true;
    if (!isFirst) {
      playPrevious();
      setCurrentIndex((i) => i - 1);
    }
  }, [isFirst, playPrevious]);

  const handleNext = useCallback(() => {
    hasSpokenRef.current = true;
    if (isLast) {
      playCelebrate();
      setShowConfetti(true);
      speak("Yay! You learned all the letters! Great job!");
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
      }
      confettiTimerRef.current = setTimeout(() => setShowConfetti(false), 4000);
    } else {
      playNext();
      setCurrentIndex((i) => i + 1);
    }
  }, [isLast, playCelebrate, playNext, speak]);

  const handleBebeFinnTap = useCallback(() => {
    hasSpokenRef.current = true;
    playTap();
    revealCurrent();
  }, [playTap, revealCurrent]);

  const handleBack = useCallback(() => {
    playTap();
    stop();
    onBack();
  }, [onBack, playTap, stop]);

  const handleLessonShortcut = useCallback(
    (key: string) => {
      const normalizedKey = key === "0" ? "10" : key.toUpperCase();
      const lessonIndex = alphabetData.findIndex((item) => item.letter === normalizedKey);

      if (lessonIndex === -1) return;

      hasSpokenRef.current = true;
      playTap();

      if (lessonIndex === currentIndex) {
        revealCurrent();
        return;
      }

      setCurrentIndex(lessonIndex);
    },
    [currentIndex, playTap, revealCurrent]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey && !e.altKey && /^[a-z0-9]$/i.test(e.key)) {
        e.preventDefault();
        handleLessonShortcut(e.key);
        return;
      }

      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === " ") {
        e.preventDefault();
        handleBebeFinnTap();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBebeFinnTap, handleLessonShortcut, handleNext, handlePrev]);

  useEffect(() => {
    return () => {
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
      }
      if (animalTimerRef.current) {
        clearTimeout(animalTimerRef.current);
      }
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
      }
      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current);
      }
      stop();
    };
  }, [stop]);

  // Touch swipe support
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] transition-colors duration-500"
      style={{ backgroundColor: entry.color + "22" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <BubbleBackground />

      {/* Ocean gradient overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `radial-gradient(circle at 50% 10%, ${entry.color}55 0%, transparent 32%), linear-gradient(180deg, ${entry.color}33 0%, #0495d9 48%, #005580 100%)`,
        }}
      />
      <div className="absolute inset-x-0 bottom-0 z-0 h-40 bg-ocean-900/25" />
      <div className="absolute bottom-6 left-[8%] z-0 text-4xl opacity-80">🪸</div>
      <div className="absolute bottom-5 right-[9%] z-0 text-4xl opacity-80">🐚</div>
      <div className="absolute bottom-16 left-[22%] z-0 text-3xl opacity-70">⭐</div>

      {/* Confetti celebration */}
      {showConfetti && <Confetti />}

      {/* Content */}
      <div className="relative z-10 flex h-full w-full max-w-5xl flex-col gap-3">
        <header className="grid flex-shrink-0 grid-cols-[4rem_1fr_4rem_4rem] items-center gap-2 sm:grid-cols-[4.5rem_1fr_4.5rem_4.5rem] sm:gap-3">
          <motion.button
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/35 text-3xl font-bold text-white shadow-xl outline-none ring-2 ring-white/35 backdrop-blur-sm transition focus-visible:ring-sunny sm:h-16 sm:w-16"
            whileTap={{ scale: 0.86 }}
            onClick={handleBack}
            aria-label="Go back to home"
          >
            ←
          </motion.button>

          <div className="min-w-0 rounded-full bg-white/30 px-3 py-2 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-sm font-bold text-white drop-shadow-sm sm:text-base">
                {isGuessing ? "?" : entry.letter}
              </span>
              <span className="font-display text-sm font-bold text-white/90 sm:text-base">
                {currentIndex + 1}/{alphabetData.length}
              </span>
            </div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/35">
              <motion.div
                className="h-full rounded-full bg-sunny"
                animate={{ width: `${progressPercent}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
              />
            </div>
          </div>

          <motion.button
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/35 text-3xl shadow-xl outline-none ring-2 ring-white/35 backdrop-blur-sm transition focus-visible:ring-sunny sm:h-16 sm:w-16"
            whileTap={{ scale: 0.86 }}
            onClick={() => {
              playTap();
              onToggleMusic();
            }}
            aria-label={isMusicPlaying ? "Turn music off" : "Turn music on"}
          >
            {isMusicPlaying ? "♫" : "♪"}
          </motion.button>

          <motion.button
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/35 text-3xl shadow-xl outline-none ring-2 ring-white/35 backdrop-blur-sm transition focus-visible:ring-sunny sm:h-16 sm:w-16"
            whileTap={{ scale: 0.86 }}
            onClick={handleBebeFinnTap}
            aria-label={`Replay ${entry.letter} for ${entry.word}`}
          >
            🔊
          </motion.button>
        </header>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(13rem,0.8fr)_minmax(20rem,1.2fr)] sm:grid-rows-[1fr_auto]">
          <section className="relative flex items-center justify-center self-end sm:row-span-2 sm:self-center">
            <BebeFinnCharacter
              animation={isSpeaking ? "talking" : "idle"}
              size={132}
              onClick={handleBebeFinnTap}
            />
            <motion.div
              key={`${currentIndex}-${isGuessing ? "guess" : "reveal"}`}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-center font-display text-base font-bold shadow-xl sm:left-[64%] sm:top-[18%] sm:-translate-x-0"
              style={{ color: entry.color }}
              aria-live="polite"
            >
              {isGuessing ? "Guess!" : `${entry.letter} for ${entry.word}!`}
            </motion.div>
          </section>

          <section className="flex min-h-0 items-center justify-center">
            <motion.button
              className="grid aspect-[1.18] w-full max-w-[20rem] place-items-center overflow-hidden rounded-[2rem] bg-white/82 p-5 shadow-2xl outline-none ring-4 ring-white/45 backdrop-blur-md transition focus-visible:ring-sunny sm:max-w-[32rem]"
              whileTap={{ scale: 0.97 }}
              onClick={handleBebeFinnTap}
              aria-label={
                isGuessing
                  ? `Guess the picture for letter ${entry.letter}`
                  : `Tap the letter card for ${entry.letter} for ${entry.word}`
              }
            >
              <div className="grid h-full w-full grid-cols-[0.9fr_1.1fr] items-center gap-2">
                <motion.div
                  key={`letter-${currentIndex}-${isGuessing ? "guess" : "reveal"}`}
                  initial={{ scale: 0, rotate: -18 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200 }}
                  className="font-display font-bold leading-none"
                  style={{
                    fontSize: "clamp(6rem, 22vw, 13rem)",
                    color: entry.color,
                    textShadow: `5px 7px 0 ${entry.color}33`,
                  }}
                >
                  {isGuessing ? "?" : entry.letter}
                </motion.div>

                <motion.div
                  key={`visual-${currentIndex}`}
                  initial={{ scale: 0, y: 24 }}
                  animate={{
                    scale: 1,
                    y: 0,
                    transition: { type: "spring", damping: 8 },
                  }}
                  className="grid h-full min-h-[8rem] place-items-center text-[5rem] leading-none sm:min-h-[11rem] sm:text-[8rem]"
                  aria-hidden="true"
                >
                  {animalKind ? <AnimalStage word={entry.word} /> : entry.emoji}
                </motion.div>
              </div>
            </motion.button>
          </section>

          <section className="flex flex-col items-center gap-3 sm:col-start-2">
            <motion.p
              key={`word-${currentIndex}-${isGuessing ? "guess" : "reveal"}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-full rounded-full bg-white/28 px-6 py-2 text-center font-display text-2xl font-bold text-white shadow-lg drop-shadow-lg backdrop-blur-sm sm:text-4xl"
            >
              {isGuessing ? "What is it?" : `${entry.letter} for ${entry.word}`}
            </motion.p>

            <div className="grid w-full max-w-md grid-cols-[5rem_1fr_5rem] items-center gap-3">
              <motion.button
                className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-white/45 text-3xl font-bold text-white shadow-xl outline-none ring-2 ring-white/45 backdrop-blur-sm transition disabled:opacity-35 focus-visible:ring-sunny sm:h-20 sm:w-20"
                whileTap={{ scale: 0.86 }}
                onClick={handlePrev}
                disabled={isFirst}
                aria-label="Previous letter"
              >
                ◀
              </motion.button>

              <div
                className="grid w-full grid-cols-[repeat(13,minmax(0,1fr))] gap-1.5"
                aria-hidden="true"
              >
                {alphabetData.map((item, i) => (
                  <span
                    key={item.letter}
                    className="h-3 rounded-full shadow-sm sm:h-4"
                    style={{
                      backgroundColor:
                        i <= currentIndex ? item.color : "rgba(255,255,255,0.38)",
                      transform: i === currentIndex ? "scale(1.35)" : "scale(1)",
                    }}
                  />
                ))}
              </div>

              <motion.button
                className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-coral text-3xl font-bold text-white shadow-xl outline-none ring-2 ring-white/45 transition focus-visible:ring-sunny sm:h-20 sm:w-20"
                style={{ boxShadow: "0 8px 0 #E0475A, 0 14px 22px rgba(0,51,77,0.22)" }}
                whileTap={{ scale: 0.86 }}
                onClick={handleNext}
                aria-label={isLast ? "Celebrate" : "Next letter"}
              >
                {isLast ? "★" : "▶"}
              </motion.button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: ["#FF6B6B", "#FFD93D", "#54A0FF", "#6BCB77", "#FF9F43", "#8854D0"][
      i % 6
    ],
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    size: 8 + Math.random() * 12,
  }));

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s both`,
          }}
        />
      ))}
    </div>
  );
}
