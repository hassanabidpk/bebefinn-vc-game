const RAPID_TAP_WINDOW_MS = 1200;
const RAPID_TAP_LIMIT = 4;
const INPUT_PAUSE_MS = 1200;
const REMINDER_COOLDOWN_MS = 5000;
const MIN_ACCEPTED_INTERVAL_MS = 220;

export interface NotepadTapState {
  recentPresses: number[];
  lastAcceptedAt: number;
  blockedUntil: number;
  reminderCooldownUntil: number;
}

export type NotepadTapDecision = "accept" | "ignore" | "remind";

export function createNotepadTapState(): NotepadTapState {
  return {
    recentPresses: [],
    lastAcceptedAt: Number.NEGATIVE_INFINITY,
    blockedUntil: 0,
    reminderCooldownUntil: 0,
  };
}

export function registerNotepadTap(state: NotepadTapState, now: number): NotepadTapDecision {
  state.recentPresses = state.recentPresses.filter(
    (pressedAt) => now - pressedAt <= RAPID_TAP_WINDOW_MS
  );
  state.recentPresses.push(now);

  if (state.recentPresses.length >= RAPID_TAP_LIMIT) {
    state.recentPresses = [];
    state.blockedUntil = now + INPUT_PAUSE_MS;
    if (now >= state.reminderCooldownUntil) {
      state.reminderCooldownUntil = now + REMINDER_COOLDOWN_MS;
      return "remind";
    }
    return "ignore";
  }

  if (now < state.blockedUntil || now - state.lastAcceptedAt < MIN_ACCEPTED_INTERVAL_MS) {
    return "ignore";
  }

  state.lastAcceptedAt = now;
  return "accept";
}
