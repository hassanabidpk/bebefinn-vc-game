/**
 * Static configs for the two ride games. Animal words match keys in
 * `alphabet-data.ts` / `animal-info.ts` so speech facts and card colors
 * stay consistent with the rest of the app.
 */

export type RideWorldId = "safari" | "ocean";

export interface RideAnimalSpec {
  /** Display + speech word, capitalized like ANIMAL_INFO keys. */
  word: string;
  emoji: string;
  color: string;
  /** Realistic photo shown in-world and on the encounter panel. */
  photo: string;
  /** Position along the closed track, 0..1. */
  t: number;
  /** Which side of the track the animal stands on. */
  side: -1 | 1;
  /** Key for playAnimalSound; omitted when no playful sound fits. */
  soundKey?: string;
}

export interface RideConfig {
  id: RideWorldId;
  title: string;
  titleEmoji: string;
  vehicleEmoji: string;
  animals: RideAnimalSpec[];
}

export const SAFARI_RIDE: RideConfig = {
  id: "safari",
  title: "Safari Ride",
  titleEmoji: "🦁",
  vehicleEmoji: "🚙",
  animals: [
    { word: "Lion", emoji: "🦁", color: "#E8A33D", photo: "/animals/lion.png", t: 0.12, side: 1, soundKey: "lion" },
    { word: "Elephant", emoji: "🐘", color: "#9B8FC7", photo: "/animals/elephant.png", t: 0.28, side: -1, soundKey: "elephant" },
    { word: "Giraffe", emoji: "🦒", color: "#F4B350", photo: "/animals/giraffe.jpeg", t: 0.45, side: 1, soundKey: "giraffe" },
    { word: "Zebra", emoji: "🦓", color: "#5D6D7E", photo: "/animals/zebra.png", t: 0.62, side: -1, soundKey: "zebra" },
    { word: "Monkey", emoji: "🐵", color: "#A0522D", photo: "/animals/monkey.jpeg", t: 0.78, side: 1, soundKey: "gorilla" },
    { word: "Hippo", emoji: "🦛", color: "#8E7CC3", photo: "/animals/hippo.jpeg", t: 0.92, side: -1, soundKey: "hippo" },
  ],
};

export const OCEAN_RIDE: RideConfig = {
  id: "ocean",
  title: "Ocean Dive",
  titleEmoji: "🐋",
  vehicleEmoji: "🛥️",
  animals: [
    { word: "Whale", emoji: "🐋", color: "#3D7EA6", photo: "/animals/whale.png", t: 0.12, side: 1, soundKey: "whale" },
    { word: "Dolphin", emoji: "🐬", color: "#1ABCDB", photo: "/animals/dolphin.jpeg", t: 0.28, side: -1, soundKey: "dolphin" },
    { word: "Turtle", emoji: "🐢", color: "#41A85F", photo: "/animals/turtle.png", t: 0.45, side: 1, soundKey: "turtle" },
    { word: "Octopus", emoji: "🐙", color: "#E86FA4", photo: "/animals/octopus.jpeg", t: 0.62, side: -1, soundKey: "octopus" },
    { word: "Shark", emoji: "🦈", color: "#7F8FA6", photo: "/animals/shark.png", t: 0.78, side: 1, soundKey: "shark" },
    { word: "Jellyfish", emoji: "🪼", color: "#C39BD3", photo: "/animals/jellyfish.png", t: 0.92, side: -1, soundKey: "jellyfish" },
  ],
};

export const RIDE_CONFIGS: Record<RideWorldId, RideConfig> = {
  safari: SAFARI_RIDE,
  ocean: OCEAN_RIDE,
};
