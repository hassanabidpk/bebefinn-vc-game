"use client";

import { useEffect, useRef } from "react";

type AnimalKind =
  | "cat"
  | "dog"
  | "elephant"
  | "fish"
  | "gorilla"
  | "jellyfish"
  | "lion"
  | "turtle"
  | "whale"
  | "zebra";

interface AnimalStageProps {
  word: string;
}

const animalWords: Record<string, AnimalKind> = {
  cat: "cat",
  dog: "dog",
  elephant: "elephant",
  fish: "fish",
  gorilla: "gorilla",
  jellyfish: "jellyfish",
  lion: "lion",
  turtle: "turtle",
  whale: "whale",
  zebra: "zebra",
};

interface AnimalMood {
  gradient: string;
  glow: string;
  ring: string;
  /** CSS filter applied to the video — cinematic per-animal grading */
  filter: string;
  /** Tint color used for sparkle particles */
  sparkle: string;
}

const animalMoods: Record<AnimalKind, AnimalMood> = {
  cat: {
    gradient: "radial-gradient(ellipse at 30% 20%, #ffd9a8 0%, #ff9a6c 45%, #f57c5b 100%)",
    glow: "rgba(255,168,108,0.55)",
    ring: "rgba(255,210,170,0.65)",
    filter: "saturate(1.18) contrast(1.08) brightness(1.04)",
    sparkle: "#ffd9a8",
  },
  dog: {
    gradient: "radial-gradient(ellipse at 30% 20%, #fff3c4 0%, #f0c068 50%, #b88450 100%)",
    glow: "rgba(240,192,104,0.55)",
    ring: "rgba(255,236,180,0.65)",
    filter: "saturate(1.2) contrast(1.08) brightness(1.05)",
    sparkle: "#fff3c4",
  },
  lion: {
    gradient: "radial-gradient(ellipse at 30% 20%, #fff0bf 0%, #f5b841 45%, #c9742a 100%)",
    glow: "rgba(245,184,65,0.6)",
    ring: "rgba(255,224,150,0.7)",
    filter: "saturate(1.22) contrast(1.12) brightness(1.04)",
    sparkle: "#ffe28a",
  },
  zebra: {
    gradient: "radial-gradient(ellipse at 30% 20%, #f5f7fa 0%, #c9d4e0 50%, #6f7b8e 100%)",
    glow: "rgba(201,212,224,0.55)",
    ring: "rgba(245,247,250,0.7)",
    filter: "saturate(1.05) contrast(1.18) brightness(1.04)",
    sparkle: "#ffffff",
  },
  elephant: {
    gradient: "radial-gradient(ellipse at 30% 20%, #e7e2d8 0%, #b6a98e 50%, #6f5d3f 100%)",
    glow: "rgba(182,169,142,0.55)",
    ring: "rgba(231,226,216,0.65)",
    filter: "saturate(1.1) contrast(1.1) brightness(1.05)",
    sparkle: "#fff3d6",
  },
  gorilla: {
    gradient: "radial-gradient(ellipse at 30% 20%, #c8d6c2 0%, #5e7a5b 45%, #2a3a2a 100%)",
    glow: "rgba(94,122,91,0.55)",
    ring: "rgba(200,214,194,0.6)",
    filter: "saturate(1.18) contrast(1.1) brightness(1.06)",
    sparkle: "#d6efc4",
  },
  fish: {
    gradient: "radial-gradient(ellipse at 30% 20%, #b8f2ff 0%, #4ec3e0 45%, #0e6a8c 100%)",
    glow: "rgba(78,195,224,0.6)",
    ring: "rgba(184,242,255,0.7)",
    filter: "saturate(1.3) contrast(1.05) brightness(1.06) hue-rotate(-4deg)",
    sparkle: "#e3faff",
  },
  jellyfish: {
    gradient: "radial-gradient(ellipse at 30% 20%, #f6c8ff 0%, #b78cf2 50%, #5a3a8c 100%)",
    glow: "rgba(183,140,242,0.6)",
    ring: "rgba(246,200,255,0.7)",
    filter: "saturate(1.4) contrast(1.05) brightness(1.06) hue-rotate(8deg)",
    sparkle: "#f6c8ff",
  },
  turtle: {
    gradient: "radial-gradient(ellipse at 30% 20%, #c5f0d6 0%, #4fae7c 50%, #1f6a47 100%)",
    glow: "rgba(79,174,124,0.55)",
    ring: "rgba(197,240,214,0.7)",
    filter: "saturate(1.2) contrast(1.08) brightness(1.05)",
    sparkle: "#dcffe5",
  },
  whale: {
    gradient: "radial-gradient(ellipse at 30% 20%, #b6e0ff 0%, #3c8dbc 45%, #0c3b5e 100%)",
    glow: "rgba(60,141,188,0.6)",
    ring: "rgba(182,224,255,0.7)",
    filter: "saturate(1.22) contrast(1.08) brightness(1.05)",
    sparkle: "#dff6ff",
  },
};

