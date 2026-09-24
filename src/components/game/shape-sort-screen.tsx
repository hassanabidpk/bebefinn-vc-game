"use client";

/**
 * Shape Sort — a sandy sorter board with one hole per shape, and the loose
 * shapes in a tray below. Drag a shape into its hole, or tap a shape and then
 * tap a hole. Wrong holes just send the shape swimming home: no fail states,
 * no timers, and every finished board is a celebration.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useFriendlySpeech } from "@/hooks/use-friendly-speech";
import { useGameAudio } from "@/hooks/use-game-audio";
import {
  buildShapeRound,
  findDropHole,
  getShapeNamePhrase,
  isCorrectDrop,
  SHAPE_SORT_PHRASES,
  SHAPE_SORT_PRAISE_PHRASE,
  SHAPE_SORT_PROMPT_PHRASE,
  SHAPE_SORT_RETRY_PHRASE,
  SHAPE_VIEW_BOX,
  toLocalDelta,
  type DropTarget,
  type LinearTransform,
  type ShapeDef,
  type ShapeId,
} from "@/lib/shape-sort-data";
import { BubbleBackground } from "./ocean-stage";
import { Confetti } from "./confetti";

/** Finger travel (screen px) before a press becomes a drag instead of a tap. */
const DRAG_START_PX = 8;
const PAUSE_AFTER_PRAISE_MS = 1600;
const CELEBRATION_FALLBACK_MS = 8000;

interface DragState {
  shape: ShapeDef;
  pointerId: number;
  startX: number;
  startY: number;
  /** Where the piece already sat (e.g. caught mid bounce-back) when pressed. */
  originX: number;
  originY: number;
  moved: boolean;
  frame: LinearTransform;
}

/** Product of every ancestor's CSS transform — the iPad frame's scale, and
 *  its 90° rotation on portrait phones. */
function getAncestorTransform(element: Element): LinearTransform {
  let matrix = new DOMMatrix();
  for (let node = element.parentElement; node; node = node.parentElement) {
    const transform = getComputedStyle(node).transform;
    if (transform && transform !== "none") matrix = new DOMMatrix(transform).multiply(matrix);
  }
  return matrix;
}

interface ShapeGlyphProps {
  shape: ShapeDef;
  className: string;
}

