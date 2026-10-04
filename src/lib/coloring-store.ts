import { COLORING_CRAYONS, COLORING_PAGES, type ColoringFills } from "./coloring-pages";

export type ColoringDrawings = Readonly<Record<string, ColoringFills>>;
const STORAGE_KEY = "ocean-buddy-coloring-v1";

/** Restore only known pictures, regions and crayons from device storage. */
export function parseColoringDrawings(raw: string | null): ColoringDrawings {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 ||
        !("drawings" in value) || !value.drawings || typeof value.drawings !== "object") return {};
    const drawings = value.drawings as Record<string, unknown>;
    const colors = new Set<string>(COLORING_CRAYONS.map((crayon) => crayon.hex));
    return Object.fromEntries(COLORING_PAGES.map((page) => {
      const stored = drawings[page.id];
      if (!stored || typeof stored !== "object" || Array.isArray(stored)) return [page.id, {}];
      const regions = stored as Record<string, unknown>;
      const fills = Object.fromEntries(page.regions.flatMap(({ id }) => {
        const color = regions[id];
        return typeof color === "string" && colors.has(color) ? [[id, color]] : [];
      }));
      return [page.id, fills];
    }));
  } catch {
    return {};
  }
}

export function loadColoringDrawings(): ColoringDrawings {
  try {
    return parseColoringDrawings(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}

export function saveColoringDrawing(pageId: string, fills: ColoringFills): ColoringDrawings {
  const drawings = { ...loadColoringDrawings(), [pageId]: fills };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, drawings }));
  } catch {
    // Private browsing or full storage must not interrupt play.
  }
  return drawings;
}
