---
name: lesson-video-pipeline
description: Generate or refresh Veo 3.1 lesson clips for Ocean Buddy and publish them to Vercel Blob. Use when asked to add/replace an animal or number video, write a Veo prompt, add a second variant clip, or fix the src/lib/animal-videos.ts manifest.
---

# Veo lesson video pipeline

Two scripts, run in order, both manual (slow + paid — never wired into the build).

## 0. Where things live

| Thing | Path |
| --- | --- |
| Prompts | `APPROVED_PROMPTS` / `APPROVED_VARIANT_PROMPTS` in `scripts/generate-videos.ts` |
| Generator | `scripts/generate-videos.ts` (`npm run videos:generate`) |
| Uploader | `scripts/upload-videos-blob.ts` (`npm run videos:upload`) |
| Manifest | `src/lib/animal-videos.ts` — **auto-generated, never hand-edit** |
| Local MP4s | `public/assets/videos/` — **gitignored**; Vercel Blob is the source of truth |
| Narration source | `src/lib/animal-info.ts` |

Slug rule: lowercase, non-alphanumerics → `-` (`"Ice Cream"` → `ice-cream.mp4`).
Variants are `{slug}-2.mp4`; the manifest groups a word's clips into an array
(`Record<string, string | string[]>`) and the app picks one at random per play.

## 1. Add or edit the prompt

Add an entry to `APPROVED_PROMPTS` (first/only clip for a word) or `APPROVED_VARIANT_PROMPTS`
(higher-energy second take, saved as `{slug}-2.mp4`). Both are keyed by the exact lesson word.

Existing prompts follow this shape — keep it:

- Shot + subject: `"Medium shot of a friendly alligator resting near a sunny pond…"`
- Camera + lens + light: `"Slow push-in, 50mm lens, warm soft daylight."`
- Style line: `"Photorealistic wildlife documentary for young children, vibrant and clean,
  single clear subject"`, plus `"friendly not scary"` for anything a toddler could find scary
  (shark, alligator, vulture, iguana).
- Audio line, with the narration **quoted exactly as it appears in `src/lib/animal-info.ts`**:
  `Audio: a warm friendly female narrator says cheerfully, "Alligators have big tails!" — no
  background music, natural ambient sound only.`
- `Mood: happy, calm, wholesome.`
- Safety tail: `No on-screen text, no captions, no people. 8 seconds, 16:9.`
  (Counting clips also append `no letters, no digits, no symbols`.)

Character words (Renee, Handsome Xaven) use a stylised 3D mascot look and say
`stylized cartoon (not a real person)` / `no real people` instead. Counting clips state the exact
object count and arrangement so a toddler can count them.

Words deliberately absent from `APPROVED_PROMPTS` (e.g. Mommy) keep their existing Blob clips and
must not be regenerated.

## 2. Generate

```bash
npx tsx scripts/generate-videos.ts             # every missing clip
npx tsx scripts/generate-videos.ts Lion Whale  # only these words
npx tsx scripts/generate-videos.ts 1 2 3       # only these numbers
```

- Needs `GEMINI_API_KEY` (auto-read from `.env.local`).
- ~2-5 min per clip; progress prints dots while polling.
- Resumable: skips any word whose MP4 already exists locally. **To re-shoot a clip you must delete
  the local MP4 first**, otherwise it is silently skipped.
- Passing `Shark` also matches its `-2` variant; `shark-2` matches only the variant.
- `--vertex` (or `VIDEO_PROVIDER=vertex`) runs through Vertex AI with ADC instead of the Gemini
  API key — needs `VERTEX_PROJECT` or `gcloud config set project`. Use it when the Gemini free-tier
  daily cap bites.
- The generator rewrites the manifest with **local** `/assets/videos/…` paths. That is an
  intermediate state — always follow with the upload step so the manifest ends on Blob URLs.

## 3. Upload to Vercel Blob

```bash
npx tsx scripts/upload-videos-blob.ts                      # upload everything
VIDEO_REV=3 npx tsx scripts/upload-videos-blob.ts shark-2.mp4 whale-2.mp4
npx tsx scripts/upload-videos-blob.ts --manifest-only      # re-emit manifest, no uploads
```

- Needs `BLOB_READ_WRITE_TOKEN` (from `.env.local`).
- **File args upload only those files**; every other clip is linked at its known stable Blob path,
  so a one-clip fix does not re-push the whole library.
- Blob paths are stable (`videos/{slug}.mp4`, `allowOverwrite`, `cacheControlMaxAge` 1 year), so
  overwritten bytes will not reach clients without a cache-key change. `VIDEO_REV` appends
  `?v=REV` to the manifest URLs. **Bump it only when you replaced the bytes of an existing clip;
  keep the current rev when merely adding new files** — bumping busts the CDN cache for every clip.
  Check the current rev by reading the `?v=` suffix in `src/lib/animal-videos.ts`.
- Files with no matching lesson word are skipped with a warning — that means the slug does not map
  to an entry from `getAlphabetEntriesWithVariants()` that also exists in `ANIMAL_INFO`.

## 4. Verify

```bash
npx tsc --noEmit
npx vitest run
git diff src/lib/animal-videos.ts   # should be the only source change
```

The manifest diff is the deliverable: new/changed Blob URLs, correct `?v=` rev, arrays only where
a word genuinely has multiple clips. The MP4s themselves stay out of git.
