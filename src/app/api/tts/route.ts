import { NextRequest } from "next/server";
import crypto from "node:crypto";

/**
 * Gemini TTS proxy. Keeps the API key on the server and returns a WAV
 * blob the browser can play directly via an <audio> element.
 *
 * Caches by sha256(text|voice) in memory so repeated lookups for the
 * same lesson phrase don't burn quota.
 */

export const runtime = "nodejs";

const MODEL = "gemini-3.1-flash-tts-preview";

// In-memory cache. Survives across requests within a single Node process,
// which is exactly the lifetime we care about — Vercel keeps warm functions
// alive long enough that recurring lesson lookups land here.
const cache = new Map<string, Buffer>();

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }>;
    };
  }>;
}

function wavHeader(pcmBytes: number, sampleRate: number, channels: number, bitsPerSample: number) {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const buf = Buffer.alloc(44);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + pcmBytes, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(pcmBytes, 40);
  return buf;
}

/** Parse mime like "audio/l16; rate=24000; channels=1" → { rate, channels }. */
function parseAudioMime(mime: string) {
  const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
  const channels = Number(/channels=(\d+)/.exec(mime)?.[1] ?? 1);
  return { rate, channels };
}

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

  const voice = body.voice || "Puck";
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        },
      },
    }),
  });

  if (!r.ok) {
    const msg = await r.text();
    return new Response(`gemini error: ${r.status} ${msg.slice(0, 200)}`, { status: 502 });
  }

  const json = (await r.json()) as GeminiResponse;
  const inline = json.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inline?.data || !inline.mimeType) {
    return new Response("no audio in response", { status: 502 });
  }

  const pcm = Buffer.from(inline.data, "base64");
  const { rate, channels } = parseAudioMime(inline.mimeType);
  const wav = Buffer.concat([wavHeader(pcm.length, rate, channels, 16), pcm]);

  cache.set(cacheKey, wav);
  // Bound cache to ~200 entries; this is way more than the 36 lesson
  // phrases × 2 langs we actually need.
  if (cache.size > 200) {
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
