"use client";

import { useEffect, useState } from "react";

const COLORS = ["#FF6B6B", "#FFD93D", "#54A0FF", "#6BCB77", "#FF9F43", "#8854D0"];

interface Piece {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

/** A short confetti burst for reveal celebrations. Random values are
 *  generated on mount to keep SSR / client markup identical. */
export function Confetti() {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    setPieces(
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 1.5,
        duration: 2 + Math.random() * 2,
        size: 8 + Math.random() * 12,
      }))
    );
  }, []);

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s both`,
          }}
        />
      ))}
    </>
  );
}
