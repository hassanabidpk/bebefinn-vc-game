/**
 * Tap-to-fill coloring pages for toddlers.
 *
 * Every path is designed for a 512x512 viewBox. Regions are closed shapes the
 * child taps to fill; they are painted in array order (back to front) with a
 * thick round-joined outline, so a fin or flipper is tucked UNDER the body
 * that follows it and only its outer part shows. Details (eyes, smiles,
 * cheeks, bubbles) are drawn on top of every region and never take a tap.
 *
 * Circles/ellipses are written as two half arcs, e.g. a circle at (cx, cy)
 * with radius r is `M cx-r cy A r r 0 1 1 cx+r cy A r r 0 1 1 cx-r cy Z`.
 * All geometry, outline included, stays inside the 512 box so nothing clips.
 */

export interface ColoringRegion {
  /** Stable key within its page, e.g. "tail" — also read out as the tap label. */
  id: string;
  /** Closed SVG path d string (viewBox 0 0 512 512). */
  d: string;
}

export interface ColoringDetail {
  /** SVG path d string (viewBox 0 0 512 512) drawn over the regions. */
  d: string;
  /** Solid fill for eyes and cheeks. Omit for a plain line. */
  fill?: string;
  /** Line weight; 0 draws the fill alone. Defaults to the region outline. */
  width?: number;
}

export interface ColoringPage {
  id: string;
  word: string;
  /** Accent hex for the picker card, bright and kid-friendly. */
  color: string;
  /** Fillable shapes, painted back to front. */
  regions: ColoringRegion[];
  /** Non-fillable face and decoration lines, painted over the regions. */
  details: ColoringDetail[];
}

/** Region id -> crayon hex. A region missing from the map is still white. */
export type ColoringFills = Readonly<Record<string, string>>;

/** Same names and hex values as the Draw game's crayons. */
export const COLORING_CRAYONS = [
  { name: "Red", hex: "#FF5A5F" },
  { name: "Orange", hex: "#FF9F43" },
  { name: "Yellow", hex: "#FFD93D" },
  { name: "Green", hex: "#6BCB77" },
  { name: "Blue", hex: "#4DA6FF" },
  { name: "Purple", hex: "#A66BFF" },
] as const;

export const COLORING_OUTLINE = "#2A2F45";
const EYE_WHITE = "#FFFFFF";
const CHEEK = "#FF9BB3";
const THIN = 7;

