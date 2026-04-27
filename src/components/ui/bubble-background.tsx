"use client";

import { useState, useEffect } from "react";

interface Bubble {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export function BubbleBackground() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    setBubbles(
      Array.from({ length: 15 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 8 + Math.random() * 24,
        duration: 6 + Math.random() * 10,
        delay: Math.random() * 8,
        opacity: 0.15 + Math.random() * 0.25,
      }))
    );
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${bubble.left}%`,
            width: bubble.size,
            height: bubble.size,
            opacity: bubble.opacity,
            animation: `bubble-rise ${bubble.duration}s linear ${bubble.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
