/**
 * Step-by-step "how to draw" tutorials for toddlers.
 *
 * Every path is designed for a 512x512 viewBox, stroked (never filled) with a
 * round-capped stroke of about 10 units. Steps are cumulative: the paths added
 * by step N are drawn on top of everything from steps 1..N-1, so the picture
 * grows the same way it would on paper — biggest shape first, face last.
 *
 * Circles/ellipses are written as two half arcs, e.g. a circle at (cx, cy) with
 * radius r is `M cx-r cy A r r 0 1 1 cx+r cy A r r 0 1 1 cx-r cy`; an ellipse
 * swaps in `A rx ry`. Every attachment point (a fin on a belly, an ear on a
 * head, a leg on a body) is computed to land ON its parent curve so nothing
 * floats, and all geometry stays inside 40..472 so round caps never clip.
 */

export interface DrawStep {
  /** SVG path d strings (viewBox 0 0 512 512) ADDED at this step; earlier steps stay visible (cumulative) */
  paths: string[];
  /** Toddler-simple spoken instruction, e.g. "Draw a big circle for the body!" */
  say: string;
  /** Decoration pass — skipped in Simple mode. */
  detail?: boolean;
}

export interface DrawAnimal {
  word: string;
  emoji: string;
  /** Main stroke color hex, bright and kid-friendly */
  color: string;
  steps: DrawStep[];
}

export type DrawLevel = "simple" | "medium";

/** Steps for the chosen level. Simple drops steps flagged `detail`. */
export function getDrawSteps(animal: DrawAnimal, level: DrawLevel): DrawStep[] {
  if (level === "medium") return animal.steps;
  return animal.steps.filter((step) => !step.detail);
}

