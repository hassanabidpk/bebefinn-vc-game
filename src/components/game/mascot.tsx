"use client";

interface MascotProps {
  size?: number;
  animation?: "idle" | "talking";
  onClick?: () => void;
}

/** BebeFinn mascot image with idle / talking animation. */
export function Mascot({ size = 280, animation = "idle", onClick }: MascotProps) {
  return (
    <div
      className={`mascot-anim ${animation}`}
      style={{ width: size, height: size, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/images/bebefinn.png" alt="BebeFinn" draggable={false} />
    </div>
  );
}
