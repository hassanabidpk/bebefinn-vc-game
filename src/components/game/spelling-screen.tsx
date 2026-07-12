"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildSpellingRound, type BankTile, type SpellingRound } from "@/lib/spelling-data";
import { useSpeech } from "@/hooks/use-speech";
import { useGeminiTTS } from "@/hooks/use-gemini-tts";
import { useGameAudio } from "@/hooks/use-game-audio";
import { BubbleBackground } from "./ocean-stage";
import { AnimalPhoto } from "./animal-photo";
import { Confetti } from "./confetti";

const HINT_DELAY_MS = 8000;
const ADVANCE_MS = 3200;

interface SpellingScreenProps {
  onHome: () => void;
}

export function SpellingScreen({ onHome }: SpellingScreenProps) {
  const [round, setRound] = useState<SpellingRound>(() => buildSpellingRound());
  const [placed, setPlaced] = useState<number[]>([]);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [hintId, setHintId] = useState<number | null>(null);
  const [stars, setStars] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { speak } = useSpeech();
  const { play: geminiPlay, prefetch: geminiPrefetch } = useGeminiTTS();
  const { playAnimalSound, playCelebrate, playTap } = useGameAudio();

  // Gemini Leda voice with browser-TTS fallback, matching play-screen.tsx.
  const say = useCallback(
    (text: string) => {
      geminiPlay(text, { voice: "Leda" }).catch(() => speak(text));
    },
    [geminiPlay, speak]
  );

  const nextSlot = placed.length;
  const complete = nextSlot >= round.letters.length;

  const scheduleHint = useCallback(() => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => {
      setRound((r) => {
        setPlaced((p) => {
          const slot = p.length;
          if (slot < r.letters.length) {
            const want = r.letters[slot];
            const tile = r.bank.find((t) => t.letter === want && !p.includes(t.id));
            if (tile) {
              setHintId(tile.id);
              say(`Find the ${want}!`);
              setTimeout(() => setHintId(null), 1200);
            }
          }
          return p;
        });
        return r;
      });
      scheduleHint();
    }, HINT_DELAY_MS);
  }, [say]);

  // New round: speak the prompt, prefetch, and start the idle-hint clock.
  useEffect(() => {
    const phrase = `Spell ${round.word.word}!`;
    geminiPrefetch(phrase, "Leda");
    const t = setTimeout(() => say(phrase), 250);
    scheduleHint();
    return () => {
      clearTimeout(t);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.key]);

  useEffect(() => {
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
    };
  }, []);

  const advance = useCallback(() => {
    setCelebrating(false);
    setPlaced([]);
    setWrongId(null);
    setHintId(null);
    setRound((r) => buildSpellingRound(r));
  }, []);

  const finish = useCallback(
    (letters: string[], word: string) => {
      setCelebrating(true);
      setStars((s) => s + 1);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      // Instant reward fanfare, then spell it back, praise, and the animal
      // sound — a clear "you did it!" moment for the child.
      playCelebrate();
      const chant = `${letters.join("… ")}… ${word}!`;
      setTimeout(() => say(chant), 300);
      const afterChant = 300 + letters.length * 700;
      setTimeout(() => playAnimalSound(word.toLowerCase()), afterChant);
      setTimeout(() => say(`You did it! Great job!`), afterChant + 500);
      advanceTimer.current = setTimeout(advance, ADVANCE_MS + letters.length * 300);
    },
    [say, playAnimalSound, playCelebrate, advance]
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
        say(want);
        scheduleHint();
        if (nextPlaced.length >= round.letters.length) {
          finish(round.letters, round.word.word);
        }
      } else {
        setWrongId(tile.id);
        say("Try again!");
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
      const k = e.key.toUpperCase();
      if (k.length !== 1 || k < "A" || k > "Z") return;
      const tile = round.bank.find((t) => t.letter === k && !placed.includes(t.id));
      if (tile) onTile(tile);
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
            <span className="progress-letter">🔤 Spelling</span>
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
            onClick={() => say(`Spell ${round.word.word}!`)}
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