export const DRAW_ANIMALS: DrawAnimal[] = [
  {
    word: "Shark",
    emoji: "🦈",
    color: "#38BDF8",
    steps: [
      {
        paths: [
          // Cone head: the back slopes into the snout at (46,238) at about 20°
          // while the throat climbs at about 60°, so the nose reads as a shark
          // wedge instead of a symmetric fish lens.
          "M 46 238 C 130 206 206 160 288 166 C 346 172 386 206 408 246 C 412 254 412 260 408 268 C 380 302 318 330 242 334 C 166 338 100 308 70 282 C 62 276 52 254 46 238 Z",
        ],
        say: "Draw a big pointy body!",
      },
      {
        paths: [
          // Tall raked dorsal fin: feet on the back at (149,195) and (235,169).
          "M 149 195 C 158 148 176 108 206 74 C 210 116 222 146 235 169",
        ],
        say: "Add a tall fin on top!",
      },
      {
        paths: [
          // Lunate tail: tall upper lobe, deep notch at (430,250), short lower lobe.
          "M 408 246 C 424 200 440 152 462 110 C 468 156 456 214 430 250 C 448 290 456 322 452 356 C 424 334 410 300 408 268",
        ],
        say: "Now a big swishy tail!",
      },
      {
        paths: [
          // Pectoral fin sweeps back from the belly at (109,307) and (167,327).
          "M 109 307 C 124 346 152 384 190 412 C 184 382 176 350 167 327",
        ],
        say: "Draw a side fin below!",
        detail: true,
      },
      {
        paths: [
          "M 138 222 Q 130 254 140 284",
          "M 158 212 Q 150 246 160 278",
          "M 178 202 Q 170 238 180 272",
          "M 198 194 Q 190 230 200 266",
          "M 218 188 Q 210 226 220 262",
        ],
        say: "Five little gill lines!",
        detail: true,
      },
      {
        paths: [
          "M 91 244 A 13 13 0 1 1 117 244 A 13 13 0 1 1 91 244",
          // Underslung mouth: tucked just inside the throat curve.
          "M 60 254 C 88 286 130 300 170 290",
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
          // Huge blunt head at the left tapering to a slim tail stock at x=392.
          "M 58 258 C 58 190 122 148 210 148 C 300 148 366 190 392 236 C 398 246 398 254 392 264 C 360 314 288 348 202 348 C 118 348 58 320 58 258 Z",
        ],
        say: "Draw a huge round body!",
      },
      {
        paths: [
          // Wide flukes join the tail stock at (392,238) and (392,262).
          "M 392 238 C 412 206 438 176 468 150 C 452 190 438 222 428 252 C 442 288 454 322 464 364 C 432 336 408 300 392 262",
        ],
        say: "Add two big tail wings!",
      },
      {
        paths: [
          // Paddle flipper hangs from the belly at (293,334) and (256,343).
          "M 293 334 C 288 372 262 404 220 418 C 222 390 236 362 256 343",
        ],
        say: "Draw a flipper underneath!",
      },
      {
        paths: [
          "M 295 162 C 306 140 318 128 332 122 C 336 142 336 164 334 180",
          "M 100 308 C 156 334 244 336 314 308",
        ],
        say: "Tummy line and a back fin!",
        detail: true,
      },
      {
        paths: [
          // A five-stream fan of spray out of the blowhole at (170,150).
          "M 170 150 C 150 126 130 110 108 98",
          "M 170 150 C 158 120 148 98 138 74",
          "M 170 150 C 170 118 170 94 172 68",
          "M 170 150 C 184 120 198 98 214 78",
          "M 170 150 C 194 126 216 112 240 100",
          "M 100 92 A 8 8 0 1 1 116 92 A 8 8 0 1 1 100 92",
          "M 164 58 A 8 8 0 1 1 180 58 A 8 8 0 1 1 164 58",
          "M 232 96 A 8 8 0 1 1 248 96 A 8 8 0 1 1 232 96",
        ],
        say: "Squirt water out the top!",
        detail: true,
      },
      {
        paths: [
          "M 112 240 A 13 13 0 1 1 138 240 A 13 13 0 1 1 112 240",
          "M 60 272 C 108 300 172 306 230 290",
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
        paths: ["M 216 300 A 100 86 0 1 1 416 300 A 100 86 0 1 1 216 300"],
        say: "Draw a big round tummy!",
      },
      {
        paths: [
          "M 100 262 A 72 72 0 1 1 244 262 A 72 72 0 1 1 100 262",
          // Snout cone tapers off the head circle at (104,240) and (111,300).
          "M 104 240 C 88 244 76 254 70 270 C 82 288 96 296 111 300",
        ],
        say: "Add a head and pointy nose!",
      },
      {
        paths: [
          // Ear centres sit 88 from the head centre, so each ear keeps two
          // thirds of itself above the head and the pair never touch.
          "M 91 182 A 44 44 0 1 1 179 182 A 44 44 0 1 1 91 182",
          "M 191 195 A 38 38 0 1 1 267 195 A 38 38 0 1 1 191 195",
          "M 111 182 A 24 24 0 1 1 159 182 A 24 24 0 1 1 111 182",
          "M 209 195 A 20 20 0 1 1 249 195 A 20 20 0 1 1 209 195",
        ],
        say: "Two big round ears!",
      },
      {
        paths: ["M 412 320 C 452 344 470 312 462 274 C 456 248 434 244 424 258"],
        say: "Curl a long skinny tail!",
        detail: true,
      },
      {
        paths: [
          // Each paw straddles the belly curve, with clear gaps between them.
          "M 204 348 A 28 20 0 1 1 260 348 A 28 20 0 1 1 204 348",
          "M 274 382 A 26 20 0 1 1 326 382 A 26 20 0 1 1 274 382",
          "M 344 372 A 28 20 0 1 1 400 372 A 28 20 0 1 1 344 372",
        ],
        say: "Add three tiny paws!",
        detail: true,
      },
      {
        paths: [
          "M 128 268 A 12 12 0 1 1 152 268 A 12 12 0 1 1 128 268",
          "M 188 258 A 12 12 0 1 1 212 258 A 12 12 0 1 1 188 258",
          "M 67 270 A 9 9 0 1 1 85 270 A 9 9 0 1 1 67 270",
          "M 90 288 Q 112 302 134 292",
          "M 78 258 C 68 246 62 236 58 224",
          "M 72 270 C 64 268 58 266 50 264",
          "M 78 284 C 68 292 62 302 58 314",
        ],
        say: "Eyes, nose, and wiggly whiskers!",
      },
    ],
  },
  {
    word: "Rabbit",
    emoji: "🐰",
    color: "#F472B6",
    steps: [
      {
        paths: ["M 150 326 A 100 94 0 1 1 350 326 A 100 94 0 1 1 150 326"],
        say: "Draw a big round tummy!",
      },
      {
        paths: ["M 178 214 A 72 72 0 1 1 322 214 A 72 72 0 1 1 178 214"],
        say: "Put a round head on top!",
      },
      {
        paths: [
          // Ear feet straddle the head circle and meet near its crown.
          "M 214 154 C 190 112 178 74 192 56 C 210 44 232 88 242 148",
          "M 286 154 C 310 112 322 74 308 56 C 290 44 268 88 258 148",
          "M 210 146 C 198 116 192 90 200 74",
          "M 290 146 C 302 116 308 90 300 74",
        ],
        say: "Draw two long tall ears!",
      },
      {
        paths: ["M 94 336 A 34 34 0 1 1 162 336 A 34 34 0 1 1 94 336"],
        say: "Add a fluffy round tail!",
        detail: true,
      },
      {
        paths: [
          "M 118 398 A 44 26 0 1 1 206 398 A 44 26 0 1 1 118 398",
          "M 294 398 A 44 26 0 1 1 382 398 A 44 26 0 1 1 294 398",
          "M 192 412 A 24 22 0 1 1 240 412 A 24 22 0 1 1 192 412",
          "M 260 412 A 24 22 0 1 1 308 412 A 24 22 0 1 1 260 412",
        ],
        say: "Two hoppy feet and two paws!",
        detail: true,
      },
      {
        paths: [
          "M 209 206 A 13 13 0 1 1 235 206 A 13 13 0 1 1 209 206",
          "M 265 206 A 13 13 0 1 1 291 206 A 13 13 0 1 1 265 206",
          "M 238 236 Q 250 228 262 236 Q 250 252 238 236 Z",
          "M 250 250 Q 234 268 218 254",
          "M 250 250 Q 266 268 282 254",
          "M 238 262 L 238 284 Q 250 292 262 284 L 262 262",
          "M 214 244 L 172 236",
          "M 214 256 L 172 262",
          "M 286 244 L 328 236",
          "M 286 256 L 328 262",
        ],
        say: "Sweet eyes and two front teeth!",
      },
    ],
  },
  {
    word: "Lion",
    emoji: "🦁",
    color: "#FBBF24",
    steps: [
      {
        paths: ["M 204 356 A 108 88 0 1 1 420 356 A 108 88 0 1 1 204 356"],
        say: "Draw a big round body!",
      },
      {
        paths: ["M 128 224 A 84 84 0 1 1 296 224 A 84 84 0 1 1 128 224"],
        say: "Add a round head up front!",
      },
      {
        paths: [
          // 12 mane petals about (212,224): ends on r=92, controls on r=168.
          "M 304 224 Q 374 268 292 270 Q 331 343 258 304 Q 256 386 212 316 Q 168 386 166 304 Q 93 343 132 270 Q 50 268 120 224 Q 50 181 132 178 Q 93 105 166 144 Q 168 62 212 132 Q 256 62 258 144 Q 331 105 292 178 Q 374 181 304 224 Z",
        ],
        say: "Draw a fluffy mane all around!",
      },
      {
        paths: [
          "M 416 380 C 452 384 464 352 454 320 C 448 306 438 302 428 310",
          "M 404 306 A 24 24 0 1 1 452 306 A 24 24 0 1 1 404 306",
        ],
        say: "Swish a tail with a puff!",
        detail: true,
      },
      {
        paths: [
          "M 216 436 A 34 22 0 1 1 284 436 A 34 22 0 1 1 216 436",
          "M 314 440 A 34 22 0 1 1 382 440 A 34 22 0 1 1 314 440",
        ],
        say: "Two big soft paws!",
        detail: true,
      },
      {
        paths: [
          "M 136 158 A 26 26 0 1 1 188 158 A 26 26 0 1 1 136 158",
          "M 236 158 A 26 26 0 1 1 288 158 A 26 26 0 1 1 236 158",
          "M 162 262 A 30 24 0 1 1 222 262 A 30 24 0 1 1 162 262",
          "M 202 262 A 30 24 0 1 1 262 262 A 30 24 0 1 1 202 262",
        ],
        say: "Little ears and puffy cheeks!",
        detail: true,
      },
      {
        paths: [
          "M 171 208 A 13 13 0 1 1 197 208 A 13 13 0 1 1 171 208",
          "M 227 208 A 13 13 0 1 1 253 208 A 13 13 0 1 1 227 208",
          "M 198 234 Q 212 226 226 234 Q 212 250 198 234 Z",
          "M 212 246 Q 198 268 182 254",
          "M 212 246 Q 226 268 242 254",
          "M 160 256 L 130 248",
          "M 160 268 L 130 274",
          "M 264 256 L 294 248",
          "M 264 268 L 294 274",
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
        paths: ["M 154 272 A 126 78 0 1 1 406 272 A 126 78 0 1 1 154 272"],
        say: "Draw a long stripey body!",
      },
      {
        paths: ["M 44 212 A 74 74 0 1 1 192 212 A 74 74 0 1 1 44 212"],
        say: "Add a round head in front!",
      },
      {
        paths: [
          // Every leg top sits inside the body oval's lower curve.
          "M 172 302 L 170 392 Q 190 406 210 392 L 208 330",
          "M 228 336 L 226 398 Q 246 412 266 398 L 264 344",
          "M 302 344 L 300 398 Q 320 412 340 398 L 338 336",
          "M 358 326 L 356 392 Q 376 406 396 392 L 394 294",
        ],
        say: "Now four strong legs!",
      },
      {
        paths: ["M 402 254 C 440 240 466 264 462 302 C 458 330 442 344 426 340"],
        say: "Swish a long curly tail!",
        detail: true,
      },
      {
        paths: [
          "M 202 216 Q 194 244 202 268",
          "M 234 204 Q 226 234 234 262",
          "M 266 199 Q 258 230 266 258",
          "M 298 199 Q 290 230 298 258",
          "M 330 204 Q 322 234 330 262",
          "M 362 216 Q 354 242 362 266",
          "M 437 243 L 437 261",
          "M 451 276 L 469 278",
          "M 442 324 L 456 340",
        ],
        say: "Add stripes on the back!",
        detail: true,
      },
      {
        paths: [
          // Ear centres sit on the head circle; cheeks stay fully inside it.
          "M 67 143 A 26 26 0 1 1 119 143 A 26 26 0 1 1 67 143",
          "M 156 175 A 26 26 0 1 1 208 175 A 26 26 0 1 1 156 175",
          "M 80 143 A 13 13 0 1 1 106 143 A 13 13 0 1 1 80 143",
          "M 169 175 A 13 13 0 1 1 195 175 A 13 13 0 1 1 169 175",
          "M 76 252 A 24 20 0 1 1 124 252 A 24 20 0 1 1 76 252",
          "M 112 252 A 24 20 0 1 1 160 252 A 24 20 0 1 1 112 252",
          "M 98 168 Q 102 182 98 194",
          "M 130 164 Q 132 180 128 192",
        ],
        say: "Two ears and puffy cheeks!",
        detail: true,
      },
      {
        paths: [
          "M 73 204 A 13 13 0 1 1 99 204 A 13 13 0 1 1 73 204",
          "M 133 202 A 13 13 0 1 1 159 202 A 13 13 0 1 1 133 202",
          "M 106 238 Q 118 230 130 238 Q 118 254 106 238 Z",
          "M 118 250 Q 104 270 88 256",
          "M 118 250 Q 132 270 148 256",
          "M 74 246 L 48 240",
          "M 74 258 L 48 264",
          "M 162 246 L 188 240",
          "M 162 258 L 188 264",
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
        paths: ["M 198 296 A 58 96 0 1 1 314 296 A 58 96 0 1 1 198 296"],
        say: "Draw a tall egg body!",
      },
      {
        paths: ["M 194 182 A 62 62 0 1 1 318 182 A 62 62 0 1 1 194 182"],
        say: "Put a round head on top!",
      },
      {
        paths: [
          // Wings start and end on the body oval, tips reach out to x=48 and x=464.
          "M 206 254 C 156 206 96 186 48 200 C 66 238 88 264 112 278 C 100 302 102 320 118 334 C 152 344 186 342 210 328",
          "M 306 254 C 356 206 416 186 464 200 C 446 238 424 264 400 278 C 412 302 410 320 394 334 C 360 344 326 342 302 328",
        ],
        say: "Stretch out two big wings!",
      },
      {
        paths: [
          "M 96 232 C 116 252 138 268 160 278",
          "M 132 290 C 130 308 132 324 138 336",
          "M 160 292 C 158 310 160 326 166 338",
          "M 188 292 C 186 310 188 326 192 336",
          "M 416 232 C 396 252 374 268 352 278",
          "M 380 290 C 382 308 380 324 374 336",
          "M 352 292 C 354 310 352 326 346 338",
          "M 324 292 C 326 310 324 326 320 336",
        ],
        say: "Add rows of soft feathers!",
        detail: true,
      },
      {
        paths: ["M 222 380 L 206 452 L 232 440 L 256 456 L 280 440 L 306 452 L 290 380"],
        say: "Add pointy tail feathers!",
        detail: true,
      },
      {
        paths: [
          "M 216 292 Q 236 312 256 292 Q 276 312 296 292",
          "M 214 330 Q 235 350 256 330 Q 277 350 298 330",
        ],
        say: "Fluffy feathers on the chest!",
        detail: true,
      },
      {
        paths: [
          "M 228 190 L 286 190 C 286 220 272 242 258 250 Q 246 254 242 244",
          "M 215 166 A 13 13 0 1 1 241 166 A 13 13 0 1 1 215 166",
          "M 271 166 A 13 13 0 1 1 297 166 A 13 13 0 1 1 271 166",
          "M 210 146 L 240 156",
          "M 302 146 L 272 156",
        ],
        say: "Hooked beak and brave eyes!",
      },
    ],
  },
  {
    word: "Fish",
    emoji: "🐠",
    color: "#22D3EE",
    steps: [
      {
        paths: ["M 106 266 A 126 92 0 1 1 358 266 A 126 92 0 1 1 106 266"],
        say: "Draw a big oval body!",
      },
      {
        paths: [
          // Fan tail: pinched at the body (352,244)-(352,290), flared at x=458.
          "M 352 244 C 396 200 430 178 458 170 C 448 212 444 244 444 266 C 444 288 448 320 458 362 C 430 354 396 332 352 290",
        ],
        say: "Add a big fan tail!",
      },
      {
        paths: [
          "M 190 180 C 208 122 250 108 288 130 C 300 152 302 172 300 188",
          "M 184 348 C 200 396 236 410 266 396 C 272 380 272 366 270 354",
        ],
        say: "Fins on top and bottom!",
      },
      {
        paths: [
          "M 150 208 C 132 250 134 288 152 326",
          "M 194 286 C 226 300 254 302 276 296 C 256 328 214 332 192 312 Z",
        ],
        say: "Draw a gill and side fin!",
        detail: true,
      },
      {
        paths: [
          "M 228 216 Q 248 234 228 252",
          "M 262 214 Q 282 232 262 250",
          "M 296 218 Q 314 236 296 254",
          "M 246 254 Q 266 272 246 290",
          "M 280 256 Q 298 274 280 292",
          "M 314 258 Q 330 274 314 290",
        ],
        say: "Draw shiny curvy scales!",
        detail: true,
      },
      {
        paths: [
          "M 62 152 A 16 16 0 1 1 94 152 A 16 16 0 1 1 62 152",
          "M 112 106 A 12 12 0 1 1 136 106 A 12 12 0 1 1 112 106",
          "M 153 70 A 9 9 0 1 1 171 70 A 9 9 0 1 1 153 70",
        ],
        say: "Blow three little bubbles!",
        detail: true,
      },
      {
        paths: [
          "M 135 240 A 15 15 0 1 1 165 240 A 15 15 0 1 1 135 240",
          "M 122 282 Q 146 308 176 294",
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
        paths: ["M 288 256 A 88 74 0 1 1 464 256 A 88 74 0 1 1 288 256"],
        say: "Draw a big circle for the tummy!",
      },
      {
        // r=50 at (250,256): overlaps the abdomen and the head so the waist links up.
        paths: ["M 200 256 A 50 50 0 1 1 300 256 A 50 50 0 1 1 200 256"],
        say: "A middle circle next to it!",
      },
      {
        paths: ["M 84 254 A 60 54 0 1 1 204 254 A 60 54 0 1 1 84 254"],
        say: "Now a circle for the head!",
      },
      {
        paths: [
          // Every leg starts on the thorax circle and bends at a knee.
          "M 209 285 L 168 316 L 148 366",
          "M 220 296 L 188 342 L 176 396",
          "M 238 304 L 224 356 L 220 406",
          "M 262 304 L 276 356 L 280 406",
          "M 280 296 L 312 342 L 324 396",
          "M 291 285 L 332 316 L 352 366",
        ],
        say: "Count six busy legs!",
        detail: true,
      },
      {
        paths: [
          "M 112 208 C 100 172 84 142 62 116",
          "M 94 226 C 70 210 54 190 48 164",
          "M 54 116 A 8 8 0 1 1 70 116 A 8 8 0 1 1 54 116",
          "M 40 164 A 8 8 0 1 1 56 164 A 8 8 0 1 1 40 164",
        ],
        say: "Two bendy antennae up high!",
        detail: true,
      },
      {
        paths: [
          "M 107 238 A 11 11 0 1 1 129 238 A 11 11 0 1 1 107 238",
          "M 149 236 A 11 11 0 1 1 171 236 A 11 11 0 1 1 149 236",
          "M 118 276 Q 146 296 174 276",
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
        paths: ["M 96 322 A 144 116 0 0 1 384 322 Z"],
        say: "Draw a big dome shell!",
      },
      {
        paths: [
          "M 138 322 A 102 82 0 0 1 342 322",
          "M 328 281 L 365 264",
          "M 291 251 L 312 222",
          "M 240 240 L 240 206",
          "M 189 251 L 168 222",
          "M 152 281 L 115 264",
          "M 275 286 L 240 302 L 205 286 L 205 254 L 240 238 L 275 254 Z",
        ],
        say: "Draw pretty shell plates!",
        detail: true,
      },
      {
        paths: ["M 364 264 A 48 44 0 1 1 460 264 A 48 44 0 1 1 364 264"],
        say: "Poke out a round head!",
      },
      {
        paths: [
          // Each foot's top crosses the shell's flat base line at y=322.
          "M 102 346 A 38 28 0 1 1 178 346 A 38 28 0 1 1 102 346",
          "M 180 350 A 32 28 0 1 1 244 350 A 32 28 0 1 1 180 350",
          "M 248 350 A 32 28 0 1 1 312 350 A 32 28 0 1 1 248 350",
          "M 310 346 A 38 28 0 1 1 386 346 A 38 28 0 1 1 310 346",
          "M 118 366 L 118 378",
          "M 140 372 L 140 384",
          "M 162 366 L 162 378",
          "M 326 366 L 326 378",
          "M 348 372 L 348 384",
          "M 370 366 L 370 378",
        ],
        say: "Add four little feet!",
      },
      {
        paths: ["M 100 302 L 58 318 L 102 326 Z"],
        say: "A pointy tail at the back!",
        detail: true,
      },
      {
        paths: [
          "M 387 248 A 11 11 0 1 1 409 248 A 11 11 0 1 1 387 248",
          "M 423 248 A 11 11 0 1 1 445 248 A 11 11 0 1 1 423 248",
          "M 396 286 Q 418 302 440 286",
        ],
        say: "Happy eyes and a slow smile!",
      },
    ],
  },
  {
    word: "Bear",
    emoji: "🐻",
    color: "#A16207",
    steps: [
      {
        paths: ["M 138 340 A 118 104 0 1 1 374 340 A 118 104 0 1 1 138 340"],
        say: "Draw a big round body!",
      },
      {
        paths: ["M 174 192 A 82 82 0 1 1 338 192 A 82 82 0 1 1 174 192"],
        say: "Add a round head on top!",
      },
      {
        paths: [
          // Ear centres sit on the head circle at the upper corners.
          "M 164 134 A 34 34 0 1 1 232 134 A 34 34 0 1 1 164 134",
          "M 280 134 A 34 34 0 1 1 348 134 A 34 34 0 1 1 280 134",
          "M 181 134 A 17 17 0 1 1 215 134 A 17 17 0 1 1 181 134",
          "M 297 134 A 17 17 0 1 1 331 134 A 17 17 0 1 1 297 134",
        ],
        say: "Two little round ears!",
      },
      {
        paths: [
          "M 112 330 A 38 56 0 1 1 188 330 A 38 56 0 1 1 112 330",
          "M 324 330 A 38 56 0 1 1 400 330 A 38 56 0 1 1 324 330",
        ],
        say: "Add two soft round arms!",
        detail: true,
      },
      {
        paths: [
          "M 152 436 A 44 32 0 1 1 240 436 A 44 32 0 1 1 152 436",
          "M 272 436 A 44 32 0 1 1 360 436 A 44 32 0 1 1 272 436",
          "M 180 436 A 16 16 0 1 1 212 436 A 16 16 0 1 1 180 436",
          "M 300 436 A 16 16 0 1 1 332 436 A 16 16 0 1 1 300 436",
        ],
        say: "Two big feet with paw pads!",
        detail: true,
      },
      {
        paths: [
          "M 188 364 A 68 64 0 1 1 324 364 A 68 64 0 1 1 188 364",
          "M 204 232 A 52 38 0 1 1 308 232 A 52 38 0 1 1 204 232",
        ],
        say: "Draw the tummy and snout!",
        detail: true,
      },
      {
        paths: [
          "M 205 190 A 13 13 0 1 1 231 190 A 13 13 0 1 1 205 190",
          "M 281 190 A 13 13 0 1 1 307 190 A 13 13 0 1 1 281 190",
          "M 240 224 Q 256 214 272 224 Q 256 242 240 224 Z",
          "M 256 238 Q 240 258 224 244",
          "M 256 238 Q 272 258 288 244",
        ],
        say: "Eyes, nose, and a happy smile!",
      },
    ],
  },
  {
    word: "Cat",
    emoji: "🐱",
    color: "#FB7185",
    steps: [
      {
        paths: ["M 164 344 A 92 104 0 1 1 348 344 A 92 104 0 1 1 164 344"],
        say: "Draw a sitting cat body!",
      },
      {
        paths: ["M 170 196 A 80 80 0 1 1 330 196 A 80 80 0 1 1 170 196"],
        say: "Put a round head on top!",
      },
      {
        paths: [
          // Ear bases sit on the head circle; tips point up and out.
          "M 175 169 L 172 82 L 229 119",
          "M 325 169 L 328 82 L 271 119",
          "M 190 156 L 188 106 L 218 128",
          "M 310 156 L 312 106 L 282 128",
        ],
        say: "Two pointy triangle ears!",
      },
      {
        paths: [
          "M 170 440 A 36 24 0 1 1 242 440 A 36 24 0 1 1 170 440",
          "M 270 440 A 36 24 0 1 1 342 440 A 36 24 0 1 1 270 440",
          "M 194 432 L 194 448",
          "M 218 432 L 218 448",
          "M 294 432 L 294 448",
          "M 318 432 L 318 448",
        ],
        say: "Two front paws with toes!",
        detail: true,
      },
      {
        paths: ["M 336 396 C 400 402 436 366 438 314 C 440 274 414 254 394 266"],
        say: "Curl a long fluffy tail!",
        detail: true,
      },
      {
        paths: [
          "M 228 138 Q 232 156 228 172",
          "M 250 132 Q 252 152 250 168",
          "M 272 138 Q 268 156 272 172",
          "M 386 381 L 386 401",
          "M 411 359 L 429 375",
          "M 425 279 L 445 297",
        ],
        say: "Stripes on the head and tail!",
        detail: true,
      },
      {
        paths: [
          "M 208 190 A 14 14 0 1 1 236 190 A 14 14 0 1 1 208 190",
          "M 264 190 A 14 14 0 1 1 292 190 A 14 14 0 1 1 264 190",
          "M 238 218 L 262 218 L 250 232 Z",
          "M 250 232 Q 236 250 222 238",
          "M 250 232 Q 264 250 278 238",
          "M 206 226 L 158 216",
          "M 206 238 L 158 244",
          "M 294 226 L 342 216",
          "M 294 238 L 342 244",
        ],
        say: "Eyes, nose, and long whiskers!",
      },
    ],
  },
  {
    word: "Dog",
    emoji: "🐶",
    color: "#D97706",
    steps: [
      {
        paths: ["M 160 346 A 96 100 0 1 1 352 346 A 96 100 0 1 1 160 346"],
        say: "Draw a big round body!",
      },
      {
        paths: ["M 170 192 A 84 84 0 1 1 338 192 A 84 84 0 1 1 170 192"],
        say: "Add a round head on top!",
      },
      {
        paths: [
          // Both ends of each ear touch the head circle so they hang, not float.
          "M 186 140 C 138 140 110 180 116 226 C 122 262 160 280 200 256",
          "M 322 140 C 370 140 398 180 392 226 C 386 262 348 280 308 256",
        ],
        say: "Two long floppy ears!",
      },
      {
        paths: [
          "M 200 398 L 196 448 Q 218 462 240 448 L 238 408",
          "M 274 408 L 272 448 Q 294 462 316 448 L 312 398",
        ],
        say: "Two front legs and paws!",
        detail: true,
      },
      {
        paths: ["M 348 320 C 396 306 426 274 434 236 C 438 218 428 208 416 214"],
        say: "Wag a happy curly tail!",
        detail: true,
      },
      {
        paths: [
          "M 206 268 Q 256 306 306 268",
          "M 244 306 A 12 12 0 1 1 268 306 A 12 12 0 1 1 244 306",
        ],
        say: "Add a collar with a tag!",
        detail: true,
      },
      {
        paths: [
          "M 208 180 A 14 14 0 1 1 236 180 A 14 14 0 1 1 208 180",
          "M 274 180 A 14 14 0 1 1 302 180 A 14 14 0 1 1 274 180",
          "M 234 222 A 20 15 0 1 1 274 222 A 20 15 0 1 1 234 222",
          "M 254 238 Q 236 260 216 244",
          "M 254 238 Q 272 260 292 244",
          "M 238 256 Q 254 288 270 256",
        ],
        say: "Eyes, nose, and a waggy tongue!",
      },
    ],
  },
  {
    word: "Elephant",
    emoji: "🐘",
    color: "#64748B",
    steps: [
      {
        paths: ["M 194 306 A 112 88 0 1 1 418 306 A 112 88 0 1 1 194 306"],
        say: "Draw a huge round body!",
      },
      {
        paths: ["M 92 212 A 76 76 0 1 1 244 212 A 76 76 0 1 1 92 212"],
        say: "Add a big round head!",
      },
      {
        paths: [
          // Ear flap: feet on the head circle at (190,138) and (216,270),
          // the fan bulging back past the head and clear above the shoulder.
          "M 190 138 C 250 138 288 178 280 224 C 274 256 246 278 216 270",
          "M 202 158 C 248 158 272 190 266 224 C 262 246 242 260 220 256",
        ],
        say: "Draw one huge floppy ear!",
        detail: true,
      },
      {
        paths: [
          // A fat trunk hangs off the head at (100,244) and (152,288), bowing
          // out to x=46 in front of the face and curling back up at the tip.
          "M 100 244 C 62 292 46 352 58 402 C 68 440 122 448 148 418 C 158 406 152 392 138 394",
          "M 152 288 C 128 320 102 360 100 390 C 98 416 122 428 134 410 C 138 402 138 396 138 394",
        ],
        say: "Draw the long hanging trunk!",
      },
      {
        paths: [
          "M 206 336 L 202 434 Q 228 448 252 434 L 250 382",
          "M 260 386 L 258 424 Q 278 436 298 424 L 296 396",
          "M 330 392 L 328 424 Q 348 436 368 424 L 366 386",
          "M 374 376 L 370 434 Q 394 448 418 434 L 408 340",
        ],
        say: "Four thick tree-trunk legs!",
        detail: true,
      },
      {
        paths: [
          "M 414 330 C 438 348 448 372 444 398",
          "M 444 398 L 432 420",
          "M 444 398 L 444 422",
          "M 444 398 L 456 420",
          "M 72 290 L 143 298",
          "M 57 340 L 117 341",
          "M 55 378 L 103 372",
          // Tusks flank the trunk on the head side, clear of its inner edge.
          "M 181 287 C 172 318 158 344 140 364",
          "M 196 292 C 190 316 180 336 166 352",
        ],
        say: "Tusks, wrinkles, and a tail!",
        detail: true,
      },
      {
        paths: [
          "M 119 192 A 13 13 0 1 1 145 192 A 13 13 0 1 1 119 192",
          "M 191 186 A 13 13 0 1 1 217 186 A 13 13 0 1 1 191 186",
          "M 148 244 Q 174 262 200 244",
        ],
        say: "Kind eyes and a happy smile!",
      },
    ],
  },
  {
    word: "Giraffe",
    emoji: "🦒",
    color: "#F59E0B",
    steps: [
      {
        paths: ["M 182 352 A 98 70 0 1 1 378 352 A 98 70 0 1 1 182 352"],
        say: "Draw a big oval body!",
      },
      {
        paths: [
          // Both neck edges start inside the body and rise to the head.
          "M 212 300 C 190 240 164 178 146 128",
          "M 272 288 C 250 226 216 166 192 120",
        ],
        say: "Draw the long tall neck!",
      },
      {
        paths: [
          "M 98 104 A 52 34 0 1 1 202 104 A 52 34 0 1 1 98 104",
          "M 76 116 A 30 24 0 1 1 136 116 A 30 24 0 1 1 76 116",
        ],
        say: "Add a small head and nose!",
      },
      {
        paths: [
          "M 132 76 L 126 56",
          "M 114 54 A 10 10 0 1 1 134 54 A 10 10 0 1 1 114 54",
          "M 168 74 L 174 54",
          "M 166 52 A 10 10 0 1 1 186 52 A 10 10 0 1 1 166 52",
          "M 116 92 C 96 80 78 80 72 90 C 78 100 94 106 112 104",
          "M 186 88 C 206 76 224 76 230 86 C 224 96 208 102 190 100",
        ],
        say: "Two horns and two ears!",
        detail: true,
      },
      {
        paths: [
          "M 216 396 L 210 452 Q 226 462 242 452 L 238 412",
          "M 250 414 L 246 452 Q 262 462 278 452 L 274 416",
          "M 296 416 L 292 452 Q 308 462 324 452 L 320 414",
          "M 336 400 L 330 452 Q 346 462 362 452 L 356 394",
          "M 372 336 C 398 352 410 380 408 408",
          "M 408 408 L 398 428",
          "M 408 408 L 408 432",
          "M 408 408 L 418 428",
        ],
        say: "Four long legs and a tail!",
        detail: true,
      },
      {
        paths: [
          "M 226 330 Q 248 322 256 338 Q 250 358 230 354 Q 218 344 226 330 Z",
          "M 278 322 Q 302 316 308 332 Q 302 352 282 348 Q 270 336 278 322 Z",
          "M 326 336 Q 346 330 352 346 Q 346 364 326 360 Q 316 348 326 336 Z",
          "M 244 372 Q 266 366 272 382 Q 266 400 246 396 Q 234 384 244 372 Z",
          "M 298 374 Q 318 368 324 384 Q 318 402 298 398 Q 288 386 298 374 Z",
          "M 210 240 Q 228 234 234 248 Q 228 264 212 260 Q 202 252 210 240 Z",
          "M 188 186 Q 206 180 212 194 Q 206 210 190 206 Q 180 198 188 186 Z",
          "M 168 142 Q 186 136 192 150 Q 186 166 170 162 Q 160 154 168 142 Z",
        ],
        say: "Add lots of brown patches!",
        detail: true,
      },
      {
        paths: [
          "M 265 270 L 285 262",
          "M 250 233 L 270 225",
          "M 233 198 L 253 190",
          "M 216 165 L 236 157",
          "M 200 134 L 220 126",
          "M 129 94 A 11 11 0 1 1 151 94 A 11 11 0 1 1 129 94",
          "M 165 90 A 11 11 0 1 1 187 90 A 11 11 0 1 1 165 90",
          "M 81 110 A 7 7 0 1 1 95 110 A 7 7 0 1 1 81 110",
          "M 84 124 Q 102 138 122 128",
        ],
        say: "Fuzzy mane and a happy face!",
      },
    ],
  },
  {
    word: "Horse",
    emoji: "🐴",
    color: "#92400E",
    steps: [
      {
        paths: ["M 154 286 A 118 80 0 1 1 390 286 A 118 80 0 1 1 154 286"],
        say: "Draw a big oval body!",
      },
      {
        paths: [
          "M 176 250 C 152 208 134 176 122 148",
          "M 232 214 C 208 190 186 166 170 140",
        ],
        say: "Draw a strong curvy neck!",
      },
      {
        paths: [
          "M 50 150 A 64 42 0 1 1 178 150 A 64 42 0 1 1 50 150",
          "M 42 166 A 30 24 0 1 1 102 166 A 30 24 0 1 1 42 166",
        ],
        say: "Add the head and soft nose!",
      },
      {
        paths: [
          "M 92 109 L 100 62 L 126 108",
          "M 141 112 L 152 68 L 166 126",
        ],
        say: "Two pointy little ears!",
        detail: true,
      },
      {
        paths: [
          "M 152 118 C 178 130 200 152 216 178 C 230 200 238 216 240 230 C 226 226 212 214 200 198 C 186 178 168 154 150 140",
          "M 128 108 C 122 92 124 78 132 68",
        ],
        say: "Comb a flowing mane down!",
        detail: true,
      },
      {
        paths: [
          "M 188 330 L 182 424 Q 198 436 214 424 L 210 348",
          "M 228 352 L 224 428 Q 240 440 256 428 L 252 356",
          "M 300 356 L 296 428 Q 312 440 328 428 L 324 352",
          "M 344 344 L 338 424 Q 354 436 370 424 L 366 326",
          "M 386 262 C 418 276 436 316 434 356 C 432 386 420 406 404 418",
          "M 386 286 C 412 300 424 336 422 366 C 420 390 412 406 400 418",
        ],
        say: "Four legs and a long tail!",
        detail: true,
      },
      {
        paths: [
          "M 117 138 A 13 13 0 1 1 143 138 A 13 13 0 1 1 117 138",
          "M 52 160 A 8 8 0 1 1 68 160 A 8 8 0 1 1 52 160",
          "M 48 176 Q 68 190 90 180",
        ],
        say: "One big eye and a smile!",
      },
    ],
  },
  {
    word: "Octopus",
    emoji: "🐙",
    color: "#C084FC",
    steps: [
      {
        paths: [
          "M 122 268 C 122 172 182 112 256 112 C 330 112 390 172 390 268 C 372 300 318 314 256 314 C 194 314 140 300 122 268 Z",
        ],
        say: "Draw a big round head!",
      },
      {
        paths: [
          // All eight arms start on the mantle's bottom curve.
          "M 137 285 C 94 300 60 336 52 380 C 48 404 64 418 80 408",
          "M 159 298 C 124 330 104 372 108 410 C 110 430 128 436 138 422",
          "M 187 307 C 166 348 156 392 166 424 C 172 442 190 444 196 428",
          "M 220 312 C 208 352 204 396 214 428 C 220 446 238 446 244 430",
          "M 292 312 C 304 352 308 396 298 428 C 292 446 274 446 268 430",
          "M 325 307 C 346 348 356 392 346 424 C 340 442 322 444 316 428",
          "M 353 298 C 388 330 408 372 404 410 C 402 430 384 436 374 422",
          "M 375 285 C 418 300 452 336 460 380 C 464 404 448 418 432 408",
        ],
        say: "Add eight wiggly arms!",
      },
      {
        paths: [
          "M 93 302 A 7 7 0 1 1 107 302 A 7 7 0 1 1 93 302",
          "M 63 334 A 7 7 0 1 1 77 334 A 7 7 0 1 1 63 334",
          "M 51 372 A 7 7 0 1 1 65 372 A 7 7 0 1 1 51 372",
          "M 405 302 A 7 7 0 1 1 419 302 A 7 7 0 1 1 405 302",
          "M 435 334 A 7 7 0 1 1 449 334 A 7 7 0 1 1 435 334",
          "M 447 372 A 7 7 0 1 1 461 372 A 7 7 0 1 1 447 372",
          "M 205 356 A 7 7 0 1 1 219 356 A 7 7 0 1 1 205 356",
          "M 201 396 A 7 7 0 1 1 215 396 A 7 7 0 1 1 201 396",
          "M 293 356 A 7 7 0 1 1 307 356 A 7 7 0 1 1 293 356",
          "M 297 396 A 7 7 0 1 1 311 396 A 7 7 0 1 1 297 396",
        ],
        say: "Dot little suckers on the arms!",
        detail: true,
      },
      {
        paths: [
          "M 200 160 A 12 12 0 1 1 224 160 A 12 12 0 1 1 200 160",
          "M 244 142 A 12 12 0 1 1 268 142 A 12 12 0 1 1 244 142",
          "M 292 162 A 12 12 0 1 1 316 162 A 12 12 0 1 1 292 162",
        ],
        say: "Add bumps on top!",
        detail: true,
      },
      {
        paths: [
          "M 415 170 A 15 15 0 1 1 445 170 A 15 15 0 1 1 415 170",
          "M 445 126 A 11 11 0 1 1 467 126 A 11 11 0 1 1 445 126",
          "M 430 86 A 8 8 0 1 1 446 86 A 8 8 0 1 1 430 86",
        ],
        say: "Blow three little bubbles!",
        detail: true,
      },
      {
        paths: [
          "M 182 230 A 24 24 0 1 1 230 230 A 24 24 0 1 1 182 230",
          "M 282 230 A 24 24 0 1 1 330 230 A 24 24 0 1 1 282 230",
          "M 196 234 A 10 10 0 1 1 216 234 A 10 10 0 1 1 196 234",
          "M 296 234 A 10 10 0 1 1 316 234 A 10 10 0 1 1 296 234",
          "M 214 288 Q 256 316 298 288",
        ],
        say: "Big eyes and a happy smile!",
      },
    ],
  },
  {
    word: "Penguin",
    emoji: "🐧",
    color: "#475569",
    steps: [
      {
        paths: [
          "M 256 108 C 340 108 380 200 380 292 C 380 384 328 434 256 434 C 184 434 132 384 132 292 C 132 200 172 108 256 108 Z",
        ],
        say: "Draw a big egg body!",
      },
      {
        paths: [
          "M 256 200 C 322 200 348 258 348 318 C 348 380 310 414 256 414 C 202 414 164 380 164 318 C 164 258 190 200 256 200 Z",
        ],
        say: "Draw the round white tummy!",
        detail: true,
      },
      {
        paths: [
          // Flippers hug the body's side curves from shoulder to hip.
          "M 140 236 C 110 268 100 318 110 362 C 124 378 140 368 144 346 C 150 312 148 268 150 244",
          "M 372 236 C 402 268 412 318 402 362 C 388 378 372 368 368 346 C 362 312 364 268 362 244",
        ],
        say: "Add two little flippers!",
      },
      {
        paths: [
          "M 156 446 A 46 20 0 1 1 248 446 A 46 20 0 1 1 156 446",
          "M 264 446 A 46 20 0 1 1 356 446 A 46 20 0 1 1 264 446",
          "M 176 452 L 176 464",
          "M 202 456 L 202 468",
          "M 228 452 L 228 464",
          "M 284 452 L 284 464",
          "M 310 456 L 310 468",
          "M 336 452 L 336 464",
        ],
        say: "Two flat feet at the bottom!",
      },
      {
        paths: [
          "M 174 190 A 34 30 0 1 1 242 190 A 34 30 0 1 1 174 190",
          "M 270 190 A 34 30 0 1 1 338 190 A 34 30 0 1 1 270 190",
        ],
        say: "Draw two soft cheek patches!",
        detail: true,
      },
      {
        paths: [
          "M 195 186 A 13 13 0 1 1 221 186 A 13 13 0 1 1 195 186",
          "M 291 186 A 13 13 0 1 1 317 186 A 13 13 0 1 1 291 186",
          "M 232 218 Q 256 210 280 218 Q 268 250 256 252 Q 244 250 232 218 Z",
        ],
        say: "Two eyes and a little beak!",
      },
    ],
  },
];
