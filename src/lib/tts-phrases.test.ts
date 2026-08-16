import { describe, expect, it } from "vitest";
import { alphabetData } from "./alphabet-data";
import { ANIMAL_INFO } from "./animal-info";
import {
  getRescuePromptPhrase,
  getRescueRetryPhrase,
  getRescueSuccessPhrase,
  getRideCompletePhrase,
  getRideEncounterPhrase,
  getRideModePhrase,
  getRidePhotoPhrase,
  getStickerPhrase,
  RESCUE_COMPLETE_PHRASE,
  type LetterRescueChallenge,
} from "./game-speech";
import { RIDE_CONFIGS } from "./ride-data";
import { spellingWords } from "./spelling-data";
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

  it("accepts every generated Rescue prompt, retry, success, and completion phrase", () => {
    const challenges: LetterRescueChallenge[] = ["match", "word", "sound"];
    const letters = alphabetData.filter((entry) => /^[A-Z]$/.test(entry.letter));

    for (const entry of letters) {
      const spokenWord = entry.spokenWord ?? entry.word;

      for (const challenge of challenges) {
        const prompt = getRescuePromptPhrase(challenge, entry.letter, spokenWord);
        expect(isAllowedTtsPhrase(prompt), `${entry.letter} ${challenge} prompt`).toBe(true);
        expect(isAllowedTtsPhrase(getRescueRetryPhrase(prompt)), `${entry.letter} ${challenge} retry`).toBe(
          true
        );
      }

      expect(
        isAllowedTtsPhrase(getRescueSuccessPhrase(entry.letter, spokenWord)),
        `${entry.letter} success`
      ).toBe(true);
    }

    expect(isAllowedTtsPhrase(RESCUE_COMPLETE_PHRASE)).toBe(true);
  });

  it("uses short letter-for-word reinforcement after a Rescue guess", () => {
    expect(getRescueSuccessPhrase("A", "Alpaca")).toBe("A for Alpaca!");
    expect(getRescueSuccessPhrase("D", "Dog")).toBe("D for Dog!");
    expect(getRescueSuccessPhrase("X", "Handsome Zaven")).toBe(
      "X for Handsome Zaven!"
    );
  });

  it("accepts every generated Safari Ride and Ocean Dive narration phrase", () => {
    for (const config of Object.values(RIDE_CONFIGS)) {
      expect(isAllowedTtsPhrase(getRideCompletePhrase(config.id)), `${config.id} completion`).toBe(true);

      for (const animal of config.animals) {
        const fact = ANIMAL_INFO[animal.word]?.en ?? "";
        expect(
          isAllowedTtsPhrase(getRideEncounterPhrase(animal.word, fact)),
          `${config.id} ${animal.word} encounter`
        ).toBe(true);
        expect(
          isAllowedTtsPhrase(getRidePhotoPhrase(animal.word)),
          `${config.id} ${animal.word} photo`
        ).toBe(true);
      }
    }

    expect(isAllowedTtsPhrase(getRideModePhrase("auto"))).toBe(true);
    expect(isAllowedTtsPhrase(getRideModePhrase("drive"))).toBe(true);
  });
  it("accepts every sticker book name so none fall back to the device voice", () => {
    const stickerWords = [
      ...Object.values(RIDE_CONFIGS).flatMap((config) => config.animals.map((animal) => animal.word)),
      ...spellingWords.map((entry) => entry.word),
    ];
    expect(stickerWords.length).toBeGreaterThan(0);
    for (const word of stickerWords) {
      expect(isAllowedTtsPhrase(getStickerPhrase(word))).toBe(true);
    }
  });
});
