import { describe, expect, it } from "vitest";
import {
  getAllowedTtsPhraseCount,
  getStandaloneLetterSpeech,
  isAllowedTtsPhrase,
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

  it("disambiguates standalone A as an alphabet letter", () => {
    expect(getStandaloneLetterSpeech("A")).toBe("Letter A!");
    expect(getStandaloneLetterSpeech("b")).toBe("B!");
    expect(isAllowedTtsPhrase("Letter A!")).toBe(true);
  });
});