export const COLORING_PAGES: ColoringPage[] = [
  {
    id: "fish",
    word: "Fish",
    color: "#FF9F43",
    regions: [
      {
        id: "tail",
        // Fan tail: its root (x=196) hides inside the body's pointy back end.
        d: "M 196 230 C 150 200 110 164 62 150 C 84 196 96 228 96 256 C 96 284 84 316 62 362 C 110 348 150 312 196 282 Z",
      },
      {
        id: "top fin",
        d: "M 206 176 C 222 104 292 60 372 76 C 350 104 344 132 352 164 Z",
      },
      {
        id: "bottom fin",
        d: "M 226 350 C 222 408 254 446 312 458 C 302 424 318 390 346 352 Z",
      },
      {
        id: "body",
        // Round head at the right, tapering to a point at (150,256).
        d: "M 440 256 C 440 170 360 132 290 132 C 210 132 160 200 150 256 C 160 312 210 380 290 380 C 360 380 440 342 440 256 Z",
      },
      {
        id: "stripe",
        // Both ends land on the body outline (x=296 and x=348), so the band
        // reads as painted across the body.
        d: "M 296 132 C 314 200 314 312 296 380 L 348 371 C 362 304 362 208 348 141 Z",
      },
      {
        id: "side fin",
        d: "M 290 272 C 266 238 212 238 188 266 C 204 300 250 318 290 272 Z",
      },
    ],
    details: [
      { d: "M 374 222 A 22 22 0 1 1 418 222 A 22 22 0 1 1 374 222 Z", fill: EYE_WHITE },
      { d: "M 390 224 A 11 11 0 1 1 412 224 A 11 11 0 1 1 390 224 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 402 218 A 4 4 0 1 1 410 218 A 4 4 0 1 1 402 218 Z", fill: EYE_WHITE, width: 0 },
      { d: "M 404 290 Q 420 302 432 286", width: THIN },
      { d: "M 378 272 A 9 9 0 1 1 396 272 A 9 9 0 1 1 378 272 Z", fill: CHEEK, width: 0 },
      { d: "M 450 166 A 13 13 0 1 1 476 166 A 13 13 0 1 1 450 166 Z", width: 6 },
      { d: "M 464 120 A 9 9 0 1 1 482 120 A 9 9 0 1 1 464 120 Z", width: 6 },
    ],
  },
  {
    id: "turtle",
    word: "Turtle",
    color: "#6BCB77",
    regions: [
      {
        id: "front left flipper",
        // Flipper roots sit inside the shell ellipse, so only the paddle shows.
        d: "M 176 206 C 124 158 72 146 40 160 C 44 200 98 244 164 264 Z",
      },
      {
        id: "front right flipper",
        d: "M 336 206 C 388 158 440 146 472 160 C 468 200 414 244 348 264 Z",
      },
      {
        id: "back left flipper",
        d: "M 176 356 C 124 368 80 404 66 452 C 116 462 170 436 202 398 Z",
      },
      {
        id: "back right flipper",
        d: "M 336 356 C 388 368 432 404 446 452 C 396 462 342 436 310 398 Z",
      },
      {
        id: "head",
        d: "M 198 96 A 58 60 0 1 1 314 96 A 58 60 0 1 1 198 96 Z",
      },
      {
        id: "shell",
        d: "M 126 290 A 130 146 0 1 1 386 290 A 130 146 0 1 1 126 290 Z",
      },
      {
        id: "spots",
        // One region: a rounded hexagon plate ringed by six round spots.
        d: "M 256 236 L 300 262 L 300 318 L 256 344 L 212 318 L 212 262 Z M 232 184 A 24 24 0 1 1 280 184 A 24 24 0 1 1 232 184 Z M 232 396 A 24 24 0 1 1 280 396 A 24 24 0 1 1 232 396 Z M 150 246 A 24 24 0 1 1 198 246 A 24 24 0 1 1 150 246 Z M 314 246 A 24 24 0 1 1 362 246 A 24 24 0 1 1 314 246 Z M 150 334 A 24 24 0 1 1 198 334 A 24 24 0 1 1 150 334 Z M 314 334 A 24 24 0 1 1 362 334 A 24 24 0 1 1 314 334 Z",
      },
    ],
    details: [
      { d: "M 220 86 A 14 14 0 1 1 248 86 A 14 14 0 1 1 220 86 Z", fill: EYE_WHITE, width: 6 },
      { d: "M 264 86 A 14 14 0 1 1 292 86 A 14 14 0 1 1 264 86 Z", fill: EYE_WHITE, width: 6 },
      { d: "M 228 88 A 8 8 0 1 1 244 88 A 8 8 0 1 1 228 88 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 268 88 A 8 8 0 1 1 284 88 A 8 8 0 1 1 268 88 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 240 114 Q 256 128 272 114", width: THIN },
      { d: "M 212 112 A 8 8 0 1 1 228 112 A 8 8 0 1 1 212 112 Z", fill: CHEEK, width: 0 },
      { d: "M 284 112 A 8 8 0 1 1 300 112 A 8 8 0 1 1 284 112 Z", fill: CHEEK, width: 0 },
    ],
  },
  {
    id: "octopus",
    word: "Octopus",
    color: "#A66BFF",
    regions: [
      {
        id: "leg 1",
        // Six tapered legs fan out from under the head; the outer pair curl up.
        d: "M 151 261 C 149 267 142 284 138 294 C 133 304 128 313 123 319 C 118 326 112 332 108 336 C 103 340 99 342 95 344 C 91 345 89 346 85 345 C 81 344 74 339 72 338 A 20 20 0 0 0 44 366 C 48 369 61 382 71 386 C 81 390 94 391 105 390 C 115 389 126 384 136 378 C 146 372 156 364 164 355 C 173 346 181 335 189 323 C 196 311 206 290 209 283 Z",
      },
      {
        id: "leg 2",
        d: "M 178 288 C 176 293 173 309 170 318 C 167 328 163 337 159 346 C 155 355 150 363 145 372 C 141 381 136 390 133 399 C 129 409 126 419 125 430 C 123 440 126 458 126 463 A 20 20 0 0 0 166 457 C 166 454 166 444 167 438 C 169 431 172 426 176 419 C 179 413 184 406 189 398 C 194 391 201 382 206 373 C 212 363 219 353 224 341 C 229 328 236 307 238 300 Z",
      },
      {
        id: "leg 3",
        d: "M 209 301 C 209 307 209 325 208 335 C 207 346 205 355 204 364 C 202 374 200 382 199 391 C 197 400 195 409 195 418 C 194 427 194 437 195 446 C 197 456 202 470 203 475 A 20 20 0 0 0 241 461 C 240 458 239 449 239 443 C 239 437 240 432 242 426 C 243 419 246 412 248 404 C 251 396 254 387 257 377 C 260 367 263 356 266 344 C 268 331 270 310 271 303 Z",
      },
      {
        id: "leg 4",
        d: "M 241 303 C 242 310 244 331 246 344 C 249 356 252 367 255 377 C 258 387 261 396 264 404 C 266 412 269 419 270 426 C 272 432 273 437 273 443 C 273 449 272 458 271 461 A 20 20 0 0 0 309 475 C 310 470 315 456 317 446 C 318 437 318 427 317 418 C 317 409 315 400 313 391 C 312 382 310 374 308 364 C 307 355 305 346 304 335 C 303 325 303 307 303 301 Z",
      },
      {
        id: "leg 5",
        d: "M 274 300 C 276 307 283 328 288 341 C 293 353 300 363 306 373 C 311 382 318 391 323 398 C 328 406 333 413 336 419 C 340 426 343 431 345 438 C 346 444 346 454 346 457 A 20 20 0 0 0 386 463 C 386 458 389 440 387 430 C 386 419 383 409 379 399 C 376 390 371 381 367 372 C 362 363 357 355 353 346 C 349 337 345 328 342 318 C 339 309 336 293 334 288 Z",
      },
      {
        id: "leg 6",
        d: "M 303 283 C 306 290 316 311 323 323 C 331 335 339 346 348 355 C 356 364 366 372 376 378 C 386 384 397 389 407 390 C 418 391 431 390 441 386 C 451 382 464 369 468 366 A 20 20 0 0 0 440 338 C 438 339 431 344 427 345 C 423 346 421 345 417 344 C 413 342 409 340 404 336 C 400 332 394 326 389 319 C 384 313 379 304 374 294 C 370 284 363 267 361 261 Z",
      },
      {
        id: "head",
        d: "M 256 52 C 338 52 388 112 388 188 C 388 252 356 296 312 310 C 284 318 228 318 200 310 C 156 296 124 252 124 188 C 124 112 174 52 256 52 Z",
      },
    ],
    details: [
      { d: "M 188 206 A 24 24 0 1 1 236 206 A 24 24 0 1 1 188 206 Z", fill: EYE_WHITE },
      { d: "M 276 206 A 24 24 0 1 1 324 206 A 24 24 0 1 1 276 206 Z", fill: EYE_WHITE },
      { d: "M 202 210 A 12 12 0 1 1 226 210 A 12 12 0 1 1 202 210 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 286 210 A 12 12 0 1 1 310 210 A 12 12 0 1 1 286 210 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 216 203 A 4 4 0 1 1 224 203 A 4 4 0 1 1 216 203 Z", fill: EYE_WHITE, width: 0 },
      { d: "M 300 203 A 4 4 0 1 1 308 203 A 4 4 0 1 1 300 203 Z", fill: EYE_WHITE, width: 0 },
      { d: "M 230 262 Q 256 284 282 262", width: THIN },
      { d: "M 162 250 A 12 10 0 1 1 186 250 A 12 10 0 1 1 162 250 Z", fill: CHEEK, width: 0 },
      { d: "M 326 250 A 12 10 0 1 1 350 250 A 12 10 0 1 1 326 250 Z", fill: CHEEK, width: 0 },
    ],
  },
  {
    id: "starfish",
    word: "Starfish",
    color: "#FF5A5F",
    regions: [
      {
        // Each arm is a kite from the middle out to a rounded tip. Neighbours
        // share the edge running out to the valley between them.
        id: "top arm",
        d: "M 256 279 L 181 176 L 225 92 Q 256 32 287 92 L 331 176 Z",
      },
      {
        id: "right arm",
        d: "M 256 279 L 331 176 L 424 191 Q 491 203 443 250 L 377 318 Z",
      },
      {
        id: "bottom right arm",
        d: "M 256 279 L 377 318 L 391 412 Q 401 478 341 448 L 256 405 Z",
      },
      {
        id: "bottom left arm",
        d: "M 256 279 L 256 405 L 171 448 Q 111 478 121 412 L 135 318 Z",
      },
      {
        id: "left arm",
        d: "M 256 279 L 135 318 L 69 250 Q 21 203 88 191 L 181 176 Z",
      },
      {
        id: "middle",
        d: "M 173 279 A 83 83 0 1 1 339 279 A 83 83 0 1 1 173 279 Z",
      },
    ],
    details: [
      { d: "M 217 262 A 16 16 0 1 1 249 262 A 16 16 0 1 1 217 262 Z", fill: EYE_WHITE, width: 6 },
      { d: "M 263 262 A 16 16 0 1 1 295 262 A 16 16 0 1 1 263 262 Z", fill: EYE_WHITE, width: 6 },
      { d: "M 225 265 A 9 9 0 1 1 243 265 A 9 9 0 1 1 225 265 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 269 265 A 9 9 0 1 1 287 265 A 9 9 0 1 1 269 265 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 233 302 Q 256 320 279 302", width: THIN },
      { d: "M 199 295 A 9 9 0 1 1 217 295 A 9 9 0 1 1 199 295 Z", fill: CHEEK, width: 0 },
      { d: "M 295 295 A 9 9 0 1 1 313 295 A 9 9 0 1 1 295 295 Z", fill: CHEEK, width: 0 },
      // One little bump ring on each arm, partway out to the tip.
      { d: "M 244 106 A 12 12 0 1 1 268 106 A 12 12 0 1 1 244 106 Z", width: 5 },
      { d: "M 408 226 A 12 12 0 1 1 432 226 A 12 12 0 1 1 408 226 Z", width: 5 },
      { d: "M 345 418 A 12 12 0 1 1 369 418 A 12 12 0 1 1 345 418 Z", width: 5 },
      { d: "M 143 418 A 12 12 0 1 1 167 418 A 12 12 0 1 1 143 418 Z", width: 5 },
      { d: "M 80 226 A 12 12 0 1 1 104 226 A 12 12 0 1 1 80 226 Z", width: 5 },
    ],
  },
];

/** True once every region on the page has been colored at least once. */
export function isPageComplete(filled: ColoringFills, page: ColoringPage): boolean {
  return page.regions.every((region) => Boolean(filled[region.id]));
}

export function getCrayonPhrase(name: string) {
  return `${name}!`;
}

export function getColoringPickPhrase(word: string) {
  return `Let's color the ${word}!`;
}

export function getColoringPraisePhrase(word: string) {
  return `Beautiful ${word}!`;
}

/** Every exact line the coloring screen can speak, for TTS registration. */
export const COLORING_PHRASES: readonly string[] = [
  ...COLORING_CRAYONS.map((crayon) => getCrayonPhrase(crayon.name)),
  ...COLORING_PAGES.flatMap((page) => [
    getColoringPickPhrase(page.word),
    getColoringPraisePhrase(page.word),
  ]),
];
