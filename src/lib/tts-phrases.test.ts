import { describe, expect, it } from "vitest";
import {
  getAllowedTtsPhraseCount,
  getStandaloneLetterSpeech,
  isAllowedTtsPhrase,
  NOTEPAD_TAP_REMINDER,
} from "./tts-phrases";

describe("TTS phrase allowlist", () => {
  it("covers lesson and game narration", () => {
    expect(isAllowedTtsPhrase("X! X for Handsome Zaven!")).toBe(true);
    expect(isAllowedTtsPhrase("Let's spell Cat. Tap the letters in order.")).toBe(true);
    expect(isAllowedTtsPhrase("C. A. T. Cat!")).toBe(true);
    expect(isAllowedTtsPhrase("Find the Elephant!")).toBe(true);
    expect(isAllowedTtsPhrase("Eight!")).toBe(true);
    expect(getAllowedTtsPhraseCount()).toBeGreaterThan(250);
  });

  it("rejects arbitrary text", () => {
    expect(isAllowedTtsPhrase("Read any text supplied by a stranger")).toBe(false);
  });

  it("keeps standalone letter transcripts concise", () => {
    expect(getStandaloneLetterSpeech("A")).toBe("A!");
    expect(getStandaloneLetterSpeech("b")).toBe("B!");
    expect(getStandaloneLetterSpeech("H")).toBe("H!");
    expect(getStandaloneLetterSpeech("U")).toBe("U!");
    expect(isAllowedTtsPhrase("A!")).toBe(true);
    expect(isAllowedTtsPhrase(NOTEPAD_TAP_REMINDER)).toBe(true);
  });
});
