/**
 * Step-by-step "how to draw" tutorials for toddlers.
 *
 * Every path is designed for a 512x512 viewBox, stroked (never filled) with a
 * round-capped stroke of about 10 units. Steps are cumulative: the paths added
 * by step N are drawn on top of everything from steps 1..N-1, so the picture
 * grows the same way it would on paper — biggest shape first, face last.
 *
 * Circles/ellipses are written as two half arcs, e.g. a circle at (cx, cy) with
 * radius r is `M cx-r cy A r r 0 1 1 cx+r cy A r r 0 1 1 cx-r cy`.
 */

export interface DrawStep {
  /** SVG path d strings (viewBox 0 0 512 512) ADDED at this step; earlier steps stay visible (cumulative) */
  paths: string[];
  /** Toddler-simple spoken instruction, e.g. "Draw a big circle for the body!" */
  say: string;
}

export interface DrawAnimal {
  word: string;
  emoji: string;
  /** Main stroke color hex, bright and kid-friendly */
  color: string;
  steps: DrawStep[];
}

export const DRAW_ANIMALS: DrawAnimal[] = [
  {
    word: "Shark",
    emoji: "🦈",
    color: "#38BDF8",
    steps: [
      {
        paths: [
          // Torpedo body: nose at (70,256), rear tip at (392,256).
          "M 70 256 C 120 170 250 160 370 216 C 400 240 400 272 370 296 C 250 352 120 342 70 256 Z",
        ],
        say: "Draw a big pointy body!",
      },
      {
        paths: [
          // Dorsal fin: both feet sit on the body's top curve (148,193) and (234,181).
          "M 148 193 C 168 140 190 108 215 95 C 224 125 232 158 234 181",
        ],
        say: "Add a tall fin on top!",
      },
      {
        paths: [
          // Tail joins the rear curve at (387,235) and (387,277).
          "M 387 235 C 410 195 435 165 460 145 C 448 190 436 228 428 256 C 436 288 446 318 452 342 C 424 320 402 296 387 277",
        ],
        say: "Now a big swishy tail!",
      },
      {
        paths: [
          // Side fin hangs off the belly curve at (227,331) and (178,327).
          "M 227 331 C 205 372 175 396 140 402 C 148 372 160 345 178 327",
          "M 160 232 Q 152 264 162 296",
          "M 182 228 Q 174 262 184 298",
          "M 204 228 Q 196 262 206 298",
        ],
        say: "Little fin and three gills!",
      },
      {
        paths: [
          "M 116 235 A 14 14 0 1 1 144 235 A 14 14 0 1 1 116 235",
          "M 82 274 Q 118 310 162 294",
        ],
        say: "One eye and a big smile!",
      },
    ],
  },
  {
    word: "Whale",
    emoji: "🐋",
    color: "#3B82F6",
    steps: [
      {
        paths: [
          "M 92 268 C 92 186 176 138 272 146 C 356 153 398 206 396 258 C 394 320 322 358 224 358 C 142 358 92 322 92 268 Z",
        ],
        say: "Draw a huge round body!",
      },
      {
        paths: [
          // Flukes join the body at (394,235) and (392,279).
          "M 394 235 C 416 200 438 172 464 150 C 452 196 442 230 434 258 C 446 290 454 320 458 352 C 428 326 406 302 392 279",
        ],
        say: "Add two big tail wings!",
      },
      {
        paths: [
          // Flipper hangs from the belly at (326,340) and (279,354).
          "M 326 340 C 332 378 318 402 292 406 C 278 390 274 370 279 354",
        ],
        say: "Draw a flipper underneath!",
      },
      {
        paths: [
          // Three streams leave the blowhole at (200,148), each capped with a droplet.
          "M 200 148 C 190 118 172 98 152 84",
          "M 200 148 C 202 114 202 92 202 68",
          "M 200 148 C 214 118 234 100 254 88",
          "M 137 70 A 7 7 0 1 1 151 70 A 7 7 0 1 1 137 70",
          "M 195 52 A 7 7 0 1 1 209 52 A 7 7 0 1 1 195 52",
          "M 255 74 A 7 7 0 1 1 269 74 A 7 7 0 1 1 255 74",
        ],
        say: "Squirt water out the top!",
      },
      {
        paths: [
          "M 137 240 A 13 13 0 1 1 163 240 A 13 13 0 1 1 137 240",
          "M 104 290 C 130 330 180 342 226 330",
        ],
        say: "Big eye and a happy smile!",
      },
    ],
  },
  {
    word: "Mouse",
    emoji: "🐭",
    color: "#A78BFA",
    steps: [
      {
        paths: ["M 130 290 A 110 110 0 1 1 350 290 A 110 110 0 1 1 130 290"],
        say: "Draw one big round body!",
      },
      {
        paths: [
          // Ear centres sit 130 from the body centre, so r=52 ears overlap by 32.
          "M 88 206 A 52 52 0 1 1 192 206 A 52 52 0 1 1 88 206",
          "M 272 190 A 52 52 0 1 1 376 190 A 52 52 0 1 1 272 190",
        ],
        say: "Add two big round ears!",
      },
      {
        paths: [
          "M 114 206 A 26 26 0 1 1 166 206 A 26 26 0 1 1 114 206",
          "M 298 190 A 26 26 0 1 1 350 190 A 26 26 0 1 1 298 190",
        ],
        say: "Draw little circles inside the ears!",
      },
      {
        paths: [
          // Tail starts on the body edge at (343,328).
          "M 343 328 C 400 350 440 330 448 288 C 452 256 428 240 412 252",
        ],
        say: "Curl a long skinny tail!",
      },
      {
        paths: [
          "M 191 286 A 13 13 0 1 1 217 286 A 13 13 0 1 1 191 286",
          "M 267 286 A 13 13 0 1 1 293 286 A 13 13 0 1 1 267 286",
          "M 230 328 A 12 12 0 1 1 254 328 A 12 12 0 1 1 230 328",
          "M 210 352 Q 242 380 274 352",
        ],
        say: "Two eyes, a nose, a smile!",
      },
      {
        paths: [
          // Kept above the smile (y>=352) and clear of the eyes (y<=299).
          "M 220 322 C 188 314 158 306 130 296",
          "M 218 338 C 186 340 156 346 130 354",
          "M 264 322 C 296 314 326 306 354 296",
          "M 266 338 C 298 340 328 346 354 354",
        ],
        say: "Add wiggly whiskers!",
      },
    ],
  },
  {
    word: "Rabbit",
    emoji: "🐰",
    color: "#F472B6",
    steps: [
      {
        paths: ["M 156 330 A 94 94 0 1 1 344 330 A 94 94 0 1 1 156 330"],
        say: "Draw a big round tummy!",
      },
      {
        paths: ["M 180 222 A 70 70 0 1 1 320 222 A 70 70 0 1 1 180 222"],
        say: "Put a round head on top!",
      },
      {
        paths: [
          // Ear feet sit inside the head circle and meet at its top (250,150).
          "M 224 164 C 198 118 194 82 210 70 C 230 60 248 96 250 150",
          "M 276 164 C 302 118 306 82 290 70 C 270 60 252 96 250 150",
        ],
        say: "Draw two long tall ears!",
      },
      {
        paths: ["M 107 370 A 34 34 0 1 1 175 370 A 34 34 0 1 1 107 370"],
        say: "Add a fluffy round tail!",
      },
      {
        paths: [
          "M 172 424 A 34 22 0 1 1 240 424 A 34 22 0 1 1 172 424",
          "M 260 424 A 34 22 0 1 1 328 424 A 34 22 0 1 1 260 424",
        ],
        say: "Two hoppy feet at the bottom!",
      },
      {
        paths: [
          "M 210 212 A 12 12 0 1 1 234 212 A 12 12 0 1 1 210 212",
          "M 266 212 A 12 12 0 1 1 290 212 A 12 12 0 1 1 266 212",
          "M 240 248 A 10 10 0 1 1 260 248 A 10 10 0 1 1 240 248",
          "M 250 258 Q 232 280 214 262",
          "M 250 258 Q 268 280 286 262",
        ],
        say: "Sweet eyes and a bunny smile!",
      },
    ],
  },
  {
    word: "Lion",
    emoji: "🦁",
    color: "#FBBF24",
    steps: [
      {
        paths: ["M 160 268 A 96 96 0 1 1 352 268 A 96 96 0 1 1 160 268"],
        say: "Draw a big round face!",
      },
      {
        paths: [
          // 12 petals: ends on r=100, quadratic controls on r=200 (petal tips land at r≈148).
          "M 356 268 Q 449 216 343 218 Q 397 127 306 181 Q 308 75 256 168 Q 204 75 206 181 Q 115 127 169 218 Q 63 216 156 268 Q 63 320 169 318 Q 115 409 206 355 Q 204 461 256 368 Q 308 461 306 355 Q 397 409 343 318 Q 449 320 356 268 Z",
        ],
        say: "Draw fluffy petals all around!",
      },
      {
        paths: [
          "M 166 194 A 28 28 0 1 1 222 194 A 28 28 0 1 1 166 194",
          "M 290 194 A 28 28 0 1 1 346 194 A 28 28 0 1 1 290 194",
        ],
        say: "Two little ears pop out!",
      },
      {
        paths: [
          "M 198 300 A 32 26 0 1 1 262 300 A 32 26 0 1 1 198 300",
          "M 250 300 A 32 26 0 1 1 314 300 A 32 26 0 1 1 250 300",
        ],
        say: "Add two puffy cheeks!",
      },
      {
        paths: [
          "M 208 246 A 12 12 0 1 1 232 246 A 12 12 0 1 1 208 246",
          "M 280 246 A 12 12 0 1 1 304 246 A 12 12 0 1 1 280 246",
          "M 240 272 Q 256 262 272 272 Q 256 292 240 272 Z",
          "M 256 288 Q 240 312 222 296",
          "M 256 288 Q 272 312 290 296",
          // Whisker tips stay inside the r=96 face circle so they miss the mane.
          "M 200 294 L 170 286",
          "M 200 306 L 170 312",
          "M 312 294 L 342 286",
          "M 312 306 L 342 312",
        ],
        say: "Eyes, nose, and a big roar!",
      },
    ],
  },
  {
    word: "Tiger",
    emoji: "🐯",
    color: "#FB923C",
    steps: [
      {
        paths: ["M 138 272 A 118 118 0 1 1 374 272 A 118 118 0 1 1 138 272"],
        say: "Draw a big round head!",
      },
      {
        paths: [
          // Ear centres sit exactly on the head circle, so they half-overlap.
          "M 148 175 A 40 40 0 1 1 228 175 A 40 40 0 1 1 148 175",
          "M 284 175 A 40 40 0 1 1 364 175 A 40 40 0 1 1 284 175",
        ],
        say: "Two round ears on top!",
      },
      {
        paths: [
          "M 168 175 A 20 20 0 1 1 208 175 A 20 20 0 1 1 168 175",
          "M 304 175 A 20 20 0 1 1 344 175 A 20 20 0 1 1 304 175",
        ],
        say: "Little circles inside each ear!",
      },
      {
        paths: [
          "M 226 168 Q 236 200 226 226",
          "M 256 158 Q 258 194 256 222",
          "M 286 168 Q 276 200 286 226",
          "M 150 250 L 196 258",
          "M 148 286 L 194 288",
          "M 362 250 L 316 258",
          "M 364 286 L 318 288",
        ],
        say: "Now draw stripey stripes!",
      },
      {
        paths: [
          "M 202 316 A 34 28 0 1 1 270 316 A 34 28 0 1 1 202 316",
          "M 242 316 A 34 28 0 1 1 310 316 A 34 28 0 1 1 242 316",
        ],
        say: "Add two round cheeks!",
      },
      {
        paths: [
          "M 198 264 A 14 14 0 1 1 226 264 A 14 14 0 1 1 198 264",
          "M 286 264 A 14 14 0 1 1 314 264 A 14 14 0 1 1 286 264",
          "M 238 296 Q 256 286 274 296 Q 256 314 238 296 Z",
          "M 256 310 Q 238 336 218 318",
          "M 256 310 Q 274 336 294 318",
        ],
        say: "Big eyes and a growly smile!",
      },
    ],
  },
  {
    word: "Eagle",
    emoji: "🦅",
    color: "#B45309",
    steps: [
      {
        paths: ["M 194 300 A 62 96 0 1 1 318 300 A 62 96 0 1 1 194 300"],
        say: "Draw a tall egg body!",
      },
      {
        paths: ["M 194 180 A 62 62 0 1 1 318 180 A 62 62 0 1 1 194 180"],
        say: "Put a round head on top!",
      },
      {
        paths: [
          // Wings start and end on the body oval, tips reach out to x=56 and x=456.
          "M 208 246 C 158 204 100 194 56 214 C 76 250 96 268 118 276 C 106 300 108 316 122 328 C 152 336 184 336 206 324",
          "M 304 246 C 354 204 412 194 456 214 C 436 250 416 268 394 276 C 406 300 404 316 390 328 C 360 336 328 336 306 324",
        ],
        say: "Stretch out two big wings!",
      },
      {
        paths: ["M 224 380 L 208 448 L 256 434 L 304 448 L 288 380"],
        say: "Add pointy tail feathers!",
      },
      {
        paths: ["M 228 198 L 284 198 L 260 244 Q 252 254 242 244 Z"],
        say: "Draw a hooked yellow beak!",
      },
      {
        paths: [
          "M 215 166 A 13 13 0 1 1 241 166 A 13 13 0 1 1 215 166",
          "M 271 166 A 13 13 0 1 1 297 166 A 13 13 0 1 1 271 166",
          "M 214 148 L 240 154",
          "M 298 148 L 272 154",
        ],
        say: "Two brave eagle eyes!",
      },
    ],
  },
  {
    word: "Fish",
    emoji: "🐠",
    color: "#22D3EE",
    steps: [
      {
        paths: ["M 110 270 A 130 92 0 1 1 370 270 A 130 92 0 1 1 110 270"],
        say: "Draw a big oval body!",
      },
      {
        paths: ["M 370 270 L 456 200 L 456 340 Z"],
        say: "Add a triangle tail!",
      },
      {
        paths: [
          // Fin feet sit on the oval at (196,184)/(305,190) and (196,356)/(285,356).
          "M 196 184 Q 220 118 258 122 Q 288 128 305 190",
          "M 196 356 Q 216 404 244 406 Q 272 404 285 356",
        ],
        say: "Fins on top and bottom!",
      },
      {
        paths: [
          "M 152 214 Q 138 270 152 326",
          "M 214 300 Q 252 322 276 314 Q 250 346 212 326 Z",
        ],
        say: "Draw a gill and side fin!",
      },
      {
        paths: [
          "M 80 150 A 16 16 0 1 1 112 150 A 16 16 0 1 1 80 150",
          "M 128 104 A 12 12 0 1 1 152 104 A 12 12 0 1 1 128 104",
          "M 167 68 A 9 9 0 1 1 185 68 A 9 9 0 1 1 167 68",
        ],
        say: "Blow three little bubbles!",
      },
      {
        paths: [
          "M 145 246 A 15 15 0 1 1 175 246 A 15 15 0 1 1 145 246",
          "M 124 288 Q 146 316 176 302",
        ],
        say: "One eye and a fishy smile!",
      },
    ],
  },
  {
    word: "Ant",
    emoji: "🐜",
    color: "#EF4444",
    steps: [
      {
        paths: ["M 296 256 A 76 76 0 1 1 448 256 A 76 76 0 1 1 296 256"],
        say: "Draw a big circle for the tummy!",
      },
      {
        // r=52 at (250,256): overlaps the r=76 abdomen and the r=54 head by 6 each.
        paths: ["M 198 256 A 52 52 0 1 1 302 256 A 52 52 0 1 1 198 256"],
        say: "A middle circle next to it!",
      },
      {
        paths: ["M 96 256 A 54 54 0 1 1 204 256 A 54 54 0 1 1 96 256"],
        say: "Now a circle for the head!",
      },
      {
        paths: [
          // All six legs start on the middle circle (centre 250,256 r48).
          "M 214 282 C 184 306 158 330 136 358",
          "M 226 296 C 200 330 180 358 164 390",
          "M 240 304 C 226 342 216 372 210 406",
          "M 260 304 C 274 342 284 372 290 406",
          "M 274 296 C 300 330 320 358 336 390",
          "M 286 282 C 316 306 342 330 364 358",
        ],
        say: "Count six busy legs!",
      },
      {
        paths: [
          "M 141 203 C 132 162 116 126 96 96",
          "M 115 215 C 92 184 72 162 56 146",
        ],
        say: "Two bendy antennae up high!",
      },
      {
        paths: [
          "M 117 242 A 11 11 0 1 1 139 242 A 11 11 0 1 1 117 242",
          "M 159 242 A 11 11 0 1 1 181 242 A 11 11 0 1 1 159 242",
          "M 124 278 Q 150 300 176 278",
        ],
        say: "Tiny eyes and a tiny smile!",
      },
    ],
  },
  {
    word: "Turtle",
    emoji: "🐢",
    color: "#34D399",
    steps: [
      {
        paths: [
          // Dome of radius 132 about (230,320); 0.5523*132 = 72.9 control offset.
          "M 98 320 C 98 247 157 188 230 188 C 303 188 362 247 362 320 Z",
        ],
        say: "Draw a big dome shell!",
      },
      {
        paths: [
          "M 122 320 C 122 260 170 212 230 212 C 290 212 338 260 338 320",
          "M 230 212 L 230 188",
          "M 306 244 L 323 227",
          "M 154 244 L 137 227",
          "M 334 292 L 359 284",
          "M 126 292 L 101 284",
        ],
        say: "Draw pretty shell patterns!",
      },
      {
        paths: ["M 354 288 A 46 46 0 1 1 446 288 A 46 46 0 1 1 354 288"],
        say: "Poke out a round head!",
      },
      {
        paths: [
          // Each foot's top touches the shell's flat bottom line at y=320.
          "M 108 348 A 32 28 0 1 1 172 348 A 32 28 0 1 1 108 348",
          "M 184 348 A 28 28 0 1 1 240 348 A 28 28 0 1 1 184 348",
          "M 252 348 A 28 28 0 1 1 308 348 A 28 28 0 1 1 252 348",
          "M 314 344 A 30 28 0 1 1 374 344 A 30 28 0 1 1 314 344",
        ],
        say: "Add four little feet!",
      },
      {
        paths: ["M 100 300 L 56 322 L 100 330 Z"],
        say: "A pointy tail at the back!",
      },
      {
        paths: [
          "M 383 272 A 11 11 0 1 1 405 272 A 11 11 0 1 1 383 272",
          "M 417 272 A 11 11 0 1 1 439 272 A 11 11 0 1 1 417 272",
          "M 386 306 Q 408 324 430 306",
        ],
        say: "Happy eyes and a slow smile!",
      },
    ],
  },
];
