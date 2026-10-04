"use client";

/**
 * Coloring Book — pick an ocean picture, tap a crayon, then tap any part of
 * the picture to fill it. Tap-only, no reading required, no wrong answers:
 * once every part has some color the picture celebrates, and the child can
 * keep re-coloring, start the same picture fresh, or pick another one.
 */

import { useEffect, useState } from "react";
import {
  COLORING_CRAYONS,
  COLORING_OUTLINE,
  COLORING_PAGES,
  getColoringPickPhrase,
  getColoringPraisePhrase,
  getCrayonPhrase,
  isPageComplete,
  type ColoringFills,
  type ColoringPage,
} from "@/lib/coloring-pages";
import { loadColoringDrawings, saveColoringDrawing, type ColoringDrawings } from "@/lib/coloring-store";
import { useFriendlySpeech } from "@/hooks/use-friendly-speech";
import { useGameAudio } from "@/hooks/use-game-audio";
import { Confetti } from "./confetti";
import { BubbleBackground } from "./ocean-stage";

const OUTLINE_WIDTH = 10;
const BLANK_FILL = "#FFFFFF";
const NO_FILLS: ColoringFills = {};

interface ColoringPictureProps {
  page: ColoringPage;
  fills: ColoringFills;
  /** Leave out for the picker cards, where the whole card is the button. */
  onFill?: (regionId: string) => void;
}

