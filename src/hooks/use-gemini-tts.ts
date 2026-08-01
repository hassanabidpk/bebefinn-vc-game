"use client";

import { useCallback, useEffect, useRef } from "react";
import { getTtsCacheKeySource } from "@/lib/tts-config";

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
const entryLoads = new Map<string, Promise<CacheEntry>>();
let apiUnavailableUntil = 0;

/** Versioned sha256 key. Matches scripts/generate-tts.ts. */
async function hashKey(voice: string, text: string): Promise<string> {
  const data = new TextEncoder().encode(getTtsCacheKeySource(voice, text));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

/** Pull a pre-generated /tts/{hash}.wav if present; otherwise return null. */
async function fetchStaticTTS(voice: string, text: string): Promise<Blob | null> {
  try {
    const hash = await hashKey(voice, text);
    const r = await fetch(`/tts/${hash}.wav`, { method: "GET" });
    if (!r.ok) return null;
    return await r.blob();
  } catch {
    return null;
  }
}

async function loadEntry(text: string, voice: string): Promise<CacheEntry> {
  const key = `${voice}|${text}`;
  const cached = blobCache.get(key);
  if (cached) return cached;

  const pending = entryLoads.get(key);
  if (pending) return pending;

  const load = (async () => {
    let blob = await fetchStaticTTS(voice, text);
    if (!blob) {
      if (Date.now() < apiUnavailableUntil) throw new Error("tts api temporarily unavailable");
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });
      if (!r.ok) {
        const retryAfter = Number(r.headers.get("Retry-After") ?? 30);
        if (r.status >= 500 || r.status === 429) {
          apiUnavailableUntil = Date.now() + Math.max(30, retryAfter) * 1000;
        }
        const msg = await r.text();
        throw new Error(`tts ${r.status}: ${msg}`);
      }
      blob = await r.blob();
    }

    const entry = { url: URL.createObjectURL(blob), voice };
    blobCache.set(key, entry);
    return entry;
  })();

  entryLoads.set(key, load);
  try {
    return await load;
  } finally {
    entryLoads.delete(key);
  }
}

export interface PlayOptions {
  voice?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

export function useGeminiTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackIdRef = useRef(0);

  const ensureAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    return audioRef.current;
  };

  const stop = useCallback(() => {
    playbackIdRef.current += 1;
    const a = audioRef.current;
    if (!a) return;
    a.onended = null;
    a.onerror = null;
    a.pause();
    a.currentTime = 0;
  }, []);

  const play = useCallback(async (text: string, opts: PlayOptions = {}): Promise<void> => {
    const playbackId = ++playbackIdRef.current;
    const currentAudio = audioRef.current;
    if (currentAudio) {
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const voice = opts.voice ?? "Leda";
    const key = `${voice}|${text}`;

    let entry: CacheEntry;
    try {
      entry = await loadEntry(text, voice);
    } catch (error) {
      // Cancellation is not a playback failure and must not start fallback TTS.
      if (playbackId !== playbackIdRef.current) return;
      throw error;
    }

    // A screen change or newer prompt may have happened while audio loaded.
    if (playbackId !== playbackIdRef.current) return;

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
      audio
        .play()
        .then(() => {
          if (playbackId === playbackIdRef.current) opts.onStart?.();
        })
        .catch(reject);
    });
  }, []);

  useEffect(() => stop, [stop]);

  /** Speak English (Leda, female), short pause, then Chinese (Aoede). */
  const playBilingual = useCallback(
    async (en: string, zh: string, onAllDone?: () => void) => {
      const englishPlaybackId = playbackIdRef.current + 1;
      await play(en, { voice: "Leda" });
      if (playbackIdRef.current !== englishPlaybackId) return;
      await new Promise((r) => setTimeout(r, 250));
      if (playbackIdRef.current !== englishPlaybackId) return;
      await play(zh, { voice: "Aoede", onEnd: onAllDone });
    },
    [play]
  );

  /**
   * Warm the cache without playing. Use as soon as a phrase is known so
   * the WAV is in memory by the time the user actually needs to hear it.
   */
  const prefetch = useCallback(async (text: string, voice = "Leda") => {
    try {
      await loadEntry(text, voice);
    } catch {
      // Network blip — caller will fall back to browser TTS.
    }
  }, []);

  return { play, playBilingual, prefetch, stop };
}
