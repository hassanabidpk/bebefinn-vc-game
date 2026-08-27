"use client";

/**
 * Draw with me — pick an animal, then follow along step by step.
 * The left panel animates the next stroke of the demo drawing; the right
 * panel is a free crayon canvas so the child can copy it. Tap-only, no
 * reading required, and every finish is a celebration.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { DRAW_ANIMALS, type DrawAnimal } from "@/lib/draw-animals";
import { useFriendlySpeech } from "@/hooks/use-friendly-speech";
import { Confetti } from "./confetti";
import { BubbleBackground } from "./ocean-stage";

const CRAYONS = [
  { name: "Red", hex: "#FF5A5F" },
  { name: "Orange", hex: "#FF9F43" },
  { name: "Yellow", hex: "#FFD93D" },
  { name: "Green", hex: "#6BCB77" },
  { name: "Blue", hex: "#4DA6FF" },
  { name: "Purple", hex: "#A66BFF" },
];

const CRAYON_WIDTH = 14;
const DEMO_STROKE_WIDTH = 10;

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface DrawDemoProps {
  animal: DrawAnimal;
  stepIndex: number;
  /** Bumped by the replay button to re-run the stroke animation. */
  nonce: number;
}

/** The "watch me" panel: earlier steps solid, the current step drawing in. */
function DrawDemo({ animal, stepIndex, nonce }: DrawDemoProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const done = animal.steps.slice(0, stepIndex).flatMap((step) => step.paths);
  const current = animal.steps[stepIndex]?.paths ?? [];

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>(".draw-demo-live"));
    const reduced = prefersReducedMotion();
    let delay = 0;
    for (const path of paths) {
      if (reduced) {
        path.style.strokeDashoffset = "0";
        continue;
      }
      // pathLength=1 keeps the dash maths simple; the real length only sets
      // the pace, so a long stroke takes longer to draw than a short one.
      const duration = Math.min(2.2, Math.max(0.5, (path.getTotalLength() || 320) / 320));
      path.style.transition = "none";
      path.style.strokeDashoffset = "1";
      void path.getBoundingClientRect(); // flush the reset before animating
      path.style.transition = `stroke-dashoffset ${duration}s ease-in-out ${delay}s`;
      path.style.strokeDashoffset = "0";
      delay += duration;
    }
  }, [animal, stepIndex, nonce]);

  return (
    <svg
      ref={svgRef}
      className="draw-demo"
      viewBox="0 0 512 512"
      role="img"
      aria-label={`How to draw a ${animal.word}`}
    >
      {done.map((d, i) => (
        <path
          key={`done-${i}`}
          d={d}
          fill="none"
          stroke={animal.color}
          strokeWidth={DEMO_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {current.map((d, i) => (
        <path
          key={`step-${stepIndex}-${i}-${nonce}`}
          className="draw-demo-live"
          d={d}
          fill="none"
          stroke={animal.color}
          strokeWidth={DEMO_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
        />
      ))}
    </svg>
  );
}

interface DrawScreenProps {
  onHome: () => void;
}

export function DrawScreen({ onHome }: DrawScreenProps) {
  const [animal, setAnimal] = useState<DrawAnimal | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [replayNonce, setReplayNonce] = useState(0);
  const [crayon, setCrayon] = useState(CRAYONS[0].hex);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);

  const { speak, stop } = useFriendlySpeech();
  useEffect(() => stop, [stop]);

  // Keep the backing store matched to the layout box (and the screen's
  // pixel density) so crayon strokes stay crisp instead of blurry.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width < 1 || box.height < 1) return;
      const dpr = window.devicePixelRatio || 1;
      const width = Math.round(box.width * dpr);
      const height = Math.round(box.height * dpr);
      if (canvas.width === width && canvas.height === height) return;

      // Carry the child's drawing across the resize.
      const snapshot = document.createElement("canvas");
      snapshot.width = canvas.width;
      snapshot.height = canvas.height;
      snapshot.getContext("2d")?.drawImage(canvas, 0, 0);

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.drawImage(snapshot, 0, 0, box.width, box.height);
      ctxRef.current = ctx;
    });

    observer.observe(wrap);
    return () => observer.disconnect();
  }, [animal]);

  // One line per step, spoken on arrival. Step 0 says the animal's name first.
  useEffect(() => {
    if (!animal) return;
    const line = animal.steps[stepIndex]?.say ?? "";
    if (stepIndex === 0) {
      speak(`${animal.word}!`, { onEnd: () => speak(line) });
      return;
    }
    speak(line);
  }, [animal, stepIndex, speak]);

  useEffect(() => {
    if (!finished || !animal) return;
    speak(`Wow! You drew a ${animal.word}! Great job!`);
  }, [finished, animal, speak]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }, []);

  const pickAnimal = (chosen: DrawAnimal) => {
    setAnimal(chosen);
    setStepIndex(0);
    setFinished(false);
    setReplayNonce(0);
  };

  const backToPicker = () => {
    stop();
    setAnimal(null);
    setFinished(false);
    setStepIndex(0);
  };

  const next = () => {
    if (!animal) return;
    if (stepIndex < animal.steps.length - 1) {
      setStepIndex((i) => i + 1);
      return;
    }
    setFinished(true);
  };

  const startStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    ctx.strokeStyle = crayon;
    ctx.lineWidth = CRAYON_WIDTH;
    ctx.beginPath();
    ctx.moveTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    // A tap with no movement should still leave a dot.
    ctx.lineTo(event.nativeEvent.offsetX + 0.01, event.nativeEvent.offsetY);
    ctx.stroke();
  };

  const moveStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = ctxRef.current;
    if (!drawingRef.current || !ctx) return;
    ctx.lineTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    ctx.stroke();
  };

  const endStroke = () => {
    drawingRef.current = false;
  };

  return (
    <div className="draw-screen">
      <BubbleBackground />

      <header className="draw-header">
        <button
          className="icon-btn"
          onClick={animal ? backToPicker : onHome}
          aria-label={animal ? "Back to animals" : "Back home"}
        >
          ←
        </button>
        <div className="progress-pill">
          <span className="progress-letter">🎨 Draw</span>
        </div>
        {animal ? (
          <div className="draw-step-dots" aria-label={`Step ${stepIndex + 1} of ${animal.steps.length}`}>
            {animal.steps.map((step, i) => (
              <span
                key={step.say + i}
                className={`draw-step-dot ${i < stepIndex || finished ? "done" : ""} ${
                  i === stepIndex && !finished ? "now" : ""
                }`}
                style={{ backgroundColor: i <= stepIndex || finished ? animal.color : undefined }}
              />
            ))}
          </div>
        ) : (
          <span className="draw-header-spacer" aria-hidden="true" />
        )}
      </header>

      {!animal ? (
        <div className="draw-picker">
          {DRAW_ANIMALS.map((entry) => (
            <button
              key={entry.word}
              className="draw-animal-card"
              style={{ borderColor: entry.color }}
              onClick={() => pickAnimal(entry)}
              aria-label={`Draw a ${entry.word}`}
            >
              <span className="draw-animal-emoji">{entry.emoji}</span>
              <span className="draw-animal-word" style={{ color: entry.color }}>
                {entry.word}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="draw-tutorial">
          <div className="draw-panels">
            <section className="draw-panel">
              <span className="draw-panel-tag">👀</span>
              <DrawDemo animal={animal} stepIndex={stepIndex} nonce={replayNonce} />
            </section>

            <section className="draw-panel">
              <span className="draw-panel-tag">✏️</span>
              <div className="draw-canvas-wrap" ref={wrapRef}>
                <canvas
                  ref={canvasRef}
                  className="draw-canvas"
                  aria-label="Your drawing"
                  onPointerDown={startStroke}
                  onPointerMove={moveStroke}
                  onPointerUp={endStroke}
                  onPointerCancel={endStroke}
                  onPointerLeave={endStroke}
                />
              </div>
              <div className="draw-crayons">
                {CRAYONS.map((c) => (
                  <button
                    key={c.hex}
                    className={`draw-crayon ${crayon === c.hex ? "picked" : ""}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => setCrayon(c.hex)}
                    aria-label={c.name}
                  />
                ))}
                <button className="draw-crayon draw-eraser" onClick={clearCanvas} aria-label="Clear my drawing">
                  🧽
                </button>
              </div>
            </section>
          </div>

          <div className="draw-controls">
            <button
              className="draw-ctrl-btn"
              onClick={() => setReplayNonce((n) => n + 1)}
              aria-label="Watch again"
            >
              🔁
            </button>
            <button className="draw-ctrl-btn draw-ctrl-next" onClick={next} aria-label="Next step">
              ➡️
            </button>
          </div>

          {finished ? (
            <div className="draw-done">
              <Confetti />
              <div className="draw-done-card">
                <span className="draw-done-emoji">{animal.emoji}</span>
                <strong style={{ color: animal.color }}>You drew a {animal.word}!</strong>
                <button className="draw-again-btn" onClick={backToPicker} aria-label="Draw another animal">
                  🎨 Draw another!
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
