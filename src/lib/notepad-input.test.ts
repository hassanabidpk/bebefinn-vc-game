import { describe, expect, it } from "vitest";
import {
  NOTEPAD_ALPHABET_COMPLETE_PHRASE,
  createNotepadTapState,
  getAlphabetMilestone,
  getAlphabetRunLength,
  getNotepadBoosterPhrase,
  registerNotepadTap,
} from "./notepad-input";

describe("registerNotepadTap", () => {
  it("accepts ordinary taps", () => {
    const state = createNotepadTapState();
    expect(registerNotepadTap(state, 1000)).toBe("accept");
    expect(registerNotepadTap(state, 1300)).toBe("accept");
  });

  it("gently interrupts rapid repeated presses", () => {
    const state = createNotepadTapState();
    expect(registerNotepadTap(state, 1000)).toBe("accept");
    expect(registerNotepadTap(state, 1050)).toBe("ignore");
    expect(registerNotepadTap(state, 1100)).toBe("ignore");
    expect(registerNotepadTap(state, 1150)).toBe("remind");
    expect(registerNotepadTap(state, 1300)).toBe("ignore");
  });

  it("does not repeat the reminder during its cooldown", () => {
    const state = createNotepadTapState();
    for (let i = 0; i < 3; i += 1) registerNotepadTap(state, 1000 + i * 50);
    expect(registerNotepadTap(state, 1150)).toBe("remind");
    for (let i = 0; i < 3; i += 1) registerNotepadTap(state, 2500 + i * 50);
    expect(registerNotepadTap(state, 2650)).toBe("ignore");
  });
});

describe("getAlphabetRunLength", () => {
  it("counts an in-order run that starts at A", () => {
    expect(getAlphabetRunLength([])).toBe(0);
    expect(getAlphabetRunLength(["A", "B", "C"])).toBe(3);
    expect(getAlphabetRunLength("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""))).toBe(26);
  });

  it("ignores anything typed before the run", () => {
    expect(getAlphabetRunLength(["X", "7", "A", "B"])).toBe(2);
  });

  it("restarts at A and drops to zero on an out-of-order character", () => {
    expect(getAlphabetRunLength(["A", "B", "A"])).toBe(1);
    expect(getAlphabetRunLength(["A", "B", "D"])).toBe(0);
    expect(getAlphabetRunLength(["A", "A", "B"])).toBe(2);
  });

  it("starts a fresh run after a finished alphabet", () => {
    const chars = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "A"];
    expect(getAlphabetRunLength(chars)).toBe(1);
  });
});

describe("getAlphabetMilestone", () => {
  it("boosts every five letters and applauds a full alphabet", () => {
    expect([5, 10, 15, 20].map(getAlphabetMilestone)).toEqual([
      "booster",
      "booster",
      "booster",
      "booster",
    ]);
    expect(getAlphabetMilestone(26)).toBe("complete");
  });

  it("stays quiet between milestones", () => {
    expect([0, 1, 4, 6, 25].map(getAlphabetMilestone)).toEqual([null, null, null, null, null]);
  });
});

describe("notepad cheer phrases", () => {
  it("names the letters covered so far", () => {
    expect(getNotepadBoosterPhrase(5)).toBe("A to E! Keep going!");
    expect(getNotepadBoosterPhrase(20)).toBe("A to T! Keep going!");
    expect(NOTEPAD_ALPHABET_COMPLETE_PHRASE).toBe("Hooray! You wrote the whole alphabet!");
  });
});
