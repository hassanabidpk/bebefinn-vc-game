"use client";

import { useEffect, useState } from "react";

interface BubbleSpec {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

/** Background bubbles rising up the screen. Random values are seeded after
 *  mount so SSR / client markup stay identical (no hydration mismatch). */
export function BubbleBackground() {
  const [bubbles, setBubbles] = useState<BubbleSpec[]>([]);

  useEffect(() => {
    setBubbles(
      Array.from({ length: 15 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 8 + Math.random() * 24,
        duration: 6 + Math.random() * 10,
        delay: -Math.random() * 12,
        opacity: 0.15 + Math.random() * 0.25,
      }))
    );
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 1 }}
    >
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="bubble"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            opacity: b.opacity,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Wavy ocean floor SVG with seaweed / coral / shell. */
export function FloorWaves() {
  return (
    <div className="floor-waves" aria-hidden="true">
      <svg viewBox="0 0 1440 200" style={{ width: "100%", display: "block" }} preserveAspectRatio="none">
        <path d="M0 80 C360 20 720 140 1080 60 C1260 20 1380 60 1440 40 L1440 200 L0 200 Z" fill="#005580" opacity="0.5" />
        <path d="M0 120 C240 80 480 160 720 100 C960 40 1200 140 1440 80 L1440 200 L0 200 Z" fill="#00334d" opacity="0.7" />
      </svg>
      <span className="floor-emoji sway-l" style={{ left: "10%", bottom: 32 }}>🌿</span>
      <span className="floor-emoji sway-r" style={{ left: "30%", bottom: 16 }}>🪸</span>
      <span className="floor-emoji sway-l" style={{ right: "20%", bottom: 24 }}>🌊</span>
      <span className="floor-emoji bob-y"  style={{ right: "40%", bottom: 12, fontSize: 28 }}>🐚</span>
    </div>
  );
}

/** Drifting sea creatures in the home screen. */
export function Drifters() {
  return (
    <>
      <span className="creature" style={{ top: "15%", left: "8%", fontSize: 38, animation: "drift-a 6s ease-in-out infinite" }}>🐠</span>
      <span className="creature" style={{ top: "25%", right: "10%", fontSize: 32, animation: "drift-b 5s ease-in-out infinite" }}>🐡</span>
      <span className="creature" style={{ bottom: "30%", left: "5%", fontSize: 46, animation: "drift-c 8s ease-in-out infinite" }}>🐢</span>
      <span className="creature" style={{ top: "10%", right: "25%", fontSize: 24, animation: "drift-d 4s ease-in-out infinite" }}>⭐</span>
    </>
  );
}
