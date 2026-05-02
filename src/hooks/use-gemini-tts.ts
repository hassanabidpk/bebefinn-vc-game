"use client";

import { useCallback, useRef } from "react";

/**
 * Fetches WAV audio from /api/tts (server-side Gemini TTS) and plays it
 * via a single shared <audio> element. Per-text Blob URLs are cached so
 * repeat plays of the same lesson phrase are instant and free.
 */

interface CacheEntry {
  url: string;
  voice: string;
}

const blobCache = new Map<string, CacheEntry>();

export interface PlayOptions {
  voice?: string;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

export function useGeminiTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ensureAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    return audioRef.current;
  };

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.onended = null;
    a.onerror = null;
    a.pause();
    a.currentTime = 0;
  }, []);

  const play = useCallback(async (text: string, opts: PlayOptions = {}): Promise<void> => {
    const voice = opts.voice ?? "Puck";
    const key = `${voice}|${text}`;

    let entry = blobCache.get(key);
    if (!entry) {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });
      if (!r.ok) {
        const msg = await r.text();
        throw new Error(`tts ${r.status}: ${msg}`);
      }
      const blob = await r.blob();
      entry = { url: URL.createObjectURL(blob), voice };
      blobCache.set(key, entry);
    }

    const audio = ensureAudio();
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.src = entry.url;

    return new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        opts.onEnd?.();
        resolve();
      };
      audio.onerror = (e) => {
        const err = audio.error ?? e;
        opts.onError?.(err);
        reject(err);
      };
      audio.play().catch(reject);
    });
  }, []);

  /** Speak English (Puck), short pause, then Chinese (Aoede). */
  const playBilingual = useCallback(
    async (en: string, zh: string, onAllDone?: () => void) => {
      try {
        await play(en, { voice: "Puck" });
        await new Promise((r) => setTimeout(r, 250));
        await play(zh, { voice: "Aoede", onEnd: onAllDone });
      } catch (err) {
        // Bubble error so caller can fall back to browser SpeechSynthesis.
        throw err;
      }
    },
    [play]
  );

  return { play, playBilingual, stop };
}
