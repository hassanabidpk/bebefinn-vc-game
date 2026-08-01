import { describe, expect, it } from "vitest";
import { buildPreschoolVoicePrompt } from "./gemini-tts";
import { getTtsCacheKeySource } from "./tts-config";

describe("preschool letter narration", () => {
  it("asks Gemini to say only the alphabet name for standalone letters", () => {
    const prompt = buildPreschoolVoicePrompt("H!");
    expect(prompt).toContain("Say only its letter name");
    expect(prompt).toContain("H is pronounced aitch");
    expect(prompt).toContain("Do not add words such as letter");
    expect(prompt).toContain("Transcript: H!");
  });

  it("versions standalone letter clips separately from ordinary speech", () => {
    expect(getTtsCacheKeySource("Leda", "A!")).not.toBe(
      getTtsCacheKeySource("Leda", "Apple!")
    );
    expect(getTtsCacheKeySource("Leda", "U!")).toContain("alphabet-names-v1");
  });
});