/** The picture itself: fillable regions back to front, face details on top. */
function ColoringPicture({ page, fills, onFill }: ColoringPictureProps) {
  return (
    <svg
      className="coloring-art"
      viewBox="0 0 512 512"
      role={onFill ? "group" : undefined}
      aria-label={onFill ? `Color the ${page.word}` : undefined}
      aria-hidden={onFill ? undefined : true}
    >
      {page.regions.map((region) => (
        <path
          key={region.id}
          className="coloring-region"
          d={region.d}
          // Fill goes through style (not the attribute) so the CSS fill
          // transition softens each new color in.
          style={{ fill: fills[region.id] ?? BLANK_FILL }}
          stroke={COLORING_OUTLINE}
          strokeWidth={OUTLINE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          role={onFill ? "button" : undefined}
          tabIndex={onFill ? 0 : undefined}
          aria-label={onFill ? `${page.word} ${region.id}` : undefined}
          onClick={onFill ? () => onFill(region.id) : undefined}
          onKeyDown={
            onFill
              ? (event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  onFill(region.id);
                }
              : undefined
          }
        />
      ))}
      {/* Eyes, smiles and bubbles never take a tap — it falls through to
          the region underneath. */}
      <g pointerEvents="none">
        {page.details.map((detail, i) => (
          <path
            key={i}
            d={detail.d}
            fill={detail.fill ?? "none"}
            stroke={detail.width === 0 ? "none" : COLORING_OUTLINE}
            strokeWidth={detail.width ?? OUTLINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
}

interface ColoringScreenProps {
  onHome: () => void;
}

export function ColoringScreen({ onHome }: ColoringScreenProps) {
  const [page, setPage] = useState<ColoringPage | null>(null);
  const [fills, setFills] = useState<ColoringFills>(NO_FILLS);
  const [crayon, setCrayon] = useState<string>(COLORING_CRAYONS[0].hex);
  const [done, setDone] = useState(false);
  const [drawings, setDrawings] = useState<ColoringDrawings>({});
  const [history, setHistory] = useState<ColoringFills[]>([]);

  useEffect(() => setDrawings(loadColoringDrawings()), []);

  const { speak, stop } = useFriendlySpeech();
  const { playTap, playCelebrate } = useGameAudio();

  const pickPage = (chosen: ColoringPage) => {
    playTap();
    setPage(chosen);
    const saved = drawings[chosen.id] ?? NO_FILLS;
    setFills(saved);
    setHistory([]);
    setDone(isPageComplete(saved, chosen));
    speak(getColoringPickPhrase(chosen.word));
  };

  const backToPicker = () => {
    stop();
    setPage(null);
    setHistory([]);
    setFills(NO_FILLS);
    setDone(false);
  };

  const colorAgain = () => {
    if (!page) return;
    playTap();
    setHistory((previous) => [...previous, fills].slice(-50));
    setFills(NO_FILLS);
    saveColoringDrawing(page.id, NO_FILLS);
    setDrawings((previous) => ({ ...previous, [page.id]: NO_FILLS }));
    setDone(false);
    speak(getColoringPickPhrase(page.word));
  };

  const pickCrayon = (name: string, hex: string) => {
    playTap();
    setCrayon(hex);
    speak(getCrayonPhrase(name));
  };

  const fillRegion = (regionId: string) => {
    if (!page || fills[regionId] === crayon) return;
    playTap();
    setHistory((previous) => [...previous, fills].slice(-50));
    const next = { ...fills, [regionId]: crayon };
    setFills(next);
    saveColoringDrawing(page.id, next);
    setDrawings((previous) => ({ ...previous, [page.id]: next }));
    // Celebrate the first time the last white part gets color; re-coloring
    // a finished picture just keeps coloring.
    if (!done && isPageComplete(next, page)) {
      setDone(true);
      playCelebrate();
      speak(getColoringPraisePhrase(page.word));
    }
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!page || !previous) return;
    stop();
    playTap();
    setHistory((entries) => entries.slice(0, -1));
    setFills(previous);
    setDone(isPageComplete(previous, page));
    saveColoringDrawing(page.id, previous);
    setDrawings((entries) => ({ ...entries, [page.id]: previous }));
  };

  return (
    <div className="coloring-screen">
      <BubbleBackground />

      <header className="lesson-header">
        <button className="icon-btn" onClick={onHome} aria-label="Back home">
          ←
        </button>
        <div className="progress-pill">
          <span className="progress-letter">🖍️ Color</span>
          {page ? <span className="progress-count" aria-label={`${Object.keys(fills).length} of ${page.regions.length} parts colored`}>{Object.keys(fills).length} / {page.regions.length}</span> : null}
        </div>
        {page ? <button className="icon-btn" onClick={undo} disabled={!history.length} aria-label="Undo last color">↶</button> : <div />}
        {page ? (
          <button className="icon-btn" onClick={backToPicker} aria-label="Back to pictures">
            🖼️
          </button>
        ) : (
          <div />
        )}
      </header>

      {!page ? (
        <div className="coloring-picker">
          {COLORING_PAGES.map((entry) => (
            <button
              key={entry.id}
              className="coloring-card"
              style={{ borderColor: entry.color }}
              onClick={() => pickPage(entry)}
              aria-label={`Color the ${entry.word}`}
            >
              <ColoringPicture page={entry} fills={drawings[entry.id] ?? NO_FILLS} />
              <span className="coloring-card-word">{entry.word}{isPageComplete(drawings[entry.id] ?? NO_FILLS, entry) ? " ⭐" : ""}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="coloring-book">
          <section className={`coloring-stage ${done ? "done" : ""}`}>
            <ColoringPicture page={page} fills={fills} onFill={fillRegion} />
            {done ? (
              <div className="coloring-done">
                <button
                  className="coloring-done-btn"
                  onClick={backToPicker}
                  aria-label="Color another picture"
                >
                  🖼️
                </button>
                <button
                  className="coloring-done-btn coloring-again-btn"
                  onClick={colorAgain}
                  aria-label="Color it again"
                >
                  🔄
                </button>
              </div>
            ) : null}
          </section>

          <div className="coloring-crayons" role="group" aria-label="Crayons">
            {COLORING_CRAYONS.map((c) => (
              <button
                key={c.hex}
                className={`coloring-crayon ${crayon === c.hex ? "picked" : ""}`}
                style={{ backgroundColor: c.hex }}
                onClick={() => pickCrayon(c.name, c.hex)}
                aria-label={c.name}
                aria-pressed={crayon === c.hex}
              >{crayon === c.hex ? <span aria-hidden="true">✓</span> : null}</button>
            ))}
          </div>
        </div>
      )}

      {done ? <Confetti /> : null}
    </div>
  );
}
