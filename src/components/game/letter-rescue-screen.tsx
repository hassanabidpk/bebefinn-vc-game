"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFriendlySpeech } from "@/hooks/use-friendly-speech";
import { useGameAudio } from "@/hooks/use-game-audio";
import {
  buildLetterRescueRound,
  type LetterRescueRound,
} from "@/lib/letter-rescue-data";
import { Confetti } from "./confetti";
import {
  LetterRescueStage,
  type LetterRescueFeedback,
} from "./letter-rescue-stage";

const REEF_SIZE = 6;

interface LetterRescueScreenProps {
  onHome: () => void;
}

export function LetterRescueScreen({ onHome }: LetterRescueScreenProps) {
  const [round, setRound] = useState<LetterRescueRound>(() => buildLetterRescueRound());
  const [roundKey, setRoundKey] = useState(1);
  const [feedback, setFeedback] = useState<LetterRescueFeedback | null>(null);
  const [rescued, setRescued] = useState<LetterRescueRound["target"][]>([]);
  const [reefComplete, setReefComplete] = useState(false);
  const nonceRef = useRef(0);
  const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { speak, prefetch, stop } = useFriendlySpeech();
  const { playCelebrate, playTap } = useGameAudio();

  const prompt = `Find the letter ${round.target.letter}!`;

  useEffect(() => {
    prefetch(prompt);
    promptTimer.current = setTimeout(() => {
      promptTimer.current = null;
      speak(prompt);
    }, 320);
    return () => {
      if (promptTimer.current) clearTimeout(promptTimer.current);
    };
  }, [prefetch, prompt, speak]);

  useEffect(() => {
    return () => {
      if (roundTimer.current) clearTimeout(roundTimer.current);
      stop();
    };
  }, [stop]);

  const nextRound = useCallback((alreadyRescued: readonly string[] = []) => {
    setRound((previous) =>
      buildLetterRescueRound(previous.target.letter, Math.random, alreadyRescued)
    );
    setRoundKey((key) => key + 1);
    setFeedback(null);
  }, []);

  const choose = useCallback(
    (index: number) => {
      if (feedback || reefComplete) return;
      if (promptTimer.current) {
        clearTimeout(promptTimer.current);
        promptTimer.current = null;
      }
      const choice = round.options[index];
      const correct = choice.letter === round.target.letter;
      const nextFeedback = { index, correct, nonce: ++nonceRef.current };
      setFeedback(nextFeedback);

      if (!correct) {
        playTap();
        speak(`${choice.letter}. Listen again. Find ${round.target.letter}!`);
        roundTimer.current = setTimeout(() => setFeedback(null), 720);
        return;
      }

      playCelebrate();
      speak(`${choice.letter}! You rescued ${choice.letter} for ${choice.word}!`);
      const nextRescued = [...rescued, round.target];
      setRescued(nextRescued);

      if (nextRescued.length >= REEF_SIZE) {
        roundTimer.current = setTimeout(() => {
          setReefComplete(true);
          playCelebrate();
          speak("Amazing! Your letter reef is complete!");
        }, 1500);
      } else {
        roundTimer.current = setTimeout(
          () => nextRound(nextRescued.map((rescue) => rescue.letter)),
          1750
        );
      }
    }, [feedback, nextRound, playCelebrate, playTap, reefComplete, rescued, round, speak]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || feedback || reefComplete) return;
      const letter = event.key.toUpperCase();
      if (!/^[A-Z]$/.test(letter)) return;
      const index = round.options.findIndex((option) => option.letter === letter);
      if (index < 0) return;
      event.preventDefault();
      choose(index);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, feedback, reefComplete, round.options]);

  const restart = () => {
    if (roundTimer.current) clearTimeout(roundTimer.current);
    setRescued([]);
    setReefComplete(false);
    setFeedback(null);
    setRound((previous) => buildLetterRescueRound(previous.target.letter));
    setRoundKey((key) => key + 1);
  };

  return (
    <div className="letter-rescue-screen">
      <LetterRescueStage options={round.options} roundKey={roundKey} feedback={feedback} />

      <header className="rescue-header">
        <button className="icon-btn" onClick={onHome} aria-label="Back home">←</button>
        <div className="rescue-title-pill">
          <span>🫧</span>
          <span>
            <strong>Ocean Letter Rescue</strong>
            <small>Build your letter reef</small>
          </span>
        </div>
        <button className="icon-btn" onClick={() => speak(prompt)} aria-label="Repeat the letter">🔊</button>
      </header>

      <div className="rescue-prompt" aria-live="polite">
        {feedback?.correct ? (
          <>
            <span className="rescue-prompt-emoji">{round.target.emoji}</span>
            <span>
              <small>Letter rescued!</small>
              <strong style={{ color: round.target.color }}>
                {round.target.letter} is for {round.target.word}
              </strong>
            </span>
          </>
        ) : (
          <>
            <span>Find</span>
            <strong style={{ color: round.target.color }}>{round.target.letter}</strong>
          </>
        )}
      </div>

      <div className="rescue-options" role="group" aria-label={prompt}>
        {round.options.map((option, index) => {
          const selected = feedback?.index === index;
          return (
            <button
              key={`${roundKey}-${option.letter}`}
              className={`rescue-letter-button ${selected ? (feedback.correct ? "correct" : "try-again") : ""}`}
              style={{ ["--letter-color" as string]: option.color } as React.CSSProperties}
              onClick={() => choose(index)}
              aria-label={`Letter ${option.letter}`}
            >
              {selected && feedback.correct ? "✓" : option.letter}
            </button>
          );
        })}
      </div>

      <div className="rescue-reef" aria-label={`${rescued.length} of ${REEF_SIZE} letters rescued`}>
        <span className="rescue-reef-label">My Reef</span>
        {Array.from({ length: REEF_SIZE }, (_, index) => {
          const rescue = rescued[index];
          return (
            <span
              key={index}
              className={`rescue-pearl ${rescue ? "filled" : ""}`}
              style={rescue ? { borderColor: rescue.color, color: rescue.color } : undefined}
            >
              {rescue ? rescue.letter : "•"}
            </span>
          );
        })}
      </div>

      {reefComplete ? (
        <div className="rescue-complete" role="dialog" aria-label="Letter reef complete">
          <div className="rescue-complete-card">
            <span className="rescue-complete-icon">🪸</span>
            <h2>Your reef is glowing!</h2>
            <p>You rescued {REEF_SIZE} letters!</p>
            <div className="rescue-complete-letters">
              {rescued.map((rescue, index) => (
                <span key={`${rescue.letter}-${index}`} style={{ color: rescue.color }}>{rescue.letter}</span>
              ))}
            </div>
            <button onClick={restart}>🫧 Rescue more letters</button>
          </div>
          <Confetti />
        </div>
      ) : null}
    </div>
  );
}
