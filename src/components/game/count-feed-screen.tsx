"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildCountFeedRound,
  getCountFeedCountPhrase,
  getCountFeedPraisePhrase,
  getCountFeedPromptPhrase,
  type CountFeedRound,
} from "@/lib/count-feed-data";
import { useFriendlySpeech } from "@/hooks/use-friendly-speech";
import { useGameAudio } from "@/hooks/use-game-audio";
import { BubbleBackground } from "./ocean-stage";
import { AnimalPhoto } from "./animal-photo";
import { Confetti } from "./confetti";

const PAUSE_AFTER_PRAISE_MS = 900;
const CELEBRATION_FALLBACK_MS = 9000;

interface FedShell {
  id: number;
  /** Offset from the shell to the friend, driving the fly-in animation. */
  dx: number;
  dy: number;
}

/** Layout-space centre of an element, ignoring CSS transforms — the iPad
 *  shell scales (and on phones rotates) the whole game, so client rects
 *  can't drive a translate() inside it. */
function layoutCenter(element: HTMLElement) {
  let x = element.offsetWidth / 2;
  let y = element.offsetHeight / 2;
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.offsetParent as HTMLElement | null
  ) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  return { x, y };
}

interface CountFeedScreenProps {
  onHome: () => void;
}

export function CountFeedScreen({ onHome }: CountFeedScreenProps) {
  const [round, setRound] = useState<CountFeedRound>(() => buildCountFeedRound(0));
  const [fed, setFed] = useState<FedShell[]>([]);
  const friendRef = useRef<HTMLDivElement | null>(null);
  const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationId = useRef(0);
  const { speak, prefetch } = useFriendlySpeech();
  const { playCelebrate, playNext, playTap } = useGameAudio();

  const count = fed.length;
  const done = count >= round.target;
  const prompt = getCountFeedPromptPhrase(round.friend.word, round.target);
  const praise = getCountFeedPraisePhrase(round.target);

  const clearPromptTimer = useCallback(() => {
    if (!promptTimer.current) return;
    clearTimeout(promptTimer.current);
    promptTimer.current = null;
  }, []);

  // New round: prefetch its lines, then say who is hungry for how many.
  useEffect(() => {
    prefetch(prompt);
    prefetch(praise);
    promptTimer.current = setTimeout(() => {
      promptTimer.current = null;
      speak(prompt);
    }, 250);
    return clearPromptTimer;
  }, [clearPromptTimer, praise, prefetch, prompt, round.index, speak]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      celebrationId.current += 1;
    };
  }, []);

  const advance = useCallback(() => {
    celebrationId.current += 1;
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    setFed([]);
    setRound((previous) => buildCountFeedRound(previous.index + 1, previous.target));
  }, []);

  const celebrate = useCallback(
    (lastCountPhrase: string) => {
      const id = ++celebrationId.current;
      const goNext = () => {
        if (id === celebrationId.current) advance();
      };
      playCelebrate();

      // Final count, then praise, then a short pause — advance from real
      // audio completion so the praise is never cut off.
      speak(lastCountPhrase, {
        onEnd: () => {
          if (id !== celebrationId.current) return;
          speak(praise, {
            onEnd: () => {
              if (id !== celebrationId.current) return;
              if (advanceTimer.current) clearTimeout(advanceTimer.current);
              advanceTimer.current = setTimeout(goNext, PAUSE_AFTER_PRAISE_MS);
            },
          });
        },
      });

      // A stalled speech engine must never trap the child on a fed friend.
      advanceTimer.current = setTimeout(goNext, CELEBRATION_FALLBACK_MS);
    },
    [advance, playCelebrate, praise, speak]
  );

  const onShell = useCallback(
    (id: number, event: React.MouseEvent<HTMLButtonElement>) => {
      // Extra taps once the friend is full are simply ignored — no "wrong" feedback.
      if (done || fed.some((shell) => shell.id === id)) return;
      clearPromptTimer();
      const from = layoutCenter(event.currentTarget);
      const to = friendRef.current ? layoutCenter(friendRef.current) : from;
      const nextFed = [...fed, { id, dx: to.x - from.x, dy: to.y - from.y }];
      setFed(nextFed);
      playTap();

      const countPhrase = getCountFeedCountPhrase(nextFed.length);
      if (nextFed.length >= round.target) celebrate(countPhrase);
      else speak(countPhrase);
    },
    [celebrate, clearPromptTimer, done, fed, playTap, round.target, speak]
  );

  const repeatPrompt = () => {
    clearPromptTimer();
    speak(prompt);
  };

  // Alternating class names restart the gulp animation on every shell.
  const gulpClass = count ? (count % 2 ? "count-gulp-odd" : "count-gulp-even") : "";

  return (
    <div
      className="count-feed-screen"
      style={{ ["--count-friend" as string]: round.friend.color } as React.CSSProperties}
    >
      <BubbleBackground />

      <header className="lesson-header">
        <button className="icon-btn" onClick={onHome} aria-label="Back home">←</button>
        <div className="progress-pill">
          <div className="progress-pill-row">
            <span className="progress-letter">🔢 Count & Feed</span>
            <span className="progress-count">Round {round.index + 1}</span>
          </div>
        </div>
        <div />
        <button
          className="icon-btn"
          onClick={repeatPrompt}
          aria-label="Say it again"
          disabled={done}
        >
          🔊
        </button>
      </header>

      <div className="count-body">
        <div className={`count-friend ${done ? "count-friend-happy" : ""}`}>
          <div ref={friendRef} className={`count-friend-photo ${gulpClass}`}>
            <AnimalPhoto word={round.friend.word} color={round.friend.color} size={200} />
          </div>
          <div className="count-target">
            <span className="count-numeral">{round.target}</span>
            <div
              className="count-dots"
              role="img"
              aria-label={`${count} of ${round.target} shells`}
            >
              {Array.from({ length: round.target }, (_, i) => (
                <span
                  key={`${round.index}-${i}`}
                  className={`count-dot ${i < count ? "count-dot-filled" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Positioned wrapper centres the Next button over the tray; it has no
            border, so layoutCenter() offsets for the shells stay exact. */}
        <div className="count-tray-area">
          <div className="count-tray" key={`tray-${round.index}`}>
            {Array.from({ length: round.shellCount }, (_, i) => {
              const fedShell = fed.find((shell) => shell.id === i);
              return (
                <button
                  key={`${round.index}-${i}`}
                  className={`count-shell ${fedShell ? "count-shell-fed" : ""} ${
                    done && !fedShell ? "count-shell-resting" : ""
                  }`}
                  style={
                    fedShell
                      ? ({
                          ["--count-fly-x" as string]: `${fedShell.dx}px`,
                          ["--count-fly-y" as string]: `${fedShell.dy}px`,
                        } as React.CSSProperties)
                      : undefined
                  }
                  onClick={(event) => onShell(i, event)}
                  disabled={done || Boolean(fedShell)}
                  aria-label="Shell"
                >
                  <span className="count-shell-emoji" aria-hidden>🐚</span>
                </button>
              );
            })}
          </div>
          {done ? (
            <button
              className="count-next"
              onClick={() => {
                playNext();
                advance();
              }}
              aria-label="Next friend"
            >
              ➡️
            </button>
          ) : null}
        </div>
      </div>

      {done ? <Confetti key={`confetti-${round.index}`} /> : null}
    </div>
  );
}
