"use client";

import { useEffect, useState } from "react";
import { countStickers, loadProgress } from "@/lib/progress-store";
import { Mascot } from "./mascot";
import { BubbleBackground, FloorWaves, Drifters } from "./ocean-stage";

interface HomeScreenProps {
  onStart: () => void;
  onStickers: () => void;
  onMode: (
    mode: "lesson" | "listen" | "play" | "notepad" | "spelling" | "rescue" | "dance"
  ) => void;
}

export function HomeScreen({ onStart, onMode, onStickers }: HomeScreenProps) {
  // Count loads after mount so the server render stays deterministic.
  const [stickerCount, setStickerCount] = useState(0);
  useEffect(() => {
    setStickerCount(countStickers(loadProgress()));
  }, []);

  return (
    <div className="home">
      <BubbleBackground />
      <FloorWaves />
      <Drifters />

      <button className="home-stickers-btn" onClick={onStickers} aria-label="Open my sticker book">
        ⭐
        {stickerCount > 0 ? <span className="home-stickers-count">{stickerCount}</span> : null}
      </button>

      <div className="home-title-block">
        <p className="home-eyebrow">ABC Ocean</p>
        <h1 className="home-title">Ocean Buddy</h1>
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
          <button className="home-chip" onClick={() => onMode("spelling")}>🔤 Spell</button>
          <button className="home-chip" onClick={() => onMode("notepad")}>📝 Notepad</button>
          <button className="home-chip home-chip-rescue" onClick={() => onMode("rescue")}>🫧 Rescue</button>
          <button className="home-chip home-chip-dance" onClick={() => onMode("dance")}>🕺 Dance</button>
        </div>
      </div>
    </div>
  );
}
