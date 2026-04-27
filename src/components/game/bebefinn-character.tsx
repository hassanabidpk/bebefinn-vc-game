"use client";

import { motion } from "framer-motion";
import Image from "next/image";

type AnimationState = "idle" | "talking" | "celebrating";

interface BebeFinnCharacterProps {
  animation?: AnimationState;
  size?: number;
  onClick?: () => void;
}

export function BebeFinnCharacter({
  animation = "idle",
  size = 180,
  onClick,
}: BebeFinnCharacterProps) {
  const animationVariants = {
    idle: {
      y: [0, -8, 0],
      rotate: [0, 2, -2, 0],
      transition: {
        y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" },
      },
    },
    talking: {
      y: [0, -5, 0],
      scale: [1, 1.05, 1],
      transition: {
        y: { duration: 0.6, repeat: Infinity, ease: "easeInOut" },
        scale: { duration: 0.4, repeat: Infinity, ease: "easeInOut" },
      },
    },
    celebrating: {
      y: [0, -20, 0],
      rotate: [0, -10, 10, -10, 10, 0],
      scale: [1, 1.15, 1],
      transition: {
        y: { duration: 0.5, repeat: Infinity, ease: "easeOut" },
        rotate: { duration: 0.8, repeat: Infinity },
        scale: { duration: 0.5, repeat: Infinity },
      },
    },
  };

  return (
    <motion.div
      className="cursor-pointer select-none"
      animate={animation}
      variants={animationVariants}
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      style={{ width: size, height: size }}
    >
      <Image
        src="/assets/images/bebefinn.png"
        alt="BebeFinn"
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
        priority
        draggable={false}
      />
    </motion.div>
  );
}
