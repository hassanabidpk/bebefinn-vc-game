/** English copy for the two thinking games. */
export const gameMessages = {
  patterns: "Bubble Patterns", builder: "Little Reef Builder", home: "Back home",
  help: "Show a hint", replay: "Say and show it again", next: "Next",
  newBracelet: "Another bracelet", bracelet: "You made a bracelet!",
  patternPrompt: "What comes next?", patternPraise: "You made a pattern!",
  choose: "Tap what comes next", patternHint: "Look at the repeating group.",
  sequence: "Treasure pattern", missing: "What comes next?",
  shell: "Shell", starfish: "Starfish", fish: "Fish", crab: "Crab",
  above: "Above the rock", below: "Below the rock", inside: "Inside the cave",
  beside: "Beside the seaweed", water: "Open water above the seaweed",
  select: "Tap your friend, then its place", place: "Now tap a landing pad",
  builderPraise: "You built a lovely reef!", replayReef: "Replay reef",
  newReef: "New reef", reefShelf: "My reef tiles", completed: "Completed",
  locked: "Finish the previous reef to visit", quiet: "Turn voice off", voice: "Turn voice on",
  patternsChip: "🫧 Patterns", builderChip: "🪸 Build", more: "More games", previous: "First games",
  loading: "Opening your ocean…", path: "Continue on the next row",
} as const;
export const symbolNames = {
  shell: gameMessages.shell, starfish: gameMessages.starfish,
  fish: gameMessages.fish, crab: gameMessages.crab,
} as const;
