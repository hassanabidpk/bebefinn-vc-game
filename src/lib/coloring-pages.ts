/**
 * Tap-to-fill coloring pages for toddlers.
 *
 * Every path is designed for a 512x512 viewBox. Regions are closed shapes the
 * child taps to fill; they are painted in array order (back to front) with a
 * thick round-joined outline, so a fin or flipper is tucked UNDER the body
 * that follows it and only its outer part shows. Small parts (eyes, cheeks,
 * bubbles) are regions too: they start pre-colored and are optional, so the
 * picture finishes once its big parts are colored. Details (pupils, smiles)
 * are drawn on top of every region and never take a tap.
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
  /**
   * Small extra part (eyes, cheeks, bubbles): starts in this color and is
   * not needed to finish the picture.
   */
  start?: string;
  /** Outline weight for small parts; 0 draws the fill alone. */
  width?: number;
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
  /** Fillable shapes, painted back to front; small optional parts last. */
  regions: ColoringRegion[];
  /** Non-fillable pupils and face lines, painted over the regions. */
  details: ColoringDetail[];
}

/** Region id -> crayon hex. A region missing from the map is still white. */
export type ColoringFills = Readonly<Record<string, string>>;

/** The first six match the Draw game's crayons; the rest round out the box. */
export const COLORING_CRAYONS = [
  { name: "Red", hex: "#FF5A5F" },
  { name: "Orange", hex: "#FF9F43" },
  { name: "Yellow", hex: "#FFD93D" },
  { name: "Green", hex: "#6BCB77" },
  { name: "Blue", hex: "#4DA6FF" },
  { name: "Purple", hex: "#A66BFF" },
  { name: "Pink", hex: "#FF8AC8" },
  { name: "Brown", hex: "#A86B3C" },
  { name: "Light Blue", hex: "#9BE3FF" },
  { name: "Gray", hex: "#9AA5B1" },
  { name: "Black", hex: "#33333D" },
  { name: "White", hex: "#FFFFFF" },
] as const;

