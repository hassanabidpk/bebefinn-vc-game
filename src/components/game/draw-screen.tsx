"use client";

/**
 * Draw with me — pick an animal, then follow along step by step.
 * The left panel animates the next stroke of the demo drawing; the right
 * panel is a free crayon canvas so the child can copy it. Tap-only, no
 * reading required, and every finish is a celebration.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DRAW_ANIMALS,
  getDrawSteps,
  type DrawAnimal,
  type DrawLevel,
  type DrawStep,
} from "@/lib/draw-animals";
import {
  combineScore,
  starsForScore,
  getDrawPraisePhrase,
  getDrawWatchPhrase,
  getAnimalArticle,
  DRAW_YOUR_TURN_PHRASE,
  type DrawStars,
} from "@/lib/draw-score";
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
const DRAW_PICKER_ANIMALS = [...DRAW_ANIMALS].sort((left, right) =>
  left.word.localeCompare(right.word)
);

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface DrawDemoProps {
  animal: DrawAnimal;
  /** Steps for the chosen difficulty — Simple drops the detail passes. */
  steps: DrawStep[];
  stepIndex: number;
  /** Bumped by the replay button to re-run the stroke animation. */
  nonce: number;
  /** "step": earlier steps solid, current step animates in. "all": the whole
   *  animal draws itself start to finish (the pre-tutorial preview). */
  mode?: "step" | "all";
  /** Called once the animation has finished playing (mode "all" preview). */
  onDone?: () => void;
}

