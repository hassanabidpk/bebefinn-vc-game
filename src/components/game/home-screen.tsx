"use client";

import { Mascot } from "./mascot";
import { BubbleBackground, FloorWaves, Drifters } from "./ocean-stage";

interface HomeScreenProps {
  onStart: () => void;
  onMode: (mode: "lesson" | "listen" | "play") => void;
}

export function HomeScreen({ onStart, onMode }: HomeScreenProps) {
  return (
    <div className="home">
      <BubbleBackground />
      <FloorWaves />
      <Drifters />

      <div className="home-title-block">
        <p className="home-eyebrow">ABC Ocean</p>
        <h1 className="home-title">BebeFinn</h1>
        <p className="home-subtitle">Alphabet Adventure!</p>
      </div>

      <div className="home-mascot">
        <div className="home-mascot-shadow" />
        <Mascot size={300} animation="idle" />
      </div>

      <div className="home-cta-block">
        <button className="start-btn" onClick={onStart} aria-label="Start alphabet adventure">
          <span className="play-pip">▶</span>
          Start
        </button>
        <div className="home-chips">
          <button className="home-chip" onClick={() => onMode("lesson")}>A-Z</button>
          <button className="home-chip" onClick={() => onMode("listen")}>Listen</button>
          <button className="home-chip" onClick={() => onMode("play")}>Play</button>
        </div>
      </div>
    </div>
  );
}
