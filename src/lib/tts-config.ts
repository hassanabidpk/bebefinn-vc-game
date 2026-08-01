export const TTS_CACHE_VERSION = "preschool-v2";

const LETTER_NAME_CACHE_VERSION = "alphabet-names-v1";

export function getTtsCacheKeySource(voice: string, text: string) {
  const version = /^[A-Z][!.]?$/.test(text.trim())
    ? `${TTS_CACHE_VERSION}-${LETTER_NAME_CACHE_VERSION}`
    : TTS_CACHE_VERSION;
  return `${version}|${voice}|${text}`;
}