export const COLORING_OUTLINE = "#2A2F45";
const WHITE = "#FFFFFF";
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
      { id: "eye", d: "M 374 222 A 22 22 0 1 1 418 222 A 22 22 0 1 1 374 222 Z", start: WHITE },
      { id: "cheek", d: "M 378 272 A 9 9 0 1 1 396 272 A 9 9 0 1 1 378 272 Z", start: CHEEK, width: 0 },
      {
        id: "bubbles",
        d: "M 450 166 A 13 13 0 1 1 476 166 A 13 13 0 1 1 450 166 Z M 464 120 A 9 9 0 1 1 482 120 A 9 9 0 1 1 464 120 Z",
        start: WHITE,
        width: 6,
      },
    ],
    details: [
      { d: "M 390 224 A 11 11 0 1 1 412 224 A 11 11 0 1 1 390 224 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 402 218 A 4 4 0 1 1 410 218 A 4 4 0 1 1 402 218 Z", fill: WHITE, width: 0 },
      { d: "M 404 290 Q 420 302 432 286", width: THIN },
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
      {
        id: "eyes",
        d: "M 220 86 A 14 14 0 1 1 248 86 A 14 14 0 1 1 220 86 Z M 264 86 A 14 14 0 1 1 292 86 A 14 14 0 1 1 264 86 Z",
        start: WHITE,
        width: 6,
      },
      {
        id: "cheeks",
        d: "M 212 112 A 8 8 0 1 1 228 112 A 8 8 0 1 1 212 112 Z M 284 112 A 8 8 0 1 1 300 112 A 8 8 0 1 1 284 112 Z",
        start: CHEEK,
        width: 0,
      },
    ],
    details: [
      { d: "M 228 88 A 8 8 0 1 1 244 88 A 8 8 0 1 1 228 88 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 268 88 A 8 8 0 1 1 284 88 A 8 8 0 1 1 268 88 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 240 114 Q 256 128 272 114", width: THIN },
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
      {
        id: "eyes",
        d: "M 188 206 A 24 24 0 1 1 236 206 A 24 24 0 1 1 188 206 Z M 276 206 A 24 24 0 1 1 324 206 A 24 24 0 1 1 276 206 Z",
        start: WHITE,
      },
      {
        id: "cheeks",
        d: "M 162 250 A 12 10 0 1 1 186 250 A 12 10 0 1 1 162 250 Z M 326 250 A 12 10 0 1 1 350 250 A 12 10 0 1 1 326 250 Z",
        start: CHEEK,
        width: 0,
      },
    ],
    details: [
      { d: "M 202 210 A 12 12 0 1 1 226 210 A 12 12 0 1 1 202 210 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 286 210 A 12 12 0 1 1 310 210 A 12 12 0 1 1 286 210 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 216 203 A 4 4 0 1 1 224 203 A 4 4 0 1 1 216 203 Z", fill: WHITE, width: 0 },
      { d: "M 300 203 A 4 4 0 1 1 308 203 A 4 4 0 1 1 300 203 Z", fill: WHITE, width: 0 },
      { d: "M 230 262 Q 256 284 282 262", width: THIN },
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
      {
        id: "eyes",
        d: "M 217 262 A 16 16 0 1 1 249 262 A 16 16 0 1 1 217 262 Z M 263 262 A 16 16 0 1 1 295 262 A 16 16 0 1 1 263 262 Z",
        start: WHITE,
        width: 6,
      },
      {
        id: "cheeks",
        d: "M 199 295 A 9 9 0 1 1 217 295 A 9 9 0 1 1 199 295 Z M 295 295 A 9 9 0 1 1 313 295 A 9 9 0 1 1 295 295 Z",
        start: CHEEK,
        width: 0,
      },
      {
        // One little bump on each arm, partway out to the tip.
        id: "bumps",
        d: "M 244 106 A 12 12 0 1 1 268 106 A 12 12 0 1 1 244 106 Z M 408 226 A 12 12 0 1 1 432 226 A 12 12 0 1 1 408 226 Z M 345 418 A 12 12 0 1 1 369 418 A 12 12 0 1 1 345 418 Z M 143 418 A 12 12 0 1 1 167 418 A 12 12 0 1 1 143 418 Z M 80 226 A 12 12 0 1 1 104 226 A 12 12 0 1 1 80 226 Z",
        start: WHITE,
        width: 5,
      },
    ],
    details: [
      { d: "M 225 265 A 9 9 0 1 1 243 265 A 9 9 0 1 1 225 265 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 269 265 A 9 9 0 1 1 287 265 A 9 9 0 1 1 269 265 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 233 302 Q 256 320 279 302", width: THIN },
    ],
  },
  {
    id: "whale",
    word: "Whale",
    color: "#4DA6FF",
    regions: [
      {
        id: "spout",
        d: "M 362 184 C 360 140 344 112 312 98 C 334 80 362 90 376 112 C 390 90 418 80 440 98 C 408 112 392 140 390 184 Z",
      },
      {
        id: "tail",
        d: "M 150 310 C 116 290 98 248 98 198 C 70 196 42 176 30 140 C 64 134 90 146 106 166 C 112 140 130 118 158 104 C 168 140 160 172 140 194 C 156 214 180 236 210 252 Z",
      },
      {
        id: "body",
        d: "M 476 292 C 476 214 404 168 306 168 C 214 168 150 220 120 292 C 154 362 222 410 306 410 C 404 410 476 370 476 292 Z",
      },
      {
        id: "belly",
        d: "M 196 384 C 260 340 390 330 466 336 C 448 384 392 410 306 410 C 254 410 218 400 196 384 Z",
      },
      { id: "flipper", d: "M 300 282 C 288 318 258 340 224 344 C 236 310 264 286 300 272 Z" },
      { id: "eye", d: "M 378 262 A 20 20 0 1 1 418 262 A 20 20 0 1 1 378 262 Z", start: WHITE },
      { id: "cheek", d: "M 413 306 A 11 11 0 1 1 435 306 A 11 11 0 1 1 413 306 Z", start: CHEEK, width: 0 },
    ],
    details: [
      { d: "M 392 265 A 10 10 0 1 1 412 265 A 10 10 0 1 1 392 265 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 402 259 A 4 4 0 1 1 410 259 A 4 4 0 1 1 402 259 Z", fill: WHITE, width: 0 },
      { d: "M 438 322 Q 458 330 472 312", width: THIN },
      { d: "M 252 392 Q 320 374 430 368", width: 5 },
    ],
  },
  {
    id: "crab",
    word: "Crab",
    color: "#FF5A5F",
    regions: [
      {
        id: "left legs",
        d: "M 150 300 L 70 290 Q 50 288 44 308 L 30 352 L 58 360 L 72 320 L 150 330 Z M 150 340 L 84 344 Q 66 346 62 364 L 54 404 L 82 410 L 92 374 L 160 370 Z M 170 374 L 116 392 Q 100 398 100 414 L 102 450 L 130 452 L 130 420 L 184 398 Z",
      },
      {
        id: "right legs",
        d: "M 362 300 L 442 290 Q 462 288 468 308 L 482 352 L 454 360 L 440 320 L 362 330 Z M 362 340 L 428 344 Q 446 346 450 364 L 458 404 L 430 410 L 420 374 L 352 370 Z M 342 374 L 396 392 Q 412 398 412 414 L 410 450 L 382 452 L 382 420 L 328 398 Z",
      },
      {
        id: "arms",
        d: "M 182 262 L 128 178 L 162 158 L 216 242 Z M 330 262 L 384 178 L 350 158 L 296 242 Z",
      },
      {
        id: "eye stalks",
        d: "M 208 226 L 208 150 L 232 150 L 232 226 Z M 280 226 L 280 150 L 304 150 L 304 226 Z",
      },
      { id: "body", d: "M 106 300 A 150 100 0 1 1 406 300 A 150 100 0 1 1 106 300 Z" },
      { id: "left claw", d: "M 168 118 L 124 126 L 142 86 A 60 60 0 1 0 168 118 Z" },
      { id: "right claw", d: "M 344 118 L 388 126 L 370 86 A 60 60 0 1 1 344 118 Z" },
      {
        id: "eyes",
        d: "M 194 136 A 26 26 0 1 1 246 136 A 26 26 0 1 1 194 136 Z M 266 136 A 26 26 0 1 1 318 136 A 26 26 0 1 1 266 136 Z",
        start: WHITE,
      },
      {
        id: "cheeks",
        d: "M 171 318 A 13 13 0 1 1 197 318 A 13 13 0 1 1 171 318 Z M 315 318 A 13 13 0 1 1 341 318 A 13 13 0 1 1 315 318 Z",
        start: CHEEK,
        width: 0,
      },
    ],
    details: [
      { d: "M 212 140 A 12 12 0 1 1 236 140 A 12 12 0 1 1 212 140 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 276 140 A 12 12 0 1 1 300 140 A 12 12 0 1 1 276 140 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 224 134 A 4 4 0 1 1 232 134 A 4 4 0 1 1 224 134 Z", fill: WHITE, width: 0 },
      { d: "M 288 134 A 4 4 0 1 1 296 134 A 4 4 0 1 1 288 134 Z", fill: WHITE, width: 0 },
      { d: "M 226 322 Q 256 346 286 322", width: THIN },
    ],
  },
  {
    id: "jellyfish",
    word: "Jellyfish",
    color: "#A66BFF",
    regions: [
      {
        id: "tentacle 1",
        d: "M 137 262 C 109 330 165 390 137 440 A 13 13 0 0 0 163 440 C 191 390 135 330 163 262 Z",
      },
      {
        id: "tentacle 2",
        d: "M 209 262 C 237 330 181 390 209 478 A 13 13 0 0 0 235 478 C 207 390 263 330 235 262 Z",
      },
      {
        id: "tentacle 3",
        d: "M 277 262 C 249 330 305 390 277 478 A 13 13 0 0 0 303 478 C 331 390 275 330 303 262 Z",
      },
      {
        id: "tentacle 4",
        d: "M 349 262 C 377 330 321 390 349 440 A 13 13 0 0 0 375 440 C 347 390 403 330 375 262 Z",
      },
      {
        id: "frill",
        d: "M 100 236 L 412 236 L 412 262 Q 386 304 360 262 Q 334 304 308 262 Q 282 304 256 262 Q 230 304 204 262 Q 178 304 152 262 Q 126 304 100 262 Z",
      },
      { id: "bell", d: "M 100 250 C 100 128 170 52 256 52 C 342 52 412 128 412 250 Z" },
      {
        id: "spots",
        d: "M 236 96 A 20 20 0 1 1 276 96 A 20 20 0 1 1 236 96 Z M 162 130 A 14 14 0 1 1 190 130 A 14 14 0 1 1 162 130 Z M 322 130 A 14 14 0 1 1 350 130 A 14 14 0 1 1 322 130 Z M 128 206 A 14 14 0 1 1 156 206 A 14 14 0 1 1 128 206 Z M 356 206 A 14 14 0 1 1 384 206 A 14 14 0 1 1 356 206 Z",
      },
      {
        id: "eyes",
        d: "M 194 182 A 20 20 0 1 1 234 182 A 20 20 0 1 1 194 182 Z M 278 182 A 20 20 0 1 1 318 182 A 20 20 0 1 1 278 182 Z",
        start: WHITE,
      },
      {
        id: "cheeks",
        d: "M 173 216 A 11 11 0 1 1 195 216 A 11 11 0 1 1 173 216 Z M 317 216 A 11 11 0 1 1 339 216 A 11 11 0 1 1 317 216 Z",
        start: CHEEK,
        width: 0,
      },
    ],
    details: [
      { d: "M 206 186 A 10 10 0 1 1 226 186 A 10 10 0 1 1 206 186 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 286 186 A 10 10 0 1 1 306 186 A 10 10 0 1 1 286 186 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 216 180 A 4 4 0 1 1 224 180 A 4 4 0 1 1 216 180 Z", fill: WHITE, width: 0 },
      { d: "M 296 180 A 4 4 0 1 1 304 180 A 4 4 0 1 1 296 180 Z", fill: WHITE, width: 0 },
      { d: "M 236 214 Q 256 232 276 214", width: THIN },
    ],
  },
  {
    id: "seahorse",
    word: "Seahorse",
    color: "#FFD93D",
    regions: [
      { id: "crown", d: "M 236 104 L 244 50 L 266 86 L 288 40 L 300 90 L 326 62 L 322 112 Z" },
      { id: "fin", d: "M 326 222 C 378 206 414 238 412 292 C 384 304 354 302 334 290 Z" },
      {
        id: "tail",
        d: "M 226 330 C 210 420 250 486 330 486 C 394 486 430 446 416 400 C 404 362 352 356 340 392 C 332 418 352 436 376 426 C 380 448 360 456 330 456 C 280 456 256 410 276 334 Z",
      },
      { id: "snout", d: "M 214 128 L 140 140 Q 112 144 112 162 Q 112 180 140 180 L 214 186 Z" },
      {
        id: "body",
        d: "M 232 176 C 172 216 160 300 200 350 C 232 390 300 396 332 360 C 366 320 356 236 322 184 Z",
      },
      { id: "head", d: "M 196 144 A 72 62 0 1 1 340 144 A 72 62 0 1 1 196 144 Z" },
      {
        id: "belly",
        d: "M 222 196 C 186 232 180 300 212 344 C 232 330 236 296 238 266 C 240 236 248 214 262 200 Z",
      },
      { id: "eye", d: "M 238 132 A 20 20 0 1 1 278 132 A 20 20 0 1 1 238 132 Z", start: WHITE },
      { id: "cheek", d: "M 219 170 A 11 11 0 1 1 241 170 A 11 11 0 1 1 219 170 Z", start: CHEEK, width: 0 },
    ],
    details: [
      { d: "M 244 135 A 10 10 0 1 1 264 135 A 10 10 0 1 1 244 135 Z", fill: COLORING_OUTLINE, width: 0 },
      { d: "M 248 129 A 4 4 0 1 1 256 129 A 4 4 0 1 1 248 129 Z", fill: WHITE, width: 0 },
      { d: "M 118 168 Q 126 174 134 170", width: THIN },
      { d: "M 196 252 Q 214 256 236 248 M 194 290 Q 212 296 234 288 M 204 326 Q 218 330 232 322", width: 5 },
    ],
  },
];

/** The big parts a picture needs colored to finish; pre-colored small parts are extra. */
export function getMainRegions(page: ColoringPage): ColoringRegion[] {
  return page.regions.filter((region) => !region.start);
}

/** True once every main region on the page has been colored at least once. */
export function isPageComplete(filled: ColoringFills, page: ColoringPage): boolean {
  return getMainRegions(page).every((region) => Boolean(filled[region.id]));
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
