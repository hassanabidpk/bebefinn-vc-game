import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { generateGeminiSpeech, isGeminiSpendingCapError } from "@/lib/gemini-tts";
import { isAllowedTtsPhrase } from "@/lib/tts-phrases";

/**
 * Gemini TTS proxy. Keeps the API key on the server and returns a WAV
 * blob the browser can play directly via an <audio> element.
 *
 * Caches by sha256(text|voice) in memory so repeated lookups for the
 * same lesson phrase don't burn quota.
 */

export const runtime = "nodejs";

// In-memory cache. Survives across requests within a single Node process,
// which is exactly the lifetime we care about — Vercel keeps warm functions
// alive long enough that recurring lesson lookups land here.
const cache = new Map<string, Buffer>();

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response("missing GEMINI_API_KEY", { status: 500 });
  }

  let body: { text?: string; voice?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) return new Response("text required", { status: 400 });
  if (text.length > 200) return new Response("text too long", { status: 400 });
  if (!isAllowedTtsPhrase(text)) return new Response("phrase not allowed", { status: 403 });

  const voice = body.voice || "Leda";
  if (voice !== "Leda" && voice !== "Aoede") {
    return new Response("voice not allowed", { status: 400 });
  }
  const cacheKey = crypto.createHash("sha256").update(`${voice}|${text}`).digest("hex");

  const cached = cache.get(cacheKey);
  if (cached) {
    return new Response(new Uint8Array(cached), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  let wav: Buffer;
  try {
    wav = await generateGeminiSpeech(apiKey, text, voice);
  } catch (error) {
    const capped = isGeminiSpendingCapError(error);
    const details = error as { name?: string; status?: number; code?: number };
    console.error("[tts] Gemini request failed", {
      name: details.name,
      status: details.status,
      code: details.code,
      capped,
    });
    return new Response(capped ? "gemini billing unavailable" : "gemini tts unavailable", {
      status: 503,
      headers: { "Retry-After": capped ? "300" : "30" },
    });
  }

  cache.set(cacheKey, wav);
  // Bound warm-instance memory while still covering a full play session.
  if (cache.size > 300) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }

  return new Response(new Uint8Array(wav), {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
