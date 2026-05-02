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

function chooseChineseVoice(voices: SpeechSynthesisVoice[]) {
  return (
    voices.find((v) => v.lang === "zh-CN" && /female|natural|google|tingting/i.test(v.name)) ??
    voices.find((v) => v.lang === "zh-CN") ??
    voices.find((v) => v.lang.startsWith("zh")) ??
    null
  );
}

export interface SpeakOptions {
  lang?: "en" | "zh";
  rate?: number;
  onEnd?: () => void;
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

  const speak = useCallback((text: string, opts: SpeakOptions = {}) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Detach old handlers before cancelling to prevent error events
    if (utteranceRef.current) {
      utteranceRef.current.onstart = null;
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = opts.rate ?? 0.72;
    utterance.pitch = 1.2;
    utterance.volume = 0.95;

    const voices = voicesRef.current.length
      ? voicesRef.current
      : window.speechSynthesis.getVoices();
    const preferredVoice =
      opts.lang === "zh" ? chooseChineseVoice(voices) : chooseFriendlyVoice(voices);

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    } else if (opts.lang === "zh") {
      utterance.lang = "zh-CN";
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      opts.onEnd?.();
    };
    utterance.onerror = (e) => {
      // Suppress "interrupted" and "canceled" errors — these happen
      // normally when cancelling speech to start a new utterance
      if (e.error === "interrupted" || e.error === "canceled") return;
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  /** Speak English then Chinese (zh-CN), back-to-back. */
  const speakBilingual = useCallback(
    (en: string, zh: string, onAllDone?: () => void) => {
      speak(en, {
        lang: "en",
        onEnd: () => {
          // Tiny pause so the two languages don't blur together.
          setTimeout(() => {
            speak(zh, { lang: "zh", rate: 0.78, onEnd: onAllDone });
          }, 250);
        },
      });
    },
    [speak]
  );

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

  return { speak, speakBilingual, stop, isSpeaking, warmUp };
}
