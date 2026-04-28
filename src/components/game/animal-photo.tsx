"use client";

/**
 * Per-animal photo sticker — circular crop of a real animal photo with
 * a coloured ring, soft shine highlight, and an idle micro-animation.
 *
 * Photos live in /public/animals/<Word>.jpg and are sized 480x480 (cover-fit).
 */

const ANIMAL_PHOTOS: Record<string, string> = {
  Alpaca: "/animals/Alpaca.jpg",
  Cat: "/animals/Cat.jpg",
  Dog: "/animals/Dog.jpg",
  Elephant: "/animals/Elephant.jpg",
  Fish: "/animals/Fish.jpg",
  Gorilla: "/animals/Gorilla.jpg",
  Jellyfish: "/animals/Jellyfish.jpg",
  Lion: "/animals/Lion.jpg",
  Turtle: "/animals/Turtle.jpg",
  Whale: "/animals/Whale.jpg",
  Zebra: "/animals/Zebra.jpg",
};

const ANIM_CLASS: Record<string, string> = {
  Cat: "a-bob",
  Dog: "a-hop",
  Lion: "a-breathe",
  Elephant: "a-sway",
  Fish: "a-swim",
  Turtle: "a-bob",
  Whale: "a-swim",
  Zebra: "a-trot",
  Gorilla: "a-breathe",
  Jellyfish: "a-pulse",
  Alpaca: "a-sway",
};

export function hasAnimalPhoto(word: string) {
  return Boolean(ANIMAL_PHOTOS[word]);
}

interface AnimalPhotoProps {
  word: string;
  color?: string;
  size?: number;
}

export function AnimalPhoto({ word, color, size = 220 }: AnimalPhotoProps) {
  const url = ANIMAL_PHOTOS[word];
  if (!url) return null;
  const ring = color || "#ffffff";
  const animClass = ANIM_CLASS[word] || "a-bob";

  return (
    <div
      className={`animal-photo-wrap ${animClass}`}
      style={
        {
          width: size,
          height: size,
          ["--ring" as string]: ring,
        } as React.CSSProperties
      }
    >
      <div className="animal-photo-ring" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="animal-photo"
        src={url}
        alt={word}
        draggable={false}
        loading="lazy"
      />
      <div className="animal-photo-shine" />
    </div>
  );
}
