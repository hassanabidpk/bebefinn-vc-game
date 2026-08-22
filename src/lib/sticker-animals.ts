/**
 * The twelve animal friends collectable in the sticker book. Words match
 * keys in `alphabet-data.ts` / `animal-info.ts`; photos live in /public/animals.
 */

export interface StickerAnimal {
  word: string;
  emoji: string;
  color: string;
  photo: string;
  /** Key for playAnimalSound; omitted when no playful sound fits. */
  soundKey?: string;
}

export const STICKER_ANIMALS: StickerAnimal[] = [
  { word: "Lion", emoji: "🦁", color: "#E8A33D", photo: "/animals/lion.png", soundKey: "lion" },
  { word: "Elephant", emoji: "🐘", color: "#9B8FC7", photo: "/animals/elephant.png", soundKey: "elephant" },
  { word: "Giraffe", emoji: "🦒", color: "#F4B350", photo: "/animals/giraffe.jpeg", soundKey: "giraffe" },
  { word: "Zebra", emoji: "🦓", color: "#5D6D7E", photo: "/animals/zebra.png", soundKey: "zebra" },
  { word: "Monkey", emoji: "🐵", color: "#A0522D", photo: "/animals/monkey.jpeg", soundKey: "gorilla" },
  { word: "Hippo", emoji: "🦛", color: "#8E7CC3", photo: "/animals/hippo.jpeg", soundKey: "hippo" },
  { word: "Whale", emoji: "🐋", color: "#3D7EA6", photo: "/animals/whale.png", soundKey: "whale" },
  { word: "Dolphin", emoji: "🐬", color: "#1ABCDB", photo: "/animals/dolphin.jpeg", soundKey: "dolphin" },
  { word: "Turtle", emoji: "🐢", color: "#41A85F", photo: "/animals/turtle.png", soundKey: "turtle" },
  { word: "Octopus", emoji: "🐙", color: "#E86FA4", photo: "/animals/octopus.jpeg", soundKey: "octopus" },
  { word: "Shark", emoji: "🦈", color: "#7F8FA6", photo: "/animals/shark.png", soundKey: "shark" },
  { word: "Jellyfish", emoji: "🪼", color: "#C39BD3", photo: "/animals/jellyfish.png", soundKey: "jellyfish" },
];
