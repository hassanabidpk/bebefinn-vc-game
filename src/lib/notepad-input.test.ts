import { describe, expect, it } from "vitest";
import { createNotepadTapState, registerNotepadTap } from "./notepad-input";

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
