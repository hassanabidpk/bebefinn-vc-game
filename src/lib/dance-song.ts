/**
 * The ABC Dance Party song. Generated once with Google Lyria 3 Pro by
 * `scripts/generate-music.ts` (paid, slow, non-deterministic — run it
 * deliberately, never at build time). The MP3 is committed so the game is
 * fully static and offline-capable, and `lyrics` is the exact text Lyria
 * returned: section markers `[[A0]]` plus `[seconds:] line` timestamps on
 * the first line of each section. `dance-cues.ts` turns it into cues.
 */
export interface DanceSong {
  src: string;
  durationSec: number;
  lyrics: string;
}

export const DANCE_SONG: DanceSong = {
  src: "/music/abc-dance.mp3",
  durationSec: 88.79,
  lyrics: `[[A0]]
[[B1]]
[10.0:] A B C D E F G
[:] H I J K L M N O P
[:] Q R S T U V
[:] W X Y and Z
[[C2]]
[30.0:] Now I know my A B C's, dance with me, my ocean buddies!
[:] Clap your hands and stomp your feet, wiggle wiggle to the beat!
[[B3]]
[50.0:] A B C D E F G
[:] H I J K L M N O P
[:] Q R S T U V
[:] W X Y and Z
[[C4]]
[70.0:] Now I know my A B C's, dance with me, my ocean buddies!
[:] Clap your hands and stomp your feet, wiggle wiggle to the beat!
[[D5]]
[86.0:] Yay!`,
};
