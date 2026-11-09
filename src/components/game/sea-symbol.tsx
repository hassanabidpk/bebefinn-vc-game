import type { SeaSymbolId } from "@/lib/patterns-data";

/** Original vector friends: no downloads, emoji rendering differences, or paid assets. */
export function SeaSymbol({ symbol }: { symbol: SeaSymbolId }) {
  return <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className="sea-symbol">
    {symbol === "shell" ? <g stroke="#923d5a" strokeWidth="4" strokeLinecap="round">
      <path d="M50 83C40 85 4 53 9 33C12 20 25 17 33 23C39 7 57 7 64 22C80 13 95 25 93 40C91 59 65 85 50 83Z" fill="#ff9dba" />
      <path d="M50 77L29 30M50 77V22M50 77L74 30" fill="none" />
    </g> : symbol === "starfish" ? <g>
      <path d="M50 9L64 35L94 42L73 63L77 91L50 77L23 91L27 63L6 42L36 35Z" fill="#ffd852" stroke="#896311" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="40" cy="52" r="3" fill="#123c56"/><circle cx="60" cy="52" r="3" fill="#123c56"/>
      <path d="M42 64Q50 72 58 64" fill="none" stroke="#123c56" strokeWidth="3"/>
    </g> : symbol === "fish" ? <g>
      <path d="M28 42L8 23V77L28 60C47 90 90 81 93 51C86 17 47 15 28 42Z" fill="#ffab5a" stroke="#914716" strokeWidth="4" strokeLinejoin="round"/>
      <circle cx="75" cy="43" r="5" fill="#123c56"/><path d="M53 37Q39 50 53 64" fill="none" stroke="#914716" strokeWidth="4"/>
    </g> : <g stroke="#963c36" strokeWidth="4" strokeLinecap="round" fill="#ff9387">
      <path d="M25 58L8 42M23 68L7 69M75 58L92 42M77 68L94 69M30 46L19 29M70 46L81 29"/>
      <ellipse cx="50" cy="62" rx="30" ry="23"/><path d="M27 34C8 38 6 13 14 10L18 23L27 12Q37 26 27 34ZM73 34C92 38 94 13 86 10L82 23L73 12Q63 26 73 34Z"/>
      <path d="M39 43V32M61 43V32"/><circle cx="39" cy="30" r="5" fill="#123c56"/><circle cx="61" cy="30" r="5" fill="#123c56"/>
      <path d="M41 64Q50 73 59 64" fill="none"/>
    </g>}
  </svg>;
}
