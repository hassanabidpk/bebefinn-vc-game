import { describe, expect, it } from "vitest";
import { isCorrectLessonGuess, lessonGuessFromKey } from "./lesson-guess";

describe("lessonGuessFromKey", () => {
  it("normalises alphabet guesses", () => {
    expect(lessonGuessFromKey("d")).toBe("D");
    expect(lessonGuessFromKey("D")).toBe("D");
  });

  it("supports number lessons including 10", () => {
    expect(lessonGuessFromKey("4")).toBe("4");
    expect(lessonGuessFromKey("0")).toBe("10");
  });

  it("ignores navigation and modifier keys", () => {
    expect(lessonGuessFromKey("ArrowRight")).toBeNull();
    expect(lessonGuessFromKey("Shift")).toBeNull();
  });
});

describe("isCorrectLessonGuess", () => {
  it("accepts the first letter for a word lesson", () => {
    expect(isCorrectLessonGuess("d", "D")).toBe(true);
    expect(isCorrectLessonGuess("b", "D")).toBe(false);
  });
});
