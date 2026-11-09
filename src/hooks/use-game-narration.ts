"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Device-only English speech; bounded completion and request IDs isolate stale callbacks. */
export function useGameNarration() {
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const [muted, setMuted] = useState(false);
  const request = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = useCallback(() => {
    request.current += 1;
    if (timer.current) clearTimeout(timer.current);
    if (utterance.current) {
      utterance.current.onend = null;
      utterance.current.onerror = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);
  const say = useCallback((text: string, onEnd?: () => void) => {
    stop(); const id = request.current;
    let finished = false;
    const finish = () => {
      if (finished || id !== request.current) return;
      finished = true;
      if (timer.current) clearTimeout(timer.current);
      onEnd?.();
    };
    if (muted) { finish(); return; }
    timer.current = setTimeout(finish, 6500);
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { finish(); return; }
      const line = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang === "en-US") ?? voices.find(v => v.lang.startsWith("en"));
      line.lang = voice?.lang ?? "en-US";
      if (voice) line.voice = voice;
      line.rate = .82; line.pitch = 1.06;
      line.onend = finish; line.onerror = finish;
      utterance.current = line;
      window.speechSynthesis.speak(line);
    } catch { finish(); }
  }, [muted, stop]);
  const toggle = useCallback(() => { stop(); setMuted(value => !value); }, [stop]);
  useEffect(() => stop, [stop]);
  return { say, stop, muted, toggle };
}
