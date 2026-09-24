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

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// A–E, A–J, A–O, A–T. No booster at Y — the Z applause is one letter away.
const BOOSTER_RUNS = [5, 10, 15, 20];

export type AlphabetMilestone = "booster" | "complete" | null;

export const NOTEPAD_ALPHABET_COMPLETE_PHRASE = "Hooray! You wrote the whole alphabet!";

/** Length of the A, B, C… run that ends at the last character (0 if none). */
export function getAlphabetRunLength(chars: readonly string[]): number {
  let run = 0;
  for (const ch of chars) {
    if (ch === ALPHABET[run]) run += 1;
    else run = ch === "A" ? 1 : 0;
  }
  return run;
}

export function getAlphabetMilestone(run: number): AlphabetMilestone {
  if (run === ALPHABET.length) return "complete";
  if (BOOSTER_RUNS.includes(run)) return "booster";
  return null;
}

export function getNotepadBoosterPhrase(run: number) {
  return `A to ${ALPHABET[run - 1]}! Keep going!`;
}

export function getNotepadBoosterPhrases() {
  return BOOSTER_RUNS.map(getNotepadBoosterPhrase);
}
