"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { BebeFinnCharacter } from "@/components/game/bebefinn-character";
import { AlphabetGame } from "@/components/game/alphabet-game";
import { useGameAudio } from "@/hooks/use-game-audio";

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const {
    isMusicPlaying,
    playStart,
    startBackgroundMusic,
    stopBackgroundMusic,
    toggleBackgroundMusic,
  } = useGameAudio();

  const handleStart = () => {
    playStart();
    startBackgroundMusic();
    setGameStarted(true);
  };

  const handleBackToHome = () => {
    stopBackgroundMusic();
    setGameStarted(false);
  };

  if (gameStarted) {
    return (
      <AlphabetGame
        isMusicPlaying={isMusicPlaying}
        onBack={handleBackToHome}
        onToggleMusic={toggleBackgroundMusic}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden px-5 py-6"
      style={{
        background:
          "radial-gradient(circle at 50% 12%, rgba(255,255,255,0.35), transparent 30%), linear-gradient(to bottom, #59d3ff 0%, #0ba4e8 48%, #00638f 100%)",
      }}
    >
      <BubbleBackground />

      {/* Wavy ocean floor */}
      <div className="absolute bottom-0 left-0 right-0 z-0">
        <svg viewBox="0 0 1440 200" className="w-full">
          <path
            d="M0 80 C360 20 720 140 1080 60 C1260 20 1380 60 1440 40 L1440 200 L0 200 Z"
            fill="#005580"
            opacity="0.5"
          />
          <path
            d="M0 120 C240 80 480 160 720 100 C960 40 1200 140 1440 80 L1440 200 L0 200 Z"
            fill="#00334d"
            opacity="0.7"
          />
        </svg>
        {/* Seaweed */}
        <div className="absolute bottom-8 left-[10%]">
          <motion.div
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="text-4xl"
          >
            🌿
          </motion.div>
        </div>
        <div className="absolute bottom-4 left-[30%]">
          <motion.div
            animate={{ rotate: [5, -5, 5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="text-3xl"
          >
            🪸
          </motion.div>
        </div>
        <div className="absolute bottom-6 right-[20%]">
          <motion.div
            animate={{ rotate: [-3, 3, -3] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="text-4xl"
          >
            🌊
          </motion.div>
        </div>
        <div className="absolute bottom-3 right-[40%]">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-2xl"
          >
            🐚
          </motion.div>
        </div>
      </div>

      {/* Sea creatures */}
      <motion.div
        className="absolute top-[15%] left-[8%] text-4xl z-0"
        animate={{ x: [0, 30, 0], y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        🐠
      </motion.div>
      <motion.div
        className="absolute top-[25%] right-[10%] text-3xl z-0"
        animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        🐡
      </motion.div>
      <motion.div
        className="absolute bottom-[30%] left-[5%] text-5xl z-0"
        animate={{ x: [0, 40, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        🐢
      </motion.div>
      <motion.div
        className="absolute top-[10%] right-[25%] text-2xl z-0"
        animate={{ x: [0, -15, 0], y: [0, 8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        ⭐
      </motion.div>

      <div className="absolute inset-x-0 top-0 z-0 h-28 bg-white/10 blur-3xl" />

      {/* Main content */}
      <main className="relative z-10 flex h-full w-full max-w-5xl flex-col items-center justify-between gap-4 py-3 sm:justify-center sm:gap-7">
        {/* Title */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="text-center"
        >
          <p className="font-display text-lg font-bold text-sand drop-shadow-md sm:text-2xl">
            ABC Ocean
          </p>
          <h1 className="font-display text-6xl font-bold leading-none text-white drop-shadow-lg sm:text-8xl">
            BebeFinn
          </h1>
          <motion.p
            className="mt-2 font-display text-2xl font-bold text-sunny drop-shadow-md sm:text-4xl"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Alphabet Adventure!
          </motion.p>
        </motion.div>

        {/* BebeFinn character */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", damping: 10 }}
          className="relative"
        >
          <div className="absolute inset-x-8 bottom-3 h-8 rounded-full bg-ocean-900/20 blur-md" />
          <BebeFinnCharacter animation="idle" size={300} />
        </motion.div>

        <motion.div
          initial={{ y: 45, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55, type: "spring" }}
          className="flex w-full max-w-md flex-col items-center gap-3"
        >
          {/* Play button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleStart}
            className="relative flex min-h-20 w-full items-center justify-center gap-3 rounded-full bg-coral px-8 py-5 font-display text-3xl font-bold text-white shadow-2xl outline-none ring-4 ring-white/55 transition focus-visible:ring-sunny sm:text-4xl"
            style={{
              boxShadow: "0 10px 0 #E0475A, 0 18px 28px rgba(0,51,77,0.28)",
            }}
            aria-label="Start alphabet adventure"
          >
            <motion.span
              animate={{ rotate: [-8, 8, -8], scale: [1, 1.12, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl sm:h-14 sm:w-14 sm:text-3xl"
              aria-hidden="true"
            >
              ▶
            </motion.span>
            Start
          </motion.button>

          <div className="grid w-full grid-cols-3 gap-2 text-center font-display text-sm font-bold text-white sm:text-base">
            <div className="rounded-full bg-white/22 px-3 py-2 shadow-lg backdrop-blur-sm">
              A-Z
            </div>
            <div className="rounded-full bg-white/22 px-3 py-2 shadow-lg backdrop-blur-sm">
              Listen
            </div>
            <div className="rounded-full bg-white/22 px-3 py-2 shadow-lg backdrop-blur-sm">
              Play
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
