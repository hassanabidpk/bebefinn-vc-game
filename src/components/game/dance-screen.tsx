"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFriendlySpeech } from "@/hooks/use-friendly-speech";
import { useGameAudio } from "@/hooks/use-game-audio";
import { DANCE_SONGS } from "@/lib/dance-song";
import {
  buildDanceCues,
  cueAt,
  DANCE_MOVES,
  letterIndexAt,
  parseLyriaLyrics,
  type DanceMove,
} from "@/lib/dance-cues";
import { STICKER_ANIMALS, type StickerAnimal } from "@/lib/sticker-animals";
import { earnSticker, loadProgress } from "@/lib/progress-store";
import { DANCE_COMPLETE_PHRASE, getDancePartnerPhrase } from "@/lib/game-speech";
import { Confetti } from "./confetti";
import { DanceMascotStage } from "./dance-mascot-stage";
import { BubbleBackground } from "./ocean-stage";

type Status = "idle" | "playing" | "done" | "error";

const MOVE_BY_ID = Object.fromEntries(DANCE_MOVES.map((move) => [move.id, move]));
const KEY_TO_MOVE: Record<string, DanceMove> = { "1": "clap", "2": "jump", "3": "stomp", "4": "wiggle" };

/** Next animal friend the child hasn't collected yet, else any of them. */
function pickPartner(earned: readonly string[]): StickerAnimal {
  return (
    STICKER_ANIMALS.find((animal) => !earned.includes(animal.word)) ??
    STICKER_ANIMALS[Math.floor(Math.random() * STICKER_ANIMALS.length)]
  );
}

interface DanceScreenProps {
  onHome: () => void;
}

