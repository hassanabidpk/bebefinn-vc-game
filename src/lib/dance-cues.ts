/**
 * Pure timing logic for ABC Dance Party. Lyria only timestamps the first
 * line of each section, so sections run until the next section starts and
 * lines are spread evenly inside them — deliberately approximate, no audio
 * analysis, good enough for a toddler tapping along.
 */

export type DanceMove = "clap" | "jump" | "spin" | "wiggle";

export interface DanceMoveSpec {
  id: DanceMove;
  emoji: string;
  label: string;
}

export const DANCE_MOVES: DanceMoveSpec[] = [
  { id: "clap", emoji: "👏", label: "Clap" },
  { id: "jump", emoji: "🦘", label: "Jump" },
  { id: "spin", emoji: "🔄", label: "Spin" },
  { id: "wiggle", emoji: "🐙", label: "Wiggle" },
];

export interface LyricLine {
  text: string;
  start: number;
  end: number;
}

export interface LyricSection {
  id: string;
  start: number;
  end: number;
  lines: LyricLine[];
}

export interface DanceCue {
  start: number;
  end: number;
  text: string;
  /** Single letters sung in this line; empty for chorus lines. */
  letters: string[];
  move: DanceMove;
}

const SECTION_RE = /^\[\[([^\]]+)\]\]$/;
const LINE_RE = /^\[(\d*(?:\.\d+)?):\]\s*(.*)$/;

interface RawLine {
  text: string;
  start: number | null;
}

export function parseLyriaLyrics(lyrics: string, durationSec: number): LyricSection[] {
  const raw: Array<{ id: string; lines: RawLine[] }> = [];
  for (const line of lyrics.split(/\r?\n/)) {
    const trimmed = line.trim();
    const section = SECTION_RE.exec(trimmed);
    if (section) {
      raw.push({ id: section[1], lines: [] });
      continue;
    }
    const lyric = LINE_RE.exec(trimmed);
    if (!lyric || !raw.length || !lyric[2]) continue;
    raw[raw.length - 1].lines.push({
      text: lyric[2],
      start: lyric[1] ? Number(lyric[1]) : null,
    });
  }

  const kept = raw.filter((section) => section.lines.length > 0);
  const sections: LyricSection[] = [];
  kept.forEach((section, index) => {
    const explicit = section.lines.find((line) => line.start !== null)?.start;
    const start = explicit ?? (index === 0 ? 0 : sections[index - 1].end);
    const next = kept[index + 1]?.lines.find((line) => line.start !== null)?.start;
    const end = next ?? durationSec;
    sections.push({ id: section.id, start, end, lines: spreadLines(section.lines, start, end) });
  });
  // Sections without an explicit start were given the previous end above;
  // fix any section whose end came out before its start (degenerate input).
  return sections.map((section) => ({ ...section, end: Math.max(section.start, section.end) }));
}

/** Lines with explicit times keep them; the gaps in between are split evenly. */
function spreadLines(lines: RawLine[], start: number, end: number): LyricLine[] {
  const starts: number[] = new Array(lines.length);
  let anchorIndex = 0;
  let anchorTime = start;
  for (let i = 0; i <= lines.length; i += 1) {
    const explicit = i < lines.length ? lines[i].start : end;
    if (explicit === null || explicit === undefined) continue;
    const span = i - anchorIndex;
    for (let j = anchorIndex; j < i; j += 1) {
      starts[j] = anchorTime + ((explicit - anchorTime) * (j - anchorIndex)) / span;
    }
    anchorIndex = i;
    anchorTime = explicit;
  }
  return lines.map((line, i) => ({
    text: line.text,
    start: starts[i],
    end: i + 1 < lines.length ? starts[i + 1] : end,
  }));
}

const KEYWORD_MOVES: Array<[RegExp, DanceMove]> = [
  [/\bclap/i, "clap"],
  [/\b(stomp|jump|hop|feet)/i, "jump"],
  [/\bwiggle/i, "wiggle"],
  [/\b(spin|dance|turn)/i, "spin"],
];

export function moveForLyric(text: string, lineIndex: number): DanceMove {
  for (const [pattern, move] of KEYWORD_MOVES) {
    if (pattern.test(text)) return move;
  }
  return DANCE_MOVES[lineIndex % DANCE_MOVES.length].id;
}

export function buildDanceCues(sections: LyricSection[]): DanceCue[] {
  const cues: DanceCue[] = [];
  for (const section of sections) {
    for (const line of section.lines) {
      const tokens = line.text.split(/\s+/);
      const letters = tokens.filter((token) => /^[A-Z]$/.test(token));
      // Only a pure letter line (letters plus filler like "and") shows chips.
      const isLetterLine = letters.length > 0 && tokens.every((t) => /^[A-Z]$/.test(t) || /^(and|&)$/i.test(t));
      cues.push({
        start: line.start,
        end: line.end,
        text: line.text,
        letters: isLetterLine ? letters : [],
        move: moveForLyric(line.text, cues.length),
      });
    }
  }
  return cues;
}

/** Index of the cue covering `t`, or -1 (before the first cue / after the last). */
export function cueAt(cues: DanceCue[], t: number): number {
  return cues.findIndex((cue) => t >= cue.start && t < cue.end);
}

/** Which letter chip should be lit at `t`; -1 when the cue has no letters. */
export function letterIndexAt(cue: DanceCue, t: number): number {
  if (!cue.letters.length) return -1;
  const span = cue.end - cue.start;
  if (span <= 0) return 0;
  const progress = Math.min(Math.max((t - cue.start) / span, 0), 0.999999);
  return Math.floor(progress * cue.letters.length);
}
