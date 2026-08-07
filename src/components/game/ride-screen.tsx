"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RideEngine, type RideInput, type RideMode } from "@/lib/ride-engine";
import { RIDE_CONFIGS, type RideWorldId } from "@/lib/ride-data";
import { buildSafariWorld } from "@/lib/safari-world";
import { buildOceanWorld } from "@/lib/ocean-world";
import { getAnimalInfo } from "@/lib/animal-info";
import { useFriendlySpeech } from "@/hooks/use-friendly-speech";
import { useGameAudio } from "@/hooks/use-game-audio";
import { Confetti } from "./confetti";

const WORLD_BUILDERS = {
  safari: buildSafariWorld,
  ocean: buildOceanWorld,
} as const;

const KEY_TO_INPUT: Record<string, RideInput> = {
  ArrowUp: "forward",
  ArrowDown: "back",
  ArrowLeft: "left",
  ArrowRight: "right",
};

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

interface RideScreenProps {
  worldId: RideWorldId;
  onHome: () => void;
}

export function RideScreen({ worldId, onHome }: RideScreenProps) {
  const config = RIDE_CONFIGS[worldId];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RideEngine | null>(null);
  const [mode, setMode] = useState<RideMode>("auto");
  const [encounter, setEncounter] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [celebration, setCelebration] = useState(0);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const { speak, stop: stopSpeech } = useFriendlySpeech();
  const { playAnimalSound, playCelebrate, playTap } = useGameAudio();

  const later = useCallback((ms: number, fn: () => void) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      fn();
    }, ms);
    timersRef.current.add(timer);
  }, []);

  // Callbacks handed to the engine read fresh state through this ref.
  const meetAnimalRef = useRef<(word: string) => void>(() => {});
  meetAnimalRef.current = (word: string) => {
    const spec = config.animals.find((a) => a.word === word);
    if (!spec) return;
    setEncounter(word);

    // Sound first for instant feedback (matches Find-the-Animal), voice after.
    if (spec.soundKey) playAnimalSound(spec.soundKey);
    else playCelebrate();
    const fact = getAnimalInfo(word)?.en ?? "";
    later(450, () => speak(`Look! It's ${article(word)} ${word}! ${fact}`));

    setSeen((prev) => {
      if (prev.has(word)) return prev;
      const next = new Set(prev);
      next.add(word);
      if (next.size === config.animals.length) {
        // Saw everyone this lap — big cheer, then start counting again.
        later(3200, () => {
          setCelebration((c) => c + 1);
          playCelebrate();
          speak(`Amazing! You saw all the ${config.title === "Safari Ride" ? "safari" : "ocean"} animals!`);
          setSeen(new Set());
        });
      }
      return next;
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const engine = new RideEngine(container, WORLD_BUILDERS[worldId], {
      onEncounter: (word) => meetAnimalRef.current(word),
      onEncounterEnd: () => setEncounter(null),
    });
    engineRef.current = engine;

    const timers = timersRef.current;
    return () => {
      engineRef.current = null;
      engine.dispose();
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldId]);

  const switchMode = useCallback(
    (next: RideMode) => {
      engineRef.current?.setMode(next);
      setMode(next);
    },
    []
  );

  const pressArrow = useCallback(
    (input: RideInput, down: boolean) => {
      // Touching any arrow takes the wheel.
      if (down && engineRef.current?.getMode() === "auto") switchMode("drive");
      engineRef.current?.press(input, down);
    },
    [switchMode]
  );

  useEffect(() => {
    const onKey = (down: boolean) => (event: KeyboardEvent) => {
      const input = KEY_TO_INPUT[event.key];
      if (!input) return;
      event.preventDefault();
      pressArrow(input, down);
    };
    const keyDown = onKey(true);
    const keyUp = onKey(false);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, [pressArrow]);

  useEffect(() => stopSpeech, [stopSpeech]);

  const onModeButton = (next: RideMode) => {
    if (next === mode) return;
    playTap();
    switchMode(next);
    speak(next === "auto" ? "I will drive! Enjoy the ride!" : "You drive! Use the arrows!");
  };

  const encounterSpec = encounter
    ? config.animals.find((a) => a.word === encounter)
    : null;

  const arrow = (input: RideInput, label: string, symbol: string) => (
    <button
      className="ride-arrow"
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pressArrow(input, true);
      }}
      onPointerUp={() => pressArrow(input, false)}
      onPointerCancel={() => pressArrow(input, false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {symbol}
    </button>
  );

  return (
    <div className={`ride-screen ride-${worldId}`}>
      <div ref={containerRef} className="ride-canvas" />

      <header className="ride-header">
        <button className="icon-btn" onClick={onHome} aria-label="Back home">←</button>
        <div className="progress-pill">
          <div className="progress-pill-row">
            <span className="progress-letter">
              {config.titleEmoji} {config.title}
            </span>
            <span className="progress-count">
              {seen.size} / {config.animals.length} friends
            </span>
          </div>
        </div>
        <div />
        <div className="ride-mode-toggle" role="group" aria-label="Ride mode">
          <button
            className={`ride-mode-btn ${mode === "auto" ? "active" : ""}`}
            onClick={() => onModeButton("auto")}
            aria-pressed={mode === "auto"}
          >
            ✨ Auto
          </button>
          <button
            className={`ride-mode-btn ${mode === "drive" ? "active" : ""}`}
            onClick={() => onModeButton("drive")}
            aria-pressed={mode === "drive"}
          >
            🎮 Drive
          </button>
        </div>
      </header>

      {encounterSpec ? (
        <div className="ride-card" style={{ borderColor: encounterSpec.color }}>
          <span className="ride-card-emoji">{encounterSpec.emoji}</span>
          <span className="ride-card-word" style={{ color: encounterSpec.color }}>
            {encounterSpec.word}
          </span>
        </div>
      ) : null}

      <div className={`ride-controls ${mode === "drive" ? "" : "ride-controls-idle"}`}>
        <div className="ride-controls-row">{arrow("forward", "Drive forward", "▲")}</div>
        <div className="ride-controls-row">
          {arrow("left", "Slide left", "◀")}
          {arrow("back", "Drive backward", "▼")}
          {arrow("right", "Slide right", "▶")}
        </div>
      </div>

      {celebration ? <Confetti key={`ride-celebrate-${celebration}`} /> : null}
    </div>
  );
}
