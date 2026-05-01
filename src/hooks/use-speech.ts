"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function chooseFriendlyVoice(voices: SpeechSynthesisVoice[]) {
  return (
    voices.find(
      (voice) =>
        voice.lang === "en-US" &&
        (voice.name.includes("Samantha") ||
          voice.name.includes("Google US English") ||
          voice.name.includes("Microsoft Aria"))
    ) ??
    voices.find(
      (voice) =>
        voice.lang.startsWith("en") &&
        (voice.name.includes("Karen") ||
          voice.name.includes("Moira") ||
          voice.name.includes("Female") ||
          voice.name.includes("Natural"))
    ) ??
    voices.find((voice) => voice.lang.startsWith("en")) ??
    null
  );
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Detach old handlers before cancelling to prevent error events
    if (utteranceRef.current) {
      utteranceRef.current.onstart = null;
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.72;
    utterance.pitch = 1.2;
    utterance.volume = 0.95;

    const voices = voicesRef.current.length
      ? voicesRef.current
      : window.speechSynthesis.getVoices();
    const preferredVoice = chooseFriendlyVoice(voices);

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      // Suppress "interrupted" and "canceled" errors — these happen
      // normally when cancelling speech to start a new utterance
      if (e.error === "interrupted" || e.error === "canceled") return;
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  /**
   * Warm up SpeechSynthesis with an empty utterance. Must be invoked
   * inside a real user gesture (e.g. Start button click) so iOS Safari
   * unblocks future speak() calls scheduled later via setTimeout.
   */
  const warmUp = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      u.rate = 1;
      window.speechSynthesis.speak(u);
    } catch {
      // ignore
    }
  }, []);

  return { speak, stop, isSpeaking, warmUp };
}
