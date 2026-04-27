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
}

const animalMoods: Record<AnimalKind, AnimalMood> = {
  cat: {
    gradient: "radial-gradient(ellipse at 30% 20%, #ffd9a8 0%, #ff9a6c 45%, #f57c5b 100%)",
    glow: "rgba(255,168,108,0.55)",
    ring: "rgba(255,210,170,0.65)",
  },
  dog: {
    gradient: "radial-gradient(ellipse at 30% 20%, #fff3c4 0%, #f0c068 50%, #b88450 100%)",
    glow: "rgba(240,192,104,0.55)",
    ring: "rgba(255,236,180,0.65)",
  },
  lion: {
    gradient: "radial-gradient(ellipse at 30% 20%, #fff0bf 0%, #f5b841 45%, #c9742a 100%)",
    glow: "rgba(245,184,65,0.6)",
    ring: "rgba(255,224,150,0.7)",
  },
  zebra: {
    gradient: "radial-gradient(ellipse at 30% 20%, #f5f7fa 0%, #c9d4e0 50%, #6f7b8e 100%)",
    glow: "rgba(201,212,224,0.55)",
    ring: "rgba(245,247,250,0.7)",
  },
  elephant: {
    gradient: "radial-gradient(ellipse at 30% 20%, #e7e2d8 0%, #b6a98e 50%, #6f5d3f 100%)",
    glow: "rgba(182,169,142,0.55)",
    ring: "rgba(231,226,216,0.65)",
  },
  gorilla: {
    gradient: "radial-gradient(ellipse at 30% 20%, #c8d6c2 0%, #5e7a5b 45%, #2a3a2a 100%)",
    glow: "rgba(94,122,91,0.55)",
    ring: "rgba(200,214,194,0.6)",
  },
  fish: {
    gradient: "radial-gradient(ellipse at 30% 20%, #b8f2ff 0%, #4ec3e0 45%, #0e6a8c 100%)",
    glow: "rgba(78,195,224,0.6)",
    ring: "rgba(184,242,255,0.7)",
  },
  jellyfish: {
    gradient: "radial-gradient(ellipse at 30% 20%, #f6c8ff 0%, #b78cf2 50%, #5a3a8c 100%)",
    glow: "rgba(183,140,242,0.6)",
    ring: "rgba(246,200,255,0.7)",
  },
  turtle: {
    gradient: "radial-gradient(ellipse at 30% 20%, #c5f0d6 0%, #4fae7c 50%, #1f6a47 100%)",
    glow: "rgba(79,174,124,0.55)",
    ring: "rgba(197,240,214,0.7)",
  },
  whale: {
    gradient: "radial-gradient(ellipse at 30% 20%, #b6e0ff 0%, #3c8dbc 45%, #0c3b5e 100%)",
    glow: "rgba(60,141,188,0.6)",
    ring: "rgba(182,224,255,0.7)",
  },
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
    void video.play().catch(() => {
      // Autoplay can be blocked until first user interaction; ignore
    });
  }, [word]);

  if (!kind) return null;

  const mood = animalMoods[kind];

  return (
    <div
      className="relative h-full w-full"
      data-animal-stage={kind}
    >
      {/* Glow halo behind card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-2 -z-10 rounded-[2rem] blur-2xl"
        style={{ background: mood.glow }}
      />

      {/* Glassmorphic frame */}
      <div
        className="relative h-full w-full overflow-hidden rounded-[1.6rem] shadow-[0_18px_38px_rgba(14,82,116,0.32),inset_0_2px_8px_rgba(255,255,255,0.45)]"
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

        {/* Video — real animal */}
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
        >
          <source src={`/videos/${kind}.webm`} type="video/webm" />
          <source src={`/videos/${kind}.mp4`} type="video/mp4" />
        </video>

        {/* Top-edge gloss — glass highlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1/3 opacity-50"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.45) 0%, transparent 100%)",
          }}
        />

        {/* Bottom soft vignette for legibility */}
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