/** The "watch me" panel: earlier steps solid, the current step drawing in. */
function DrawDemo({ animal, steps, stepIndex, nonce, mode = "step", onDone }: DrawDemoProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const done = mode === "all" ? [] : steps.slice(0, stepIndex).flatMap((step) => step.paths);
  const current =
    mode === "all" ? steps.flatMap((step) => step.paths) : steps[stepIndex]?.paths ?? [];

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
    if (onDone) {
      const timer = setTimeout(onDone, reduced ? 600 : (delay + 0.5) * 1000);
      return () => clearTimeout(timer);
    }
  }, [animal, stepIndex, nonce, mode, onDone]);

  return (
    <svg
      ref={svgRef}
      className="draw-demo"
      viewBox="0 0 512 512"
      role="img"
      aria-label={`How to draw ${getAnimalArticle(animal.word)} ${animal.word}`}
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
  // "watch": the whole animal draws itself as a preview; "steps": the child
  // follows along step by step.
  const [phase, setPhase] = useState<"watch" | "steps">("watch");
  const [stepIndex, setStepIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [stars, setStars] = useState<DrawStars | null>(null);
  const [replayNonce, setReplayNonce] = useState(0);
  const [crayon, setCrayon] = useState(CRAYONS[0].hex);
  // Simple keeps the core shapes and the face; Medium adds every detail pass.
  const [level, setLevel] = useState<DrawLevel>("simple");

  const steps = animal ? getDrawSteps(animal, level) : [];

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
  }, [animal, phase]);

  // One line per step, spoken on arrival. The preview already announced the
  // animal, so each step just speaks its own instruction.
  useEffect(() => {
    if (!animal || phase !== "steps") return;
    const line = getDrawSteps(animal, level)[stepIndex]?.say ?? "";
    if (line) speak(line);
  }, [animal, level, phase, stepIndex, speak]);

  useEffect(() => {
    if (!finished || !animal || !stars) return;
    speak(getDrawPraisePhrase(stars, animal.word));
  }, [finished, animal, stars, speak]);

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
    setPhase("watch");
    setStepIndex(0);
    setFinished(false);
    setStars(null);
    setReplayNonce(0);
    speak(getDrawWatchPhrase(chosen.word));
  };

  const backToPicker = () => {
    stop();
    setAnimal(null);
    setPhase("watch");
    setFinished(false);
    setStars(null);
    setStepIndex(0);
  };

  // Keyboard: an animal's first letter picks it (shared letters like
  // Tiger/Turtle cycle on repeat presses); space advances the tutorial.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === " " || event.code === "Space") {
        // Stop the browser from also re-triggering a focused button.
        event.preventDefault();
        if (!animal || finished) return;
        if (phase === "watch") startSteps();
        else next();
        return;
      }

      const letter = event.key.toLowerCase();
      if (!/^[a-z]$/.test(letter)) return;
      const matches = DRAW_ANIMALS.filter(
        (entry) => entry.word[0].toLowerCase() === letter
      );
      if (!matches.length) return;
      const currentIndex = animal
        ? matches.findIndex((entry) => entry.word === animal.word)
        : -1;
      pickAnimal(matches[(currentIndex + 1) % matches.length]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // After the celebration has had its moment, return to the animal picker
  // so the child can choose the next one without hunting for a button.
  useEffect(() => {
    if (!finished) return;
    const timer = setTimeout(backToPicker, 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // Fires when the preview animation ends, or when the child taps the big
  // crayon button to skip ahead. The ref guards the timer/tap double-fire.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const startSteps = useCallback(() => {
    if (phaseRef.current !== "watch") return;
    setPhase("steps");
    setStepIndex(0);
    setReplayNonce((n) => n + 1);
    speak(DRAW_YOUR_TURN_PHRASE);
  }, [speak]);

  /**
   * Score the child's canvas against the demo outline. Two offscreen masks:
   * a thin one (the outline itself) checked against dilated ink for
   * coverage, and a fat tolerance band checked against raw ink for
   * precision. Both are drawn with the same scale/offset the ghost guide
   * SVG uses (preserveAspectRatio "meet"), so crayon and guide line up.
   */
  const measureStars = (target: DrawAnimal): DrawStars => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (w < 10 || h < 10) return 1;

    const scale = Math.min(w, h) / 512;
    const ox = (w - 512 * scale) / 2;
    const oy = (h - 512 * scale) / 2;
    // Score against the guide the child actually saw, not the fuller Medium one.
    const allPaths = getDrawSteps(target, level).flatMap((step) => step.paths);
    const tolerance = Math.max(10, Math.min(w, h) * 0.05);

    const make = () => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return c.getContext("2d");
    };

    const guideThin = make();
    const guideFat = make();
    if (!guideThin || !guideFat) return 1;
    for (const [ctx, lineWidth] of [
      [guideThin, DEMO_STROKE_WIDTH],
      [guideFat, (2 * tolerance) / scale],
    ] as const) {
      ctx.setTransform(scale, 0, 0, scale, ox, oy);
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000";
      for (const d of allPaths) ctx.stroke(new Path2D(d));
    }

    const ink = make();
    const inkFat = make();
    if (!ink || !inkFat) return 1;
    ink.drawImage(canvas, 0, 0, w, h);
    // Stamp the ink in a ring of offsets — a cheap dilation, so "covered"
    // means crayon within the tolerance of the outline point.
    for (let a = 0; a < 8; a += 1) {
      const angle = (a / 8) * Math.PI * 2;
      inkFat.drawImage(
        ink.canvas,
        Math.cos(angle) * tolerance * 0.7,
        Math.sin(angle) * tolerance * 0.7,
        w,
        h
      );
    }
    inkFat.drawImage(ink.canvas, 0, 0, w, h);

    const thinA = guideThin.getImageData(0, 0, w, h).data;
    const fatA = guideFat.getImageData(0, 0, w, h).data;
    const inkA = ink.getImageData(0, 0, w, h).data;
    const inkFatA = inkFat.getImageData(0, 0, w, h).data;

    let outline = 0;
    let covered = 0;
    let inkCount = 0;
    let near = 0;
    for (let y = 0; y < h; y += 3) {
      for (let x = 0; x < w; x += 3) {
        const i = (y * w + x) * 4 + 3;
        if (thinA[i] > 40) {
          outline += 1;
          if (inkFatA[i] > 20) covered += 1;
        }
        if (inkA[i] > 40) {
          inkCount += 1;
          if (fatA[i] > 40) near += 1;
        }
      }
    }
    const coverage = outline ? covered / outline : 0;
    const precision = inkCount ? near / inkCount : 0;
    return starsForScore(combineScore(coverage, precision));
  };

  const next = () => {
    if (!animal) return;
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
      return;
    }
    setStars(measureStars(animal));
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
          <div className="draw-step-dots" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
            {steps.map((step, i) => (
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
        <>
          <div className="draw-levels" role="group" aria-label="How hard should the drawing be?">
            <button
              className={`draw-level-btn ${level === "simple" ? "picked" : ""}`}
              onClick={() => setLevel("simple")}
              aria-pressed={level === "simple"}
              aria-label="Simple drawings"
            >
              <span aria-hidden="true">🙂</span> Simple
            </button>
            <button
              className={`draw-level-btn ${level === "medium" ? "picked" : ""}`}
              onClick={() => setLevel("medium")}
              aria-pressed={level === "medium"}
              aria-label="Medium drawings"
            >
              <span aria-hidden="true">🎨</span> Medium
            </button>
          </div>
          <div className="draw-picker">
            {DRAW_PICKER_ANIMALS.map((entry) => (
              <button
                key={entry.word}
                className="draw-animal-card"
                style={{ borderColor: entry.color }}
                onClick={() => pickAnimal(entry)}
                aria-label={`Draw ${getAnimalArticle(entry.word)} ${entry.word}`}
              >
                <span className="draw-animal-letter" aria-hidden="true">
                  {entry.word[0].toUpperCase()}
                </span>
                <span className="draw-animal-emoji">{entry.emoji}</span>
                <span className="draw-animal-word" style={{ color: entry.color }}>
                  {entry.word}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : phase === "watch" ? (
        <div className="draw-preview">
          <section className="draw-panel draw-preview-panel">
            <span className="draw-panel-tag">👀</span>
            <DrawDemo
              animal={animal}
              steps={steps}
              stepIndex={0}
              nonce={replayNonce}
              mode="all"
              onDone={startSteps}
            />
          </section>
          <button className="draw-your-turn-btn" onClick={startSteps} aria-label="Your turn — start drawing">
            ✏️
          </button>
        </div>
      ) : (
        <div className="draw-tutorial">
          <div className="draw-panels">
            <section className="draw-panel">
              <span className="draw-panel-tag">👀</span>
              <DrawDemo animal={animal} steps={steps} stepIndex={stepIndex} nonce={replayNonce} />
            </section>

            <section className="draw-panel">
              <span className="draw-panel-tag">✏️</span>
              <div className="draw-canvas-wrap" ref={wrapRef}>
                <svg className="draw-ghost" viewBox="0 0 512 512" aria-hidden="true">
                  {steps
                    .slice(0, stepIndex + 1)
                    .flatMap((step) => step.paths)
                    .map((d, i) => (
                      <path
                        key={i}
                        d={d}
                        fill="none"
                        stroke={animal.color}
                        strokeWidth={DEMO_STROKE_WIDTH}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                </svg>
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
                <strong style={{ color: animal.color }}>
                  You drew {getAnimalArticle(animal.word)} {animal.word}!
                </strong>
                <div className="draw-stars" role="img" aria-label={`${stars ?? 1} out of 3 stars`}>
                  {[1, 2, 3].map((n) => (
                    <span
                      key={n}
                      className={`draw-star ${stars && n <= stars ? "lit" : ""}`}
                      style={{ animationDelay: `${0.3 + n * 0.35}s` }}
                    >
                      ⭐
                    </span>
                  ))}
                </div>
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
