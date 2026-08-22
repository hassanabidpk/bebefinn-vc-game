/**
 * Persistent sticker progress shared by every mini-game. Stored only in
 * localStorage on the child's device (no accounts, no network — see
 * AGENTS.md safety rules) and written through pure helpers so the merge
 * logic is unit-testable.
 */

export interface StickerProgress {
  version: 1;
  /** Animal friends collected (dance partners; formerly ride encounters). */
  rideAnimals: string[];
  /** Letters rescued in Ocean Letter Rescue. */
  rescueLetters: string[];
  /** Words completed in the Spelling game. */
  spellWords: string[];
}

export type StickerKind = "rideAnimals" | "rescueLetters" | "spellWords";

const STORAGE_KEY = "ocean-buddy-progress-v1";

export function emptyProgress(): StickerProgress {
  return { version: 1, rideAnimals: [], rescueLetters: [], spellWords: [] };
}

/** Add one sticker, keeping insertion order and ignoring duplicates. */
export function withSticker(
  progress: StickerProgress,
  kind: StickerKind,
  id: string
): StickerProgress {
  if (!id || progress[kind].includes(id)) return progress;
  return { ...progress, [kind]: [...progress[kind], id] };
}

export function countStickers(progress: StickerProgress): number {
  return progress.rideAnimals.length + progress.rescueLetters.length + progress.spellWords.length;
}

/** Parse a stored payload defensively — anything unexpected resets clean. */
export function parseProgress(raw: string | null): StickerProgress {
  if (!raw) return emptyProgress();
  try {
    const data = JSON.parse(raw) as Partial<StickerProgress>;
    if (data?.version !== 1) return emptyProgress();
    const list = (value: unknown) =>
      Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    return {
      version: 1,
      rideAnimals: list(data.rideAnimals),
      rescueLetters: list(data.rescueLetters),
      spellWords: list(data.spellWords),
    };
  } catch {
    return emptyProgress();
  }
}

export function loadProgress(): StickerProgress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    return parseProgress(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage can throw in private browsing — the game just won't persist.
    return emptyProgress();
  }
}

export function saveProgress(progress: StickerProgress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* best-effort persistence only */
  }
}

/** Load, add one sticker, save — returns the updated progress. */
export function earnSticker(kind: StickerKind, id: string): StickerProgress {
  const updated = withSticker(loadProgress(), kind, id);
  saveProgress(updated);
  return updated;
}
