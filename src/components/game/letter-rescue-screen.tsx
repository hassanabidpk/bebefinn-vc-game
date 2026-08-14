"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFriendlySpeech } from "@/hooks/use-friendly-speech";
import { useGameAudio } from "@/hooks/use-game-audio";
import {
  buildLetterRescueRound,
  getLetterRescueChallenge,
  getReadableRescueColor,
  type LetterRescueRound,
} from "@/lib/letter-rescue-data";
import {
  getRescuePromptPhrase,
  getRescueRetryPhrase,
  getRescueSuccessPhrase,
  RESCUE_COMPLETE_PHRASE,
} from "@/lib/game-speech";
import { earnSticker } from "@/lib/progress-store";
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
  const [misses, setMisses] = useState(0);
  const nonceRef = useRef(0);
  const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionHomeButtonRef = useRef<HTMLButtonElement | null>(null);
  const restartButtonRef = useRef<HTMLButtonElement | null>(null);
  const { speak, prefetch, stop } = useFriendlySpeech();
  const {
    playCelebrate,
    playRescuePrompt,
    playRescueRetry,
    playRescueSuccess,
  } = useGameAudio();

  // Keep the just-finished round's clue stable while its success narration
  // plays. The next difficulty begins only when the next round appears.
  const activeRoundIndex = Math.max(0, rescued.length - (feedback?.correct ? 1 : 0));
  const challenge = getLetterRescueChallenge(activeRoundIndex);
  const prompt = getRescuePromptPhrase(
    challenge,
    round.target.letter,
    round.target.spokenWord
  );
  const successPhrase = getRescueSuccessPhrase(
    round.target.letter,
    round.target.spokenWord
  );
  const challengeLabel =
    challenge === "match"
      ? "Letter Match"
      : challenge === "word"
        ? "Word Clue"
        : "Listening Challenge";

  const clearPromptTimer = useCallback(() => {
    if (!promptTimer.current) return;
    clearTimeout(promptTimer.current);
    promptTimer.current = null;
  }, []);

  const repeatNarration = useCallback(() => {
    clearPromptTimer();
    speak(feedback?.correct ? successPhrase : prompt);
  }, [clearPromptTimer, feedback?.correct, prompt, speak, successPhrase]);

  useEffect(() => {
    prefetch(prompt);
    prefetch(successPhrase);
    promptTimer.current = setTimeout(() => {
      playRescuePrompt();
      promptTimer.current = setTimeout(() => {
        promptTimer.current = null;
        speak(prompt);
      }, 240);
    }, 80);
    return () => {
      clearPromptTimer();
    };
  }, [clearPromptTimer, playRescuePrompt, prefetch, prompt, speak, successPhrase]);

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
    setMisses(0);
  }, []);

  const choose = useCallback(
    (index: number) => {
      if (feedback || reefComplete) return;
      clearPromptTimer();
      if (roundTimer.current) clearTimeout(roundTimer.current);
      const choice = round.options[index];
      const correct = choice.letter === round.target.letter;
      const nextFeedback = { index, correct, nonce: ++nonceRef.current };
      setFeedback(nextFeedback);

      if (!correct) {
        playRescueRetry();
        setMisses((count) => count + 1);
        roundTimer.current = setTimeout(() => {
          roundTimer.current = setTimeout(() => setFeedback(null), 900);
          speak(getRescueRetryPhrase(prompt));
        }, 200);
        return;
      }

      playRescueSuccess();
      earnSticker("rescueLetters", round.target.letter);
      const nextRescued = [...rescued, round.target];
      setRescued(nextRescued);

      let didAdvance = false;
      const advanceAfterNarration = () => {
        if (didAdvance) return;
        didAdvance = true;
        if (roundTimer.current) clearTimeout(roundTimer.current);
        roundTimer.current = setTimeout(() => {
          if (nextRescued.length < REEF_SIZE) {
            nextRound(nextRescued.map((rescue) => rescue.letter));
            return;
          }
          setReefComplete(true);
          playCelebrate();
          speak(RESCUE_COMPLETE_PHRASE);
        }, 360);
      };
      roundTimer.current = setTimeout(() => {
        roundTimer.current = setTimeout(advanceAfterNarration, 5200);
        speak(successPhrase, { onEnd: advanceAfterNarration });
      }, 330);
    }, [
      clearPromptTimer,
      feedback,
      nextRound,
      playCelebrate,
      playRescueRetry,
      playRescueSuccess,
      prompt,
      reefComplete,
      rescued,
      round,
      speak,
      successPhrase,
    ]
  );

  useEffect(() => {
    if (!reefComplete) return;
    restartButtonRef.current?.focus();
  }, [reefComplete]);

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
    setMisses(0);
    setRound((previous) => buildLetterRescueRound(previous.target.letter));
    setRoundKey((key) => key + 1);
  };

  return (
    <div className="letter-rescue-screen" data-challenge={challenge}>
      <LetterRescueStage options={round.options} roundKey={roundKey} feedback={feedback} />

      <header className="rescue-header">
        <button className="icon-btn" onClick={onHome} aria-label="Back home" disabled={reefComplete}>←</button>
        <div className="rescue-title-pill">
          <span>🫧</span>
          <span>
            <strong>Ocean Letter Rescue</strong>
            <small>{challengeLabel}</small>
          </span>
        </div>
        <button
          className="icon-btn"
          onClick={repeatNarration}
          aria-label={feedback?.correct ? "Repeat the answer" : "Repeat the clue"}
          disabled={reefComplete || Boolean(feedback?.correct)}
        >
          🔊
        </button>
      </header>

      <div className="rescue-prompt" aria-live="polite">
        {feedback?.correct ? (
          <>
            <span className="rescue-prompt-emoji">{round.target.emoji}</span>
            <span>
              <small>Letter rescued!</small>
              <strong style={{ color: getReadableRescueColor(round.target.color) }}>
                {round.target.letter} for {round.target.word}!
              </strong>
            </span>
          </>
        ) : feedback ? (
          <>
            <span className="rescue-prompt-emoji">👂</span>
            <span>
              <small>Almost!</small>
              <strong>Listen and try again</strong>
            </span>
          </>
        ) : challenge === "word" ? (
          <>
            <span className="rescue-prompt-emoji">{round.target.emoji}</span>
            <span>
              <small>Which letter goes with</small>
              <strong style={{ color: getReadableRescueColor(round.target.color) }}>
                {round.target.word}?
              </strong>
            </span>
          </>
        ) : challenge === "sound" ? (
          <>
            <span className="rescue-prompt-emoji">👂</span>
            <span>
              <small>Listen for</small>
              <strong>the hidden letter</strong>
            </span>
          </>
        ) : (
          <>
            <span>Find</span>
            <strong style={{ color: getReadableRescueColor(round.target.color) }}>
              {round.target.letter}
            </strong>
          </>
        )}
      </div>

      <div className="rescue-options" role="group" aria-label={prompt}>
        {round.options.map((option, index) => {
          const selected = feedback?.index === index;
          const showHint = misses >= 2 && !feedback && option.letter === round.target.letter;
          return (
            <button
              key={`${roundKey}-${option.letter}`}
              className={`rescue-letter-button ${
                selected ? (feedback?.correct ? "correct" : "try-again") : ""
              } ${showHint ? "hint" : ""}`}
              style={
                {
                  ["--letter-color" as string]: getReadableRescueColor(option.color),
                  ["--letter-glow" as string]: option.color,
                } as React.CSSProperties
              }
              onClick={() => choose(index)}
              aria-label={`Letter ${option.letter}`}
              disabled={reefComplete}
            >
              {selected && feedback?.correct ? "✓" : option.letter}
            </button>
          );
        })}
      </div>

      <div className="rescue-reef" aria-label={`${rescued.length} of ${REEF_SIZE} letters rescued`}>
        <span className="rescue-reef-label">My Reef</span>
        <span className="rescue-round-count">{rescued.length}/{REEF_SIZE}</span>
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
        <div
          className="rescue-complete"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rescue-complete-title"
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const first = completionHomeButtonRef.current;
            const last = restartButtonRef.current;
            if (!first || !last) return;
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }}
        >
          <div className="rescue-complete-card">
            <span className="rescue-complete-icon">🪸</span>
            <h2 id="rescue-complete-title">Your reef is glowing!</h2>
            <p>You rescued {REEF_SIZE} letters!</p>
            <div className="rescue-complete-letters">
              {rescued.map((rescue, index) => (
                <span key={`${rescue.letter}-${index}`} style={{ color: rescue.color }}>{rescue.letter}</span>
              ))}
            </div>
            <div className="rescue-complete-actions">
              <button ref={completionHomeButtonRef} className="secondary" onClick={onHome}>⌂ Home</button>
              <button ref={restartButtonRef} onClick={restart}>🫧 Rescue more</button>
            </div>
          </div>
          <Confetti />
        </div>
      ) : null}
    </div>
  );
}
