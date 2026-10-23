"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFriendlySpeech } from "@/hooks/use-friendly-speech";
import { useGameAudio } from "@/hooks/use-game-audio";
import {
  createMemoryBoard,
  flipMemoryCard,
  getMemoryMatchPairPhrase,
  getMemoryMatchPraise,
  hideMismatchedCards,
  isBoardCleared,
  themeForRound,
  type MemoryCard,
  type MemoryMatchBoard,
} from "@/lib/memory-match-data";
import { BubbleBackground } from "./ocean-stage";
import { AnimalPhoto } from "./animal-photo";
import { Confetti } from "./confetti";

const MISMATCH_HIDE_MS = 1400;
const PREVIEW_MS = 1800;
const NEXT_ROUND_PAUSE_MS = 1200;
const CELEBRATION_FALLBACK_MS = 9000;

interface MemoryMatchScreenProps {
  onHome: () => void;
}

export function MemoryMatchScreen({ onHome }: MemoryMatchScreenProps) {
  const [board, setBoard] = useState<MemoryMatchBoard>(() => createMemoryBoard(0));
  const [cleared, setCleared] = useState(false);
  const [previewing, setPreviewing] = useState(true);
  const [stars, setStars] = useState(0);
  const mismatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const narrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationId = useRef(0);
  const { speak, prefetch, stop } = useFriendlySpeech();
  const { playAnimalSound, playCelebrate, playNext, playTap } = useGameAudio();

  useEffect(() => {
    if (!previewing) return;
    const timer = setTimeout(() => setPreviewing(false), PREVIEW_MS);
    return () => clearTimeout(timer);
  }, [board.round, previewing]);

  // Warm the game voice for this board's animals so a match speaks instantly.
  useEffect(() => {
    for (const word of new Set(board.cards.map((card) => card.spokenWord))) {
      prefetch(getMemoryMatchPairPhrase(word));
    }
    prefetch(getMemoryMatchPraise(board.round));
  }, [board.cards, board.round, prefetch]);

  useEffect(() => {
    return () => {
      if (mismatchTimer.current) clearTimeout(mismatchTimer.current);
      if (narrationTimer.current) clearTimeout(narrationTimer.current);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      celebrationId.current += 1;
    };
  }, []);

  const goNext = useCallback(() => {
    celebrationId.current += 1;
    if (mismatchTimer.current) clearTimeout(mismatchTimer.current);
    if (narrationTimer.current) clearTimeout(narrationTimer.current);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    stop();
    setPreviewing(true);
    setCleared(false);
    setBoard((current) => createMemoryBoard(current.round + 1));
  }, [stop]);

  const finish = useCallback(
    (card: MemoryCard, round: number) => {
      const id = ++celebrationId.current;
      setCleared(true);
      setStars((count) => count + 1);

      // Name the last pair and let it call out, then cheer the whole board,
      // then roll into a bigger one — advance from real audio completion.
      speak(getMemoryMatchPairPhrase(card.spokenWord), {
        onEnd: () => {
          if (id !== celebrationId.current) return;
          playAnimalSound(card.word, () => {
            if (id !== celebrationId.current) return;
            narrationTimer.current = setTimeout(() => {
            playCelebrate();
            speak(getMemoryMatchPraise(round), {
              onEnd: () => {
                if (id !== celebrationId.current) return;
                if (advanceTimer.current) clearTimeout(advanceTimer.current);
                  advanceTimer.current = setTimeout(goNext, NEXT_ROUND_PAUSE_MS);
                },
              });
            }, 250);
          });
        },
      });

      // A stalled speech engine must never trap the child on a finished board.
      advanceTimer.current = setTimeout(goNext, CELEBRATION_FALLBACK_MS);
    },
    [goNext, playAnimalSound, playCelebrate, speak]
  );

  const onCard = useCallback(
    (card: MemoryCard) => {
      if (cleared || previewing) return;
      const { board: next, outcome } = flipMemoryCard(board, card.id);
      if (outcome === "ignored") return;
      setBoard(next);

      if (outcome === "flipped") {
        playTap();
        speak(getMemoryMatchPairPhrase(card.spokenWord));
        return;
      }
      if (outcome === "mismatched") {
        // No fail sound or penalty — the pair just turns back over for another look.
        playTap();
        if (mismatchTimer.current) clearTimeout(mismatchTimer.current);
        mismatchTimer.current = setTimeout(
          () => setBoard((current) => hideMismatchedCards(current)),
          MISMATCH_HIDE_MS
        );
        return;
      }

      playCelebrate();
      if (isBoardCleared(next)) {
        finish(card, next.round);
      } else {
        // Say the name, then the matched animal calls out its own sound.
        speak(getMemoryMatchPairPhrase(card.spokenWord), {
          onEnd: () => playAnimalSound(card.word),
        });
      }
    },
    [board, cleared, previewing, finish, playAnimalSound, playCelebrate, playTap, speak]
  );

  const pairCount = board.cards.length / 2;
  const pairsFound = board.matched.length / 2;
  const theme = themeForRound(board.round);

  return (
    <div className="match-screen">
      <BubbleBackground />

      <header className="lesson-header">
        <button className="icon-btn" onClick={onHome} aria-label="Back home">←</button>
        <div
          className="progress-pill match-progress"
          aria-label={`Round ${board.round + 1}: ${pairsFound} of ${pairCount} pairs found`}
        >
          <span className="match-round" aria-hidden="true">{board.round + 1}</span>
          {Array.from({ length: pairCount }, (_, index) => (
            <span
              key={index}
              className={`match-progress-dot ${index < pairsFound ? "match-progress-dot-found" : ""}`}
            />
          ))}
        </div>
        <button className="icon-btn" onClick={() => { stop(); setPreviewing(true); }} disabled={previewing || cleared || board.faceUp.length > 0} aria-label="Peek at the cards">👀</button>
        <div className={`score-pill ${cleared ? "pop" : ""}`}>
          <span className="star">⭐</span>
          {stars}
        </div>
      </header>

      <div className="match-board">
        {/* Keyed by round so a new deal never animates old cards flipping back. */}
        <div
          className="match-grid"
          data-cards={board.cards.length}
          data-theme={theme.id}
          key={`round-${board.round}`}
        >
          {board.cards.map((card) => {
            const matched = board.matched.includes(card.id);
            const up = previewing || matched || board.faceUp.includes(card.id);
            return (
              <button
                key={card.id}
                className={`match-card ${up ? "match-card-up" : ""} ${matched ? "match-card-matched" : ""}`}
                onClick={() => onCard(card)}
                disabled={previewing || cleared || matched || board.faceUp.includes(card.id) || board.faceUp.length === 2}
                aria-label={up ? `${card.word}${matched ? ", matched" : ""}` : `Hidden card ${card.id + 1}`}
              >
                <div className="match-card-inner">
                  <div className="match-card-back" aria-hidden="true">
                    <span className="match-card-shell">{theme.back}</span>
                  </div>
                  <div className="match-card-face" aria-hidden="true">
                    <AnimalPhoto word={card.word} color={card.color} size={240} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {cleared ? (
        <>
          <Confetti key={`confetti-${board.round}`} />
          <div className="match-cleared">
            <button
              className="match-next"
              onClick={() => {
                playNext();
                goNext();
              }}
              aria-label="Next round"
            >
              ➜
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
