export interface AnimalFact {
  /** Display name in English */
  english: string;
  /** Simplified Chinese name */
  chinese: string;
  /** Romanized Chinese (Pinyin) for grown-ups reading along */
  pinyin: string;
  /** One short, kid-friendly fun fact */
  fact: string;
}

/**
 * Per-animal facts shown on the back of the lesson card. Keyed by
 * lower-case English word so the lookup is forgiving.
 */
export const animalFacts: Record<string, AnimalFact> = {
  alpaca: {
    english: "Alpaca",
    chinese: "羊驼",
    pinyin: "yáng tuó",
    fact: "Alpacas hum when they are happy!",
  },
  cat: {
    english: "Cat",
    chinese: "猫",
    pinyin: "māo",
    fact: "Cats can purr to feel calm and to say hello.",
  },
  dog: {
    english: "Dog",
    chinese: "狗",
    pinyin: "gǒu",
    fact: "Dogs wag their tails when they are happy.",
  },
  elephant: {
    english: "Elephant",
    chinese: "大象",
    pinyin: "dà xiàng",
    fact: "Elephants drink water with their long trunks.",
  },
  fish: {
    english: "Fish",
    chinese: "鱼",
    pinyin: "yú",
    fact: "Fish breathe under the water through tiny gills.",
  },
  gorilla: {
    english: "Gorilla",
    chinese: "大猩猩",
    pinyin: "dà xīng xīng",
    fact: "Gorillas live in big families called troops.",
  },
  jellyfish: {
    english: "Jellyfish",
    chinese: "水母",
    pinyin: "shuǐ mǔ",
    fact: "Jellyfish glow and dance through the ocean.",
  },
  lion: {
    english: "Lion",
    chinese: "狮子",
    pinyin: "shī zi",
    fact: "Lions have a big mane and a really loud roar!",
  },
  turtle: {
    english: "Turtle",
    chinese: "海龟",
    pinyin: "hǎi guī",
    fact: "Turtles carry their houses on their backs.",
  },
  whale: {
    english: "Whale",
    chinese: "鲸鱼",
    pinyin: "jīng yú",
    fact: "Whales are the biggest animals in the whole sea!",
  },
  zebra: {
    english: "Zebra",
    chinese: "斑马",
    pinyin: "bān mǎ",
    fact: "Every zebra has its own special stripe pattern.",
  },
};

export function getAnimalFact(word: string) {
  return animalFacts[word.toLowerCase()] ?? null;
}
