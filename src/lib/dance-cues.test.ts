import { describe, expect, it } from "vitest";
import { DANCE_SONG } from "./dance-song";
import {
  buildDanceCues,
  cueAt,
  DANCE_MOVES,
  letterIndexAt,
  moveForLyric,
  parseLyriaLyrics,
} from "./dance-cues";

describe("parseLyriaLyrics", () => {
  it("turns the real Lyria output into timed sections and lines", () => {
    const sections = parseLyriaLyrics(DANCE_SONG.lyrics, DANCE_SONG.durationSec);
    expect(sections.map((s) => s.id)).toEqual(["B1", "C2", "B3", "C4", "D5"]);
    expect(sections.map((s) => [s.start, s.end])).toEqual([
      [10, 30],
      [30, 50],
      [50, 70],
      [70, 86],
      [86, DANCE_SONG.durationSec],
    ]);
    expect(sections[0].lines.map((l) => l.text)).toEqual([
      "A B C D E F G",
      "H I J K L M N O P",
      "Q R S T U V",
      "W X Y and Z",
    ]);
  });

  it("spreads lines evenly inside a section and honours explicit line times", () => {
    const [verse] = parseLyriaLyrics("[[B1]]\n[10.0:] one\n[:] two\n[:] three\n[:] four", 30);
    expect(verse.lines.map((l) => [l.start, l.end])).toEqual([
      [10, 15],
      [15, 20],
      [20, 25],
      [25, 30],
    ]);
    const [mixed] = parseLyriaLyrics("[[B1]]\n[0:] one\n[6.0:] two\n[:] three", 12);
    expect(mixed.lines.map((l) => [l.start, l.end])).toEqual([
      [0, 6],
      [6, 9],
      [9, 12],
    ]);
  });

  it("drops empty sections and ignores blank or malformed lines", () => {
    const sections = parseLyriaLyrics("[[A0]]\n\n[[B1]]\n[4.0:] hi\nstray text\n[[C2]]", 10);
    expect(sections).toHaveLength(1);
    expect(sections[0].lines).toEqual([{ text: "hi", start: 4, end: 10 }]);
  });

  it("treats a song with no timestamps as starting at zero", () => {
    const [only] = parseLyriaLyrics("[[B1]]\n[:] hello", 5);
    expect(only.start).toBe(0);
    expect(only.lines[0]).toEqual({ text: "hello", start: 0, end: 5 });
  });
});

describe("moveForLyric", () => {
  it("maps chorus keywords to moves", () => {
    expect(moveForLyric("Clap your hands", 0)).toBe("clap");
    expect(moveForLyric("stomp your feet", 0)).toBe("stomp");
    expect(moveForLyric("wiggle wiggle to the beat", 0)).toBe("wiggle");
    expect(moveForLyric("dance with me", 0)).toBe("wiggle");
  });

  it("round-robins the moves for plain letter lines", () => {
    const moves = [0, 1, 2, 3, 4].map((i) => moveForLyric("A B C", i));
    expect(moves).toEqual(["clap", "jump", "stomp", "wiggle", "clap"]);
    expect(DANCE_MOVES.map((m) => m.id)).toEqual(["clap", "jump", "stomp", "wiggle"]);
  });
});

describe("buildDanceCues", () => {
  const cues = buildDanceCues(parseLyriaLyrics(DANCE_SONG.lyrics, DANCE_SONG.durationSec));

  it("creates one cue per lyric line with letters only for letter lines", () => {
    expect(cues).toHaveLength(13);
    expect(cues[0]).toMatchObject({ start: 10, end: 15, move: "clap", letters: ["A", "B", "C", "D", "E", "F", "G"] });
    expect(cues[3].letters).toEqual(["W", "X", "Y", "Z"]);
    expect(cues[4]).toMatchObject({ start: 30, end: 40, letters: [] });
  });

  it("uses the chorus lyric to pick the move and cycles through all four moves", () => {
    expect(cues[4].move).toBe("wiggle");
    expect(cues[5].move).toBe("clap");
    expect(new Set(cues.map((c) => c.move))).toEqual(new Set(["clap", "jump", "stomp", "wiggle"]));
  });
});

describe("cueAt / letterIndexAt", () => {
  const cues = buildDanceCues(parseLyriaLyrics(DANCE_SONG.lyrics, DANCE_SONG.durationSec));

  it("finds the cue covering a time, inclusive start and exclusive end", () => {
    expect(cueAt(cues, 9.99)).toBe(-1);
    expect(cueAt(cues, 10)).toBe(0);
    expect(cueAt(cues, 14.999)).toBe(0);
    expect(cueAt(cues, 15)).toBe(1);
    expect(cueAt(cues, 88)).toBe(12);
    expect(cueAt(cues, 200)).toBe(-1);
  });

  it("sweeps the lit letter across the line", () => {
    expect(letterIndexAt(cues[0], 10)).toBe(0);
    expect(letterIndexAt(cues[0], 12.5)).toBe(3);
    expect(letterIndexAt(cues[0], 14.999)).toBe(6);
    expect(letterIndexAt(cues[4], 35)).toBe(-1);
  });
});
