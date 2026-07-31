"use client";

import { useCallback, useEffect, useRef } from "react";
import { useGeminiTTS } from "./use-gemini-tts";
import { type SpeakOptions, useSpeech } from "./use-speech";

const CLOUD_START_TIMEOUT_MS = 1200;

export interface FriendlySpeakOptions extends SpeakOptions {
  voice?: string;
}

export function useFriendlySpeech() {
  const {
    speak: deviceSpeak,
    stop: stopDevice,
    warmUp,
    isSpeaking,
  } = useSpeech();
  const {
    play: playGemini,
    stop: stopGemini,
    prefetch: prefetchGemini,
  } = useGeminiTTS();
  const requestIdRef = useRef(0);
  const fallbackTimersRef = useRef(new Set<ReturnType<typeof setTimeout>>());

  const clearFallbackTimers = useCallback(() => {
    for (const timer of fallbackTimersRef.current) clearTimeout(timer);
    fallbackTimersRef.current.clear();
  }, []);

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    clearFallbackTimers();
    stopGemini();
    stopDevice();
  }, [clearFallbackTimers, stopDevice, stopGemini]);

  const speak = useCallback(
    (text: string, options: FriendlySpeakOptions = {}) => {
      const requestId = ++requestIdRef.current;
      clearFallbackTimers();
      stopGemini();
      stopDevice();

      let completed = false;
      let fallbackStarted = false;
      const voice = options.voice ?? (options.lang === "zh" ? "Aoede" : "Leda");

      const fallback = () => {
        if (completed || fallbackStarted || requestId !== requestIdRef.current) return;
        fallbackStarted = true;
        stopGemini();
        deviceSpeak(text, options);
      };

      const timer = setTimeout(fallback, CLOUD_START_TIMEOUT_MS);
      fallbackTimersRef.current.add(timer);

      playGemini(text, {
          voice,
          onStart: () => {
            clearTimeout(timer);
            fallbackTimersRef.current.delete(timer);
          },
          onEnd: () => {
            if (requestId !== requestIdRef.current || fallbackStarted) return;
            completed = true;
            clearTimeout(timer);
            fallbackTimersRef.current.delete(timer);
            options.onEnd?.();
          },
      }).catch(fallback);
    },
    [clearFallbackTimers, deviceSpeak, playGemini, stopDevice, stopGemini]
  );

  const prefetch = useCallback(
    (text: string, voice = "Leda") => prefetchGemini(text, voice),
    [prefetchGemini]
  );

  useEffect(() => stop, [stop]);

  return {
    speak,
    stop,
    prefetch,
    warmUp,
    isSpeaking,
  };
}