/** One shape outline — the same path draws the loose piece and its hole. */
function ShapeGlyph({ shape, className }: ShapeGlyphProps) {
  return (
    <svg className={className} viewBox={SHAPE_VIEW_BOX} aria-hidden="true" focusable="false">
      <path
        d={shape.path}
        fill={shape.color}
        stroke="#fff"
        strokeWidth={5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ShapeSortScreenProps {
  onHome: () => void;
}

export function ShapeSortScreen({ onHome }: ShapeSortScreenProps) {
  const [round, setRound] = useState(() => ({ number: 1, ...buildShapeRound(1) }));
  const [placed, setPlaced] = useState<ShapeId[]>([]);
  const [selectedId, setSelectedId] = useState<ShapeId | null>(null);
  const [wrongHoleId, setWrongHoleId] = useState<ShapeId | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const holeRefs = useRef(new Map<ShapeId, HTMLButtonElement>());
  const dragRef = useRef<DragState | null>(null);
  // A finished drag still fires a click on the piece; swallow that one click.
  const suppressClickRef = useRef<ShapeId | null>(null);
  // Bumped on every new round (and unmount) so stale speech callbacks die.
  const roundToken = useRef(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { speak, prefetch } = useFriendlySpeech();
  const { playCelebrate, playTap } = useGameAudio();

  useEffect(() => {
    for (const phrase of SHAPE_SORT_PHRASES) prefetch(phrase);
  }, [prefetch]);

  // New round: tell the child what to do — no reading required.
  useEffect(() => {
    const timer = setTimeout(() => speak(SHAPE_SORT_PROMPT_PHRASE), 300);
    return () => clearTimeout(timer);
  }, [round.number, speak]);

  useEffect(() => {
    return () => {
      roundToken.current += 1;
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
    };
  }, []);

  const advance = useCallback(() => {
    roundToken.current += 1;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setRound((current) => ({ number: current.number + 1, ...buildShapeRound(current.number + 1) }));
    setPlaced([]);
    setSelectedId(null);
    setWrongHoleId(null);
    setCelebrating(false);
  }, []);

  const celebrate = (lastShape: ShapeDef) => {
    const token = roundToken.current;
    setCelebrating(true);
    playCelebrate();

    const scheduleAdvance = (delay: number) => {
      if (token !== roundToken.current) return;
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(advance, delay);
    };

    // Name the last shape, then praise, and advance from real audio completion.
    speak(getShapeNamePhrase(lastShape), {
      onEnd: () => {
        if (token !== roundToken.current) return;
        speak(SHAPE_SORT_PRAISE_PHRASE, {
          onEnd: () => scheduleAdvance(PAUSE_AFTER_PRAISE_MS),
        });
      },
    });
    // A stalled speech engine must never trap the child on a finished board.
    scheduleAdvance(CELEBRATION_FALLBACK_MS);
  };

  const place = (shape: ShapeDef) => {
    const nextPlaced = [...placed, shape.id];
    setPlaced(nextPlaced);
    setSelectedId(null);
    if (nextPlaced.length >= round.holes.length) {
      celebrate(shape);
      return;
    }
    playTap();
    speak(getShapeNamePhrase(shape));
  };

  const tryAgain = (holeId: ShapeId) => {
    setWrongHoleId(holeId);
    speak(SHAPE_SORT_RETRY_PHRASE);
    if (wrongTimer.current) clearTimeout(wrongTimer.current);
    wrongTimer.current = setTimeout(() => setWrongHoleId(null), 550);
  };

  const onPieceClick = (shape: ShapeDef) => {
    if (suppressClickRef.current === shape.id) {
      suppressClickRef.current = null;
      return;
    }
    if (celebrating) return;
    setSelectedId(shape.id);
    speak(getShapeNamePhrase(shape));
  };

  const onHoleClick = (hole: ShapeDef) => {
    if (celebrating) return;
    const piece = round.pieces.find((candidate) => candidate.id === selectedId);
    // Nothing picked up (or the hole is already full): just name the hole.
    if (!piece || placed.includes(hole.id)) {
      speak(getShapeNamePhrase(hole));
      return;
    }
    if (isCorrectDrop(piece.id, hole.id)) place(piece);
    else tryAgain(hole.id);
  };

  const openHoles = (): DropTarget[] =>
    round.holes
      .filter((hole) => !placed.includes(hole.id))
      .flatMap((hole) => {
        const node = holeRefs.current.get(hole.id);
        return node ? [{ id: hole.id, rect: node.getBoundingClientRect() }] : [];
      });

  const startDrag = (shape: ShapeDef, event: React.PointerEvent<HTMLButtonElement>) => {
    suppressClickRef.current = null;
    if (celebrating || dragRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const piece = event.currentTarget;
    piece.setPointerCapture(event.pointerId);
    // Freeze a piece caught mid bounce-back right where it is.
    const transform = getComputedStyle(piece).transform;
    const current = transform && transform !== "none" ? new DOMMatrix(transform) : new DOMMatrix();
    piece.style.transition = "none";
    piece.style.transform = `translate(${current.e}px, ${current.f}px)`;
    dragRef.current = {
      shape,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: current.e,
      originY: current.f,
      moved: false,
      frame: getAncestorTransform(piece),
    };
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < DRAG_START_PX) return;
      drag.moved = true;
      setSelectedId(drag.shape.id);
      speak(getShapeNamePhrase(drag.shape));
    }
    const local = toLocalDelta(dx, dy, drag.frame);
    event.currentTarget.style.transform =
      `translate(${drag.originX + local.x}px, ${drag.originY + local.y}px)`;
  };

  const endDrag = (event: React.PointerEvent<HTMLButtonElement>, dropped: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const piece = event.currentTarget;
    const bounds = piece.getBoundingClientRect();
    // Glide home via the CSS transition (instant under reduced motion). A
    // correct drop unmounts the piece, so its return trip is never seen.
    piece.style.transition = "";
    piece.style.transform = "";
    if (!drag.moved) return; // a plain tap — onClick picks it up
    suppressClickRef.current = drag.shape.id;
    if (!dropped) return;
    const holeId = findDropHole(
      { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 },
      openHoles()
    );
    if (!holeId) return; // open water: just swim home, no words needed
    if (isCorrectDrop(drag.shape.id, holeId)) place(drag.shape);
    else tryAgain(holeId);
  };

  const next = () => {
    playTap();
    advance();
  };

  return (
    <div className={`shapes-screen ${celebrating ? "celebrating" : ""}`}>
      <BubbleBackground />

      <header className="lesson-header">
        <button className="icon-btn" onClick={onHome} aria-label="Back home">←</button>
        <div className="progress-pill">
          <div className="progress-pill-row">
            <span className="progress-letter">🔷 Shapes</span>
          </div>
        </div>
        <div />
        <button
          className="icon-btn"
          onClick={() => speak(SHAPE_SORT_PROMPT_PHRASE)}
          aria-label="Say it again"
          disabled={celebrating}
        >
          🔊
        </button>
      </header>

      <div className="shapes-body">
        <div
          className={`shapes-board ${selectedId && !celebrating ? "picking" : ""}`}
          role="group"
          aria-label="Shape holes"
        >
          {round.holes.map((hole) => {
            const filled = placed.includes(hole.id);
            return (
              <button
                key={`${round.number}-${hole.id}`}
                ref={(node) => {
                  if (node) holeRefs.current.set(hole.id, node);
                  else holeRefs.current.delete(hole.id);
                }}
                className={`shapes-hole ${filled ? "filled" : ""} ${
                  wrongHoleId === hole.id ? "try-again" : ""
                }`}
                onClick={() => onHoleClick(hole)}
                aria-label={filled ? `${hole.word}, sorted` : `${hole.word} hole`}
              >
                <ShapeGlyph shape={hole} className="shapes-hole-svg" />
                {filled ? <ShapeGlyph shape={hole} className="shapes-hole-piece" /> : null}
              </button>
            );
          })}
        </div>

        <div className="shapes-tray" role="group" aria-label="Shapes to sort">
          {celebrating ? (
            <button className="shapes-next-btn" onClick={next} aria-label="Next shapes">
              <svg className="shapes-next-icon" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                <path
                  d="M 36 24 L 76 50 L 36 76 Z"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth={12}
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            round.pieces.map((piece) => (
              <div key={`${round.number}-${piece.id}`} className="shapes-tray-slot">
                {placed.includes(piece.id) ? null : (
                  <button
                    className={`shapes-piece ${selectedId === piece.id ? "selected" : ""}`}
                    onClick={() => onPieceClick(piece)}
                    onPointerDown={(event) => startDrag(piece, event)}
                    onPointerMove={moveDrag}
                    onPointerUp={(event) => endDrag(event, true)}
                    onPointerCancel={(event) => endDrag(event, false)}
                    aria-label={piece.word}
                    aria-pressed={selectedId === piece.id}
                  >
                    <ShapeGlyph shape={piece} className="shapes-piece-svg" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {celebrating ? <Confetti key={`confetti-${round.number}`} /> : null}
    </div>
  );
}
