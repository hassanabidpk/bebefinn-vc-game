"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildSpellingRound,
  spellingMaxLettersForStars,
  type BankTile,
  type SpellingRound,
} from "@/lib/spelling-data";
import { useFriendlySpeech } from "@/hooks/use-friendly-speech";
import { useGameAudio } from "@/hooks/use-game-audio";
import { getStandaloneLetterSpeech } from "@/lib/tts-phrases";
import { earnSticker } from "@/lib/progress-store";
import { BubbleBackground } from "./ocean-stage";
import { AnimalPhoto } from "./animal-photo";
import { Confetti } from "./confetti";

const HINT_DELAY_MS = 8000;
const CELEBRATION_FALLBACK_MS = 12000;

interface SpellingScreenProps {
  onHome: () => void;
}

export function SpellingScreen({ onHome }: SpellingScreenProps) {
  const [round, setRound] = useState<SpellingRound>(() =>
    buildSpellingRound(undefined, spellingMaxLettersForStars(0))
  );
  const [placed, setPlaced] = useState<number[]>([]);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [hintId, setHintId] = useState<number | null>(null);
  const [stars, setStars] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const roundRef = useRef(round);
  const placedRef = useRef(placed);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintOffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const narrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationId = useRef(0);

  const { speak, prefetch } = useFriendlySpeech();
  const { playAnimalSound, playCelebrate, playTap } = useGameAudio();
  const speakRef = useRef(speak);
  const prefetchRef = useRef(prefetch);
  roundRef.current = round;
  placedRef.current = placed;
  speakRef.current = speak;
  prefetchRef.current = prefetch;

  // Interactive spelling must respond instantly, even when cloud TTS is unavailable.
  const say = useCallback(
    (text: string, onEnd?: () => void) => {
      speakRef.current(text, { onEnd });
    },
    []
  );

  const nextSlot = placed.length;
  const complete = nextSlot >= round.letters.length;

  const scheduleHint = useCallback(() => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => {
      const currentRound = roundRef.current;
      const currentPlaced = placedRef.current;
      const slot = currentPlaced.length;
      if (slot < currentRound.letters.length) {
        const want = currentRound.letters[slot];
        const tile = currentRound.bank.find(
          (candidate) =>
            candidate.letter === want && !currentPlaced.includes(candidate.id)
        );
        if (tile) {
          setHintId(tile.id);
          say(`Can you find ${want}?`);
          if (hintOffTimer.current) clearTimeout(hintOffTimer.current);
          hintOffTimer.current = setTimeout(() => setHintId(null), 1400);
        }
      }
      scheduleHint();
    }, HINT_DELAY_MS);
  }, [say]);

  // New round: speak the prompt, prefetch, and start the idle-hint clock.
  useEffect(() => {
    const phrase = `Let's spell ${round.word.word}. Tap the letters in order.`;
    prefetchRef.current(phrase);
    const t = setTimeout(() => say(phrase), 250);
    scheduleHint();
    return () => {
      clearTimeout(t);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, [round.key, round.word.word, say, scheduleHint]);

  useEffect(() => {
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
      if (hintOffTimer.current) clearTimeout(hintOffTimer.current);
      if (narrationTimer.current) clearTimeout(narrationTimer.current);
      celebrationId.current += 1;
    };
  }, []);

  const advance = useCallback((completedStars: number) => {
    setCelebrating(false);
    setPlaced([]);
    setWrongId(null);
    setHintId(null);
    setRound((r) => buildSpellingRound(r, spellingMaxLettersForStars(completedStars)));
  }, []);

  const finish = useCallback(
    (letters: string[], word: string) => {
      const id = ++celebrationId.current;
      const completedStars = stars + 1;
      setCelebrating(true);
      setStars(completedStars);
      earnSticker("spellWords", word);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      playCelebrate();
      const chant = `${letters.join(". ")}. ${word}!`;

      const goNext = () => {
        if (id !== celebrationId.current) return;
        celebrationId.current += 1;
        if (advanceTimer.current) clearTimeout(advanceTimer.current);
        advance(completedStars);
      };

      // Advance from real audio completion, not a word-length estimate.
      narrationTimer.current = setTimeout(() => {
        say(chant, () => {
          if (id !== celebrationId.current) return;
          playAnimalSound(word.toLowerCase());
          narrationTimer.current = setTimeout(() => {
            say("Wonderful spelling!", () => {
              if (advanceTimer.current) clearTimeout(advanceTimer.current);
              advanceTimer.current = setTimeout(goNext, 650);
            });
          }, 300);
        });
      }, 250);

      // A failed browser/audio completion event must never trap the child.
      advanceTimer.current = setTimeout(goNext, CELEBRATION_FALLBACK_MS);
    },
    [stars, say, playAnimalSound, playCelebrate, advance]
  );

  const onTile = useCallback(
    (tile: BankTile) => {
      if (celebrating || placed.includes(tile.id)) return;
      const slot = placed.length;
      const want = round.letters[slot];
      if (tile.letter === want) {
        setHintId(null);
        const nextPlaced = [...placed, tile.id];
        setPlaced(nextPlaced);
        playTap();
        say(getStandaloneLetterSpeech(want));
        scheduleHint();
        if (nextPlaced.length >= round.letters.length) {
          finish(round.letters, round.word.word);
        }
      } else {
        setWrongId(tile.id);
        say("Almost! Try again.");
        if (wrongTimer.current) clearTimeout(wrongTimer.current);
        wrongTimer.current = setTimeout(() => setWrongId(null), 500);
      }
    },
    [celebrating, placed, round, say, playTap, scheduleHint, finish]
  );

  // Keyboard parity: a letter key acts as a tap on the first matching,
  // unplaced bank tile. Harmless for touch users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toUpperCase();
      if (k.length !== 1 || k < "A" || k > "Z") return;
      const tile = round.bank.find((t) => t.letter === k && !placed.includes(t.id));
      if (!tile) return;
      e.preventDefault();
      onTile(tile);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round.bank, placed, onTile]);

  const color = round.word.color;
  const overlay = `radial-gradient(circle at 50% 10%, ${color}55 0%, transparent 32%), linear-gradient(180deg, ${color}33 0%, #0495d9 48%, #005580 100%)`;

  return (
    <div
      className={`play-screen spelling-screen ${celebrating ? "celebrating" : ""}`}
      style={{ backgroundColor: `${color}22` }}
    >
      <div className="lesson-bg-overlay" style={{ background: overlay }} />
      <BubbleBackground />

      <header className="lesson-header">
        <button className="icon-btn" onClick={onHome} aria-label="Back home">←</button>
        <div className="progress-pill">
          <div className="progress-pill-row">
            <span className="progress-letter">🔤 Spell</span>
          </div>
        </div>
        <div />
        <div className={`score-pill ${celebrating ? "pop" : ""}`}>
          <span className="star">⭐</span>
          {stars}
        </div>
      </header>

      <div className="spelling-body">
        <div className="spelling-photo">
          <AnimalPhoto word={round.word.word} color={color} size={240} />
          <button
            className="prompt-speak spelling-replay"
            onClick={() => say(`Let's spell ${round.word.word}.`)}
            aria-label="Say the word again"
          >
            🔊
          </button>
        </div>

        <div className="spelling-slots" key={`slots-${round.key}`}>
          {round.slots.map((slot, i) => {
            if (slot.space) {
              return <div key={i} className="spelling-slot space" aria-hidden />;
            }
            const filled = slot.tapIndex < placed.length;
            const isNext = slot.tapIndex === placed.length && !complete;
            return (
              <div
                key={i}
                className={`spelling-slot ${filled ? "filled" : ""} ${isNext ? "next" : ""}`}
                style={filled ? { color } : undefined}
              >
                {filled ? slot.char : ""}
              </div>
            );
          })}
        </div>

        <div className="spelling-bank" key={`bank-${round.key}`}>
          {round.bank.map((tile) => {
            const used = placed.includes(tile.id);
            return (
              <button
                key={tile.id}
                className={`play-tile spelling-tile ${used ? "used" : ""} ${
                  wrongId === tile.id ? "wrong" : ""
                } ${hintId === tile.id ? "hint" : ""}`}
                onClick={() => onTile(tile)}
                disabled={used}
                aria-label={tile.letter}
              >
                {tile.letter}
              </button>
            );
          })}
        </div>
      </div>

      {celebrating ? (
        <>
          <Confetti key={`confetti-${round.key}`} />
          <div className="spelling-cheer" role="status">
            <span className="spelling-cheer-check">✓</span>
            <span className="spelling-cheer-text">{round.word.word}!</span>
            <span className="spelling-cheer-stars">🎉 ⭐ 🎉</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
