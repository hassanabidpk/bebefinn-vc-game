import { afterEach, describe, expect, it, vi } from "vitest";
import { loadColoringDrawings, parseColoringDrawings, saveColoringDrawing } from "./coloring-store";

const stored = (drawings: unknown) => JSON.stringify({ version: 1, drawings });
afterEach(() => vi.unstubAllGlobals());

describe("saved coloring pictures", () => {
  it("restores each picture independently and rejects unknown regions and colors", () => {
    const result = parseColoringDrawings(stored({
      fish: { tail: "#FF5A5F", body: "#4DA6FF", head: "#FF5A5F", stripe: "bad" },
      turtle: { head: "#6BCB77" },
      unknown: { body: "#FF5A5F" },
    }));
    expect(result.fish).toEqual({ tail: "#FF5A5F", body: "#4DA6FF" });
    expect(result.turtle).toEqual({ head: "#6BCB77" });
    expect(result.unknown).toBeUndefined();
  });

  it("recovers from malformed or outdated data", () => {
    for (const raw of [null, "{", "null", "[]", stored(null), '{"version":2,"drawings":{}}']) {
      expect(parseColoringDrawings(raw)).toEqual({});
    }
    expect(parseColoringDrawings(stored({ fish: [], turtle: 42 })).fish).toEqual({});
  });

  it("keeps other pictures when saving or clearing one picture", () => {
    let raw = stored({ turtle: { head: "#6BCB77" } });
    vi.stubGlobal("window", { localStorage: {
      getItem: () => raw,
      setItem: (_key: string, value: string) => { raw = value; },
    } });
    saveColoringDrawing("fish", { tail: "#FF5A5F" });
    expect(loadColoringDrawings().fish).toEqual({ tail: "#FF5A5F" });
    saveColoringDrawing("fish", {});
    expect(loadColoringDrawings().fish).toEqual({});
    expect(loadColoringDrawings().turtle).toEqual({ head: "#6BCB77" });
  });

  it("continues when device storage is unavailable", () => {
    vi.stubGlobal("window", { get localStorage() { throw new Error("blocked"); } });
    expect(loadColoringDrawings()).toEqual({});
    expect(saveColoringDrawing("fish", { tail: "#FF5A5F" }).fish).toEqual({ tail: "#FF5A5F" });
  });
});
