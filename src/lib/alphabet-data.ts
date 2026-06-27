export interface AlphabetEntry {
  letter: string;
  word: string;
  spokenWord?: string;
  emoji: string;
  color: string;
  variants?: AlphabetEntry[];
}

export const alphabetData: AlphabetEntry[] = [
  {
    letter: "A",
    word: "Alpaca",
    emoji: "🦙",
    color: "#C49A6C",
    variants: [{ letter: "A", word: "Alligator", emoji: "🐊", color: "#2ECC71" }],
  },
  {
    letter: "B",
    word: "Bear",
    emoji: "🐻",
    color: "#A0522D",
    variants: [{ letter: "B", word: "Butterfly", emoji: "🦋", color: "#54A0FF" }],
  },
  {
    letter: "C",
    word: "Cat",
    emoji: "🐱",
    color: "#FF9F43",
    variants: [{ letter: "C", word: "Cow", emoji: "🐄", color: "#7F8C8D" }],
  },
  {
    letter: "D",
    word: "Dog",
    emoji: "🐶",
    color: "#A0522D",
    variants: [{ letter: "D", word: "Dolphin", emoji: "🐬", color: "#1ABCDB" }],
  },
  { letter: "E", word: "Elephant", emoji: "🐘", color: "#95A5A6" },
  {
    letter: "F",
    word: "Fish",
    emoji: "🐟",
    color: "#54A0FF",
    variants: [{ letter: "F", word: "Frog", emoji: "🐸", color: "#27AE60" }],
  },
  { letter: "G", word: "Gorilla", emoji: "🦍", color: "#8854D0" },
  { letter: "H", word: "Hippo", emoji: "🦛", color: "#7F8C8D" },
  { letter: "I", word: "Ice Cream", emoji: "🍦", color: "#FFEAA7" },
  { letter: "J", word: "Jellyfish", emoji: "🪼", color: "#DDA0DD" },
  { letter: "K", word: "Kangaroo", emoji: "🦘", color: "#B5651D" },
  { letter: "L", word: "Lion", emoji: "🦁", color: "#F39C12" },
  { letter: "M", word: "Mommy", emoji: "👩", color: "#F1C40F" },
  { letter: "N", word: "Nest", emoji: "🪺", color: "#8B4513" },
  {
    letter: "O",
    word: "Octopus",
    emoji: "🐙",
    color: "#9B59B6",
    variants: [{ letter: "O", word: "Otter", emoji: "🦦", color: "#8B5A2B" }],
  },
  {
    letter: "P",
    word: "Panda",
    emoji: "🐼",
    color: "#3C4858",
    variants: [{ letter: "P", word: "Penguin", emoji: "🐧", color: "#2C3E50" }],
  },
  { letter: "Q", word: "Quokka", emoji: "🦘", color: "#9B59B6" },
  { letter: "R", word: "Renee", emoji: "👸", color: "#E74C3C" },
  { letter: "S", word: "Shark", emoji: "🦈", color: "#34495E" },
  { letter: "T", word: "Turtle", emoji: "🐢", color: "#27AE60" },
  { letter: "U", word: "Unicorn", emoji: "🦄", color: "#A569BD" },
  { letter: "V", word: "Vulture", emoji: "🦅", color: "#7D6608" },
  { letter: "W", word: "Whale", emoji: "🐋", color: "#2980B9" },
  { letter: "X", word: "Handsome Xaven", spokenWord: "Handsome Zaven", emoji: "🤴", color: "#E74C3C" },
  { letter: "Y", word: "Yak", emoji: "🐃", color: "#5D4037" },
  { letter: "Z", word: "Zebra", emoji: "🦓", color: "#2C3E50" },
  { letter: "1", word: "1", emoji: "1️⃣", color: "#FF6B6B" },
  { letter: "2", word: "2", emoji: "2️⃣", color: "#FF9F43" },
  { letter: "3", word: "3", emoji: "3️⃣", color: "#FFD93D" },
  { letter: "4", word: "4", emoji: "4️⃣", color: "#6BCB77" },
  { letter: "5", word: "5", emoji: "5️⃣", color: "#54A0FF" },
  { letter: "6", word: "6", emoji: "6️⃣", color: "#00CEC9" },
  { letter: "7", word: "7", emoji: "7️⃣", color: "#8854D0" },
  { letter: "8", word: "8", emoji: "8️⃣", color: "#DDA0DD" },
  { letter: "9", word: "9", emoji: "9️⃣", color: "#E056A0" },
  { letter: "10", word: "10", emoji: "🔟", color: "#F39C12" },
];

export function getAlphabetEntriesWithVariants() {
  return alphabetData.flatMap((entry) => [entry, ...(entry.variants ?? [])]);
}
