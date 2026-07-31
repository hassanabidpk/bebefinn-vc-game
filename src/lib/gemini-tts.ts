import { GoogleGenAI } from "@google/genai";

export const GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";

export function buildPreschoolVoicePrompt(text: string) {
  return [
    "Speak warmly, sweetly, and playfully to a preschool child aged three to six.",
    "Use a gentle smile, clear pronunciation, natural rhythm, and an unhurried pace.",
    "Keep the delivery encouraging, never exaggerated or loud.",
    "Speak only the transcript below and do not read these directions aloud.",
    `Transcript: ${text}`,
  ].join("\n");
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
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(pcmBytes, 40);
  return buf;
}

export async function generateGeminiSpeech(apiKey: string, text: string, voice: string) {
  const ai = new GoogleGenAI({ apiKey, vertexai: false });
  const interaction = await ai.interactions.create({
    model: GEMINI_TTS_MODEL,
    input: buildPreschoolVoicePrompt(text),
    response_format: { type: "audio" },
    generation_config: {
      speech_config: [{ voice }],
    },
  });

  const audio = interaction.output_audio;
  if (!audio?.data) throw new Error("Gemini returned no audio data");

  const bytes = Buffer.from(audio.data, "base64");
  if (audio.mime_type === "audio/wav") return bytes;

  return Buffer.concat([
    wavHeader(bytes.length, audio.sample_rate ?? 24000, audio.channels ?? 1, 16),
    bytes,
  ]);
}

export function isGeminiSpendingCapError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /monthly spending cap|billing account has exceeded/i.test(message);
}