export function DanceScreen({ onHome }: DanceScreenProps) {
  const [songIndex, setSongIndex] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [cueIndex, setCueIndex] = useState(-1);
  const [letterIndex, setLetterIndex] = useState(-1);
  const [hitCue, setHitCue] = useState(-1);
  const [stars, setStars] = useState(0);
  const [mascotMove, setMascotMove] = useState<{ move: DanceMove; nonce: number } | null>(null);
  const [partner, setPartner] = useState<StickerAnimal | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cueIndexRef = useRef(-1);
  const hitCueRef = useRef(-1);
  const hitMovesRef = useRef(new Set<DanceMove>());
  const { speak, prefetch, stop } = useFriendlySpeech();
  const { playCelebrate, playRescueSuccess, playTap } = useGameAudio();
  const song = DANCE_SONGS[songIndex] ?? DANCE_SONGS[0];
  const cues = useMemo(
    () => buildDanceCues(parseLyriaLyrics(song.lyrics, song.durationSec)),
    [song]
  );

  // Partner depends on localStorage, so pick it after mount to keep SSR stable.
  useEffect(() => {
    const chosen = pickPartner(loadProgress().rideAnimals);
    setPartner(chosen);
    prefetch(DANCE_COMPLETE_PHRASE);
    prefetch(getDancePartnerPhrase(chosen.word));
  }, [prefetch]);

  useEffect(() => {
    const audio = new Audio(song.src);
    audio.preload = "auto";
    audioRef.current = audio;
    const onEnded = () => setStatus("done");
    const onError = () => setStatus("error");
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.load();
    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, [loadAttempt, song.src]);

  useEffect(() => stop, [stop]);

  // Sync cue + lit letter to the song. rAF gives smooth sweeps; timeupdate
  // keeps cues moving when a tab throttles animation frames.
  useEffect(() => {
    if (status !== "playing") return;
    const audio = audioRef.current;
    if (!audio) return;
    let frame = 0;
    const sync = () => {
      const t = audio.currentTime;
      const index = cueAt(cues, t);
      if (index !== cueIndexRef.current) {
        cueIndexRef.current = index;
        setCueIndex(index);
      }
      const lit = index >= 0 ? letterIndexAt(cues[index], t) : -1;
      setLetterIndex((previous) => (previous === lit ? previous : lit));
    };
    const tick = () => {
      sync();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    audio.addEventListener("timeupdate", sync);
    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener("timeupdate", sync);
    };
  }, [cues, status]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    playTap();
    cueIndexRef.current = -1;
    hitCueRef.current = -1;
    hitMovesRef.current = new Set();
    setCueIndex(-1);
    setLetterIndex(-1);
    setHitCue(-1);
    setStars(0);
    audio.currentTime = 0;
    audio
      .play()
      .then(() => setStatus("playing"))
      .catch(() => setStatus("error"));
  }, [playTap]);

  const retry = useCallback(() => {
    setStatus("idle");
    setLoadAttempt((attempt) => attempt + 1);
  }, []);

  const tapMove = useCallback(
    (move: DanceMove) => {
      if (status === "done") return;
      setMascotMove({ move, nonce: Date.now() });
      const index = cueIndexRef.current;
      const onCue = status === "playing" && index >= 0 && cues[index].move === move;
      if (onCue && hitCueRef.current !== index) {
        hitCueRef.current = index;
        hitMovesRef.current.add(move);
        setHitCue(index);
        setStars((count) => count + 1);
        playRescueSuccess();
        return;
      }
      playTap();
    },
    [cues, playRescueSuccess, playTap, status]
  );

  useEffect(() => {
    if (status !== "done") return;
    playCelebrate();
    for (const move of hitMovesRef.current) earnSticker("danceMoves", move);
    if (partner) earnSticker("rideAnimals", partner.word);
    speak(DANCE_COMPLETE_PHRASE, {
      onEnd: () => {
        if (partner) speak(getDancePartnerPhrase(partner.word));
      },
    });
  }, [partner, playCelebrate, speak, status]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const move = KEY_TO_MOVE[event.key];
      if (!move) return;
      event.preventDefault();
      tapMove(move);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tapMove]);

  const cue = cueIndex >= 0 ? cues[cueIndex] : null;
  const cueMove = cue ? MOVE_BY_ID[cue.move] : null;
  const chorus = Boolean(cue && cue.letters.length === 0);
  const demonstratedMove = status === "playing" && cue
    ? cue.move
    : mascotMove?.move ?? "idle";
  const motionGuide = demonstratedMove === "clap"
    ? "👏"
    : demonstratedMove === "jump"
      ? "⬆️"
      : demonstratedMove === "stomp"
        ? "👣"
        : demonstratedMove === "wiggle"
          ? "↔"
          : "";

  return (
    <div className="dance-screen">
      <BubbleBackground />

      <header className="dance-header">
        <button className="icon-btn" onClick={onHome} aria-label="Back home">←</button>
        <div className="progress-pill">
          <span className="progress-letter">🕺 ABC Dance Party</span>
        </div>
        <div className="score-pill" aria-label={`${stars} stars`}>
          <span className="star">⭐</span>
          {stars}
        </div>
      </header>

      <div className="dance-song-picker" aria-label="Choose a dance song">
        {DANCE_SONGS.map((option, optionIndex) => (
          <button
            key={option.id}
            className={optionIndex === songIndex ? "selected" : ""}
            onClick={() => {
              audioRef.current?.pause();
              if (audioRef.current) audioRef.current.currentTime = 0;
              cueIndexRef.current = -1;
              hitCueRef.current = -1;
              hitMovesRef.current = new Set();
              setCueIndex(-1);
              setLetterIndex(-1);
              setHitCue(-1);
              setStars(0);
              setStatus("idle");
              setSongIndex(optionIndex);
            }}
            aria-label={option.title}
            aria-pressed={optionIndex === songIndex}
          >
            <span>{option.emoji}</span>
            <small>{option.title}</small>
          </button>
        ))}
      </div>

      <div className="dance-stage">
        <div className="dance-cue" aria-live="polite">
          {cue && cue.letters.length ? (
            <div className="dance-letters">
              {cue.letters.map((letter, index) => (
                <span
                  key={`${cueIndex}-${letter}`}
                  className={`dance-letter ${index === letterIndex ? "lit" : index < letterIndex ? "sung" : ""}`}
                >
                  {letter}
                </span>
              ))}
            </div>
          ) : cue ? (
            <div className="dance-lyric">{cue.text}</div>
          ) : status === "playing" ? (
            <div className="dance-lyric">🎵 Get ready!</div>
          ) : null}
          {cueMove ? (
            <div className={`dance-cue-move ${hitCue === cueIndex ? "hit" : ""}`} key={cueIndex}>
              <span className="dance-cue-emoji">{cueMove.emoji}</span>
              <strong>{cueMove.label}!</strong>
              {hitCue === cueIndex ? <span className="dance-cue-star">⭐</span> : null}
            </div>
          ) : null}
        </div>

        <div className="dance-floor">
          <DanceMascotStage
            move={demonstratedMove}
            actionKey={`${cueIndex}-${mascotMove?.nonce ?? "song"}`}
            guide={motionGuide}
            onTap={() => tapMove("wiggle")}
          />
          {partner ? (
            <div
              className={`dance-partner ${chorus || status === "playing" ? "dancing" : ""} dancing-${demonstratedMove}`}
              style={{ borderColor: partner.color }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={partner.photo} alt="" draggable={false} />
              <span>{partner.word}</span>
            </div>
          ) : null}
        </div>

        {status === "idle" ? (
          <button className="dance-play-btn" onClick={play} aria-label={`Play ${song.title}`}>
            ▶
          </button>
        ) : null}

        {status === "error" ? (
          <div className="dance-error">
            <span>🎵</span>
            <button onClick={retry} aria-label="Try again">🔁</button>
          </div>
        ) : null}

        {status === "done" ? (
          <div className="dance-done">
            <Confetti />
            <div className="dance-done-card">
              {partner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={partner.photo} alt={partner.word} draggable={false} />
              ) : null}
              <strong>{DANCE_COMPLETE_PHRASE}</strong>
              <span className="dance-done-stars">⭐ {stars}</span>
              <div className="dance-done-actions">
                <button onClick={play} aria-label="Dance again">🔁</button>
                <button onClick={onHome} aria-label="Back home">🏠</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="dance-moves">
        {DANCE_MOVES.map((move) => {
          const isCued = status === "playing" && cue?.move === move.id;
          const isActive = mascotMove?.move === move.id;
          return (
            <button
              key={move.id}
              className={`dance-move-btn ${isCued ? "cued" : ""} ${isActive ? "active-move" : ""}`}
              onClick={() => tapMove(move.id)}
              disabled={status === "done"}
              aria-label={move.label}
            >
              <span className="dance-move-emoji">{move.emoji}</span>
              <span className="dance-move-label">{move.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
