"use client";

/**
 * Card visual sticker — circular sticker with coloured ring, soft shine,
 * and an idle micro-animation. Renders either:
 *   - a photo (when a path is mapped in CARD_IMAGES), or
 *   - a giant emoji rendered inside the ring (when EMOJI_STICKERS provides one).
 *
 * Image assets live under /public/animals/ and /public/assets/images/.
 */

const CARD_IMAGES: Record<string, string> = {
  Alpaca: "/animals/Alpaca.jpg",
  Bear: "/animals/Bear.jpg",
  Cat: "/animals/Cat.jpg",
  Dog: "/animals/Dog.jpg",
  Elephant: "/animals/Elephant.jpg",
  Fish: "/animals/Fish.jpg",
  Gorilla: "/animals/Gorilla.jpg",
  Jellyfish: "/animals/Jellyfish.jpg",
  Kangaroo: "/animals/Kangaroo.jpg",
  Lion: "/animals/Lion.jpg",
  Panda: "/animals/Panda.jpg",
  Quokka: "/animals/Quokka.jpg",
  Turtle: "/animals/Turtle.jpg",
  Whale: "/animals/Whale.jpg",
  Yak: "/animals/Yak.jpg",
  Zebra: "/animals/Zebra.jpg",
  // H for Handsome Zaven uses the BebeFinn mascot image.
  "Handsome Zaven": "/assets/images/bebefinn.png",
};

/** Words rendered as a giant centred emoji inside the sticker ring instead
 *  of a photo. Useful when there's no clean licensed photo (e.g. R for
 *  Renee Princesse — Disney IP can't be redistributed). */
const EMOJI_STICKERS: Record<string, string> = {
  "Renee Princesse": "👸",
};

const ANIM_CLASS: Record<string, string> = {
  Cat: "a-bob",
  Dog: "a-hop",
  Lion: "a-breathe",
  Panda: "a-bob",
  Elephant: "a-sway",
  Fish: "a-swim",
  Turtle: "a-bob",
  Whale: "a-swim",
  Zebra: "a-trot",
  Gorilla: "a-breathe",
  Jellyfish: "a-pulse",
  Alpaca: "a-sway",
  Bear: "a-breathe",
  Koala: "a-bob",
  Quokka: "a-hop",
  Yak: "a-sway",
  "Handsome Zaven": "a-bob",
  "Renee Princesse": "a-sway",
};

export function hasAnimalPhoto(word: string) {
  return Boolean(CARD_IMAGES[word] || EMOJI_STICKERS[word]);
}

interface AnimalPhotoProps {
  word: string;
  color?: string;
  size?: number;
}

export function AnimalPhoto({ word, color, size = 220 }: AnimalPhotoProps) {
  const photoUrl = CARD_IMAGES[word];
  const emoji = EMOJI_STICKERS[word];
  if (!photoUrl && !emoji) return null;
  const ring = color || "#ffffff";
  const animClass = ANIM_CLASS[word] || "a-bob";
  const isPhoto = Boolean(photoUrl);
  const isPng = photoUrl?.endsWith(".png");

  return (
    <div
      className={`animal-photo-wrap ${animClass}`}
      style={
        {
          width: size,
          height: size,
          ["--ring" as string]: ring,
          // PNG mascot sits on a soft tinted backdrop instead of a white
          // square so transparency reads as part of the ring.
          background: isPng
            ? `radial-gradient(circle at 50% 30%, ${ring}33 0%, ${ring}66 60%, ${ring}88 100%)`
            : "#fff",
        } as React.CSSProperties
      }
    >
      <div className="animal-photo-ring" />
      {isPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="animal-photo"
          src={photoUrl}
          alt={word}
          draggable={false}
          loading="lazy"
          style={isPng ? { objectFit: "contain", padding: "6%" } : undefined}
        />
      ) : (
        <div
          className="animal-photo"
          aria-label={word}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `radial-gradient(circle at 50% 30%, ${ring}aa 0%, ${ring}55 60%, ${ring}33 100%)`,
            fontSize: size * 0.66,
            lineHeight: 1,
            filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.18))",
          }}
        >
          {emoji}
        </div>
      )}
      <div className="animal-photo-shine" />
    </div>
  );
}