// Each animal gets its own slow Ken Burns drift so the loop feels alive
const animalKenBurns: Record<AnimalKind, string> = {
  cat: "kenburns-zoom-right",
  dog: "kenburns-zoom-left",
  lion: "kenburns-zoom-in",
  zebra: "kenburns-zoom-right",
  elephant: "kenburns-zoom-left",
  gorilla: "kenburns-zoom-in",
  fish: "kenburns-pan-right",
  jellyfish: "kenburns-zoom-out",
  turtle: "kenburns-zoom-in",
  whale: "kenburns-pan-left",
};

export function getAnimalKind(word: string) {
  return animalWords[word.toLowerCase()] ?? null;
}

export function AnimalStage({ word }: AnimalStageProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const kind = getAnimalKind(word);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }, [word]);

  if (!kind) return null;

  const mood = animalMoods[kind];
  const kenBurns = animalKenBurns[kind];

  return (
    <div className="relative h-full w-full" data-animal-stage={kind}>
      {/* Glow halo behind card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-2 -z-10 rounded-[2rem] blur-2xl"
        style={{ background: mood.glow }}
      />

      {/* Glassmorphic frame */}
      <div
        className="relative h-full w-full overflow-hidden rounded-[1.6rem]"
        style={{
          background: mood.gradient,
          boxShadow: `0 18px 38px rgba(14,82,116,0.32), inset 0 0 0 2px ${mood.ring}, inset 0 4px 12px rgba(255,255,255,0.5)`,
        }}
      >
        {/* Mood backdrop subtle moving sheen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 mix-blend-soft-light"
          style={{
            background:
              "radial-gradient(circle at 70% 80%, rgba(255,255,255,0.55) 0%, transparent 55%)",
          }}
        />

        {/* Video — Ken Burns drift wrapper for slow cinematic motion */}
        <div
          className="absolute inset-0 h-full w-full"
          style={{ animation: `${kenBurns} 14s ease-in-out infinite alternate` }}
        >
          <video
            ref={videoRef}
            key={kind}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            style={{ filter: mood.filter }}
          >
            <source src={`/videos/${kind}.webm`} type="video/webm" />
            <source src={`/videos/${kind}.mp4`} type="video/mp4" />
          </video>
        </div>

        {/* Sparkle particles — float up from bottom, tinted to mood */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {SPARKLE_OFFSETS.map((p, i) => (
            <span
              key={i}
              className="absolute block rounded-full opacity-0"
              style={{
                left: `${p.x}%`,
                bottom: 0,
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: `radial-gradient(circle, ${mood.sparkle} 0%, transparent 70%)`,
                animation: `sparkle-float ${p.dur}s ease-in ${p.delay}s infinite`,
                filter: "blur(0.5px)",
              }}
            />
          ))}
        </div>

        {/* Top-edge gloss */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1/3 opacity-50"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.45) 0%, transparent 100%)",
          }}
        />

        {/* Bottom soft vignette */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.18) 0%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}

const SPARKLE_OFFSETS = [
  { x: 12, size: 8, dur: 6, delay: 0 },
  { x: 28, size: 5, dur: 5.2, delay: 1.4 },
  { x: 47, size: 9, dur: 6.4, delay: 2.6 },
  { x: 64, size: 6, dur: 5.6, delay: 0.8 },
  { x: 78, size: 7, dur: 5.8, delay: 3.2 },
  { x: 90, size: 5, dur: 5.0, delay: 1.9 },
] as const;
