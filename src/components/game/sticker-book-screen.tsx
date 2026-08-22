"use client";

import { useEffect, useState } from "react";
import { spellingWords } from "@/lib/spelling-data";
import { getStandaloneLetterSpeech } from "@/lib/tts-phrases";
import { getStickerPhrase } from "@/lib/game-speech";
import { countStickers, emptyProgress, loadProgress, type StickerProgress } from "@/lib/progress-store";
import { useFriendlySpeech } from "@/hooks/use-friendly-speech";
import { useGameAudio } from "@/hooks/use-game-audio";
import { AnimalPhoto } from "./animal-photo";
import { BubbleBackground } from "./ocean-stage";

const ALPHABET = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
import { STICKER_ANIMALS } from "@/lib/sticker-animals";

interface StickerBookScreenProps {
  onHome: () => void;
}

export function StickerBookScreen({ onHome }: StickerBookScreenProps) {
  // Load on the client only, after mount, so SSR and hydration agree.
  const [progress, setProgress] = useState<StickerProgress>(emptyProgress);
  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const { speak } = useFriendlySpeech();
  const { playAnimalSound, playTap } = useGameAudio();

  const total = countStickers(progress);
  const possible = STICKER_ANIMALS.length + ALPHABET.length + spellingWords.length;

  const tapAnimal = (word: string, soundKey?: string) => {
    playTap();
    if (soundKey) playAnimalSound(soundKey);
    speak(getStickerPhrase(word));
  };

  return (
    <div className="sticker-book">
      <BubbleBackground />
      <header className="sticker-book-header">
        <button className="icon-btn" onClick={onHome} aria-label="Back home">←</button>
        <div className="progress-pill">
          <span className="progress-letter">⭐ My Stickers</span>
        </div>
        <div className="score-pill">
          <span className="star">⭐</span>
          {total} / {possible}
        </div>
      </header>

      <div className="sticker-book-shelves">
        <section className="sticker-shelf">
          <h2 className="sticker-shelf-title">🐾 Animal friends</h2>
          <div className="sticker-grid sticker-grid-animals">
            {STICKER_ANIMALS.map((animal) => {
              const earned = progress.rideAnimals.includes(animal.word);
              return (
                <button
                  key={animal.word}
                  className={`sticker-card ${earned ? "earned" : "locked"}`}
                  style={{ borderColor: earned ? animal.color : undefined }}
                  onClick={() => earned && tapAnimal(animal.word, animal.soundKey)}
                  aria-label={earned ? animal.word : "Locked sticker"}
                  disabled={!earned}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={animal.photo} alt="" draggable={false} />
                  <span className="sticker-card-label" style={{ color: earned ? animal.color : undefined }}>
                    {earned ? animal.word : "?"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="sticker-shelf">
          <h2 className="sticker-shelf-title">🫧 Rescued letters</h2>
          <div className="sticker-grid sticker-grid-letters">
            {ALPHABET.map((letter) => {
              const earned = progress.rescueLetters.includes(letter);
              return (
                <button
                  key={letter}
                  className={`sticker-letter ${earned ? "earned" : "locked"}`}
                  onClick={() => {
                    if (!earned) return;
                    playTap();
                    speak(getStandaloneLetterSpeech(letter));
                  }}
                  aria-label={earned ? `Letter ${letter}` : "Locked letter"}
                  disabled={!earned}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </section>

        <section className="sticker-shelf">
          <h2 className="sticker-shelf-title">🔤 Spelled words</h2>
          <div className="sticker-grid sticker-grid-words">
            {spellingWords.map((entry) => {
              const earned = progress.spellWords.includes(entry.word);
              return (
                <button
                  key={entry.word}
                  className={`sticker-card sticker-card-word ${earned ? "earned" : "locked"}`}
                  style={{ borderColor: earned ? entry.color : undefined }}
                  onClick={() => {
                    if (!earned) return;
                    playTap();
                    speak(getStickerPhrase(entry.word));
                  }}
                  aria-label={earned ? entry.word : "Locked sticker"}
                  disabled={!earned}
                >
                  <AnimalPhoto word={entry.word} color={entry.color} size={84} />
                  <span className="sticker-card-label" style={{ color: earned ? entry.color : undefined }}>
                    {earned ? entry.word : "?"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
