"use client";

interface SpeakingBarsProps {
  active: boolean;
  color: string;
}

/** Three-bar equalizer that animates while SpeechSynthesis is talking. */
export function SpeakingBars({ active, color }: SpeakingBarsProps) {
  return (
    <span className="speak-bars" style={{ color, opacity: active ? 1 : 0.35 }}>
      <i />
      <i />
      <i />
    </span>
  );
}
