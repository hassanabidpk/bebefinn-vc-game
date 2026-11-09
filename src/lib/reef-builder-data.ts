import type { SeaSymbolId } from "./patterns-data";
export type ReefTargetId = "above" | "below" | "inside" | "beside" | "water";
export const REEF_TARGETS: Record<ReefTargetId, { x: number; y: number }> = {
  above: { x: 38, y: 16 }, below: { x: 38, y: 82 }, inside: { x: 38, y: 49 },
  beside: { x: 84, y: 65 }, water: { x: 78, y: 22 },
};
export const REEF_SCENES = [
  { id: "sunny", name: "Sunny Reef", color: "#d9f6ff", icon: "☀️" },
  { id: "cove", name: "Shell Cove", color: "#fce9f2", icon: "🐚" },
  { id: "kelp", name: "Kelp Garden", color: "#d9fae7", icon: "🌿" },
] as const;
export interface ReefStep {
  symbol: SeaSymbolId; target: ReefTargetId; options: ReefTargetId[]; prompt: string;
}
export const REEF_STEPS: readonly ReefStep[] = [
  { symbol: "fish", target: "above", options: ["above", "below"], prompt: "Put the fish above the rock." },
  { symbol: "starfish", target: "below", options: ["below", "beside"], prompt: "Put the starfish below the rock." },
  { symbol: "crab", target: "inside", options: ["inside", "beside", "water"], prompt: "Put the crab inside the cave." },
  { symbol: "shell", target: "beside", options: ["beside", "water"], prompt: "Put the shell beside the seaweed." },
];
export interface ReefProgress { version: 1; scene: number; placed: number; earned: string[] }
export function emptyReef(): ReefProgress { return { version: 1, scene: 0, placed: 0, earned: [] }; }
export function placeReef(p: ReefProgress, target: ReefTargetId): ReefProgress {
  if (p.placed >= REEF_STEPS.length || REEF_STEPS[p.placed].target !== target) return p;
  const placed = p.placed + 1;
  const id = REEF_SCENES[p.scene].id;
  return { ...p, placed, earned: placed === 4 ? [...new Set([...p.earned, id])] : p.earned };
}
export function visitReef(p: ReefProgress, scene: number): ReefProgress {
  if (!REEF_SCENES[scene] || (scene > 0 && !p.earned.includes(REEF_SCENES[scene - 1].id))) return p;
  return { ...p, scene, placed: 0 };
}
export function parseReef(raw: string | null): ReefProgress {
  try {
    const p = JSON.parse(raw ?? "null") as ReefProgress | null;
    if (!p || p.version !== 1 || !Number.isInteger(p.scene) || !REEF_SCENES[p.scene] ||
      !Number.isInteger(p.placed) || p.placed < 0 || p.placed > 4 || !Array.isArray(p.earned) ||
      !p.earned.every(id => REEF_SCENES.some(s => s.id === id))) return emptyReef();
    const earned = REEF_SCENES.filter(s => p.earned.includes(s.id)).map(s => s.id);
    if (earned.some((id, index) => id !== REEF_SCENES[index].id)) return emptyReef();
    // A later scene can only be visited after all previous scenes were earned.
    if (REEF_SCENES.slice(0, p.scene).some(s => !earned.includes(s.id))) return emptyReef();
    if (p.placed === 4 && !earned.includes(REEF_SCENES[p.scene].id)) return emptyReef();
    return { version: 1, scene: p.scene, placed: p.placed, earned };
  } catch { return emptyReef(); }
}
/** Client-space hit testing; stable option order resolves exact-distance ties. */
export function reefDropTarget(point: { x: number; y: number }, targets: readonly {
  id: ReefTargetId; left: number; top: number; width: number; height: number;
}[]): ReefTargetId | null {
  let result: ReefTargetId | null = null; let distance = Infinity;
  for (const t of targets) {
    const dx = point.x - t.left - t.width / 2; const dy = point.y - t.top - t.height / 2;
    if (Math.abs(dx) > t.width * .6 || Math.abs(dy) > t.height * .6) continue;
    const d = Math.hypot(dx, dy);
    if (d < distance) { result = t.id; distance = d; }
  }
  return result;
}
