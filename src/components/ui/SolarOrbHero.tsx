"use client";

import React from "react";
import { motion } from "framer-motion";

interface SolarOrbHeroProps {
  size?: "sm" | "md" | "lg";
  animateSpin?: boolean;
}

export function SolarOrbHero({
  size = "md",
  animateSpin = false,
}: SolarOrbHeroProps) {
  const dimensions =
    size === "lg"
      ? "h-56 w-56"
      : size === "sm"
      ? "h-28 w-28"
      : "h-44 w-44";

  const orbSize =
    size === "lg"
      ? "h-24 w-24"
      : size === "sm"
      ? "h-11 w-11"
      : "h-20 w-20";

  return (
    <div
      className={`relative mx-auto flex items-center justify-center ${dimensions}`}
    >
      {/* Concentric SVG Orbital Rings */}
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full"
        animate={animateSpin ? { rotate: 360 } : undefined}
        transition={
          animateSpin
            ? { duration: 28, repeat: Infinity, ease: "linear" }
            : undefined
        }
      >
        <circle
          cx="100"
          cy="100"
          r="94"
          fill="none"
          stroke="rgba(245,166,91,0.14)"
          strokeWidth="1"
        />
        <circle
          cx="100"
          cy="100"
          r="74"
          fill="none"
          stroke="rgba(245,166,91,0.20)"
          strokeWidth="1"
          strokeDasharray={animateSpin ? "4 6" : undefined}
        />
        <circle
          cx="100"
          cy="100"
          r="54"
          fill="none"
          stroke="rgba(255,107,43,0.25)"
          strokeWidth="1"
        />
        {/* Small orbital node dot */}
        <circle cx="100" cy="26" r="2.5" fill="#F5A65B" opacity="0.8" />
        <circle cx="154" cy="100" r="2" fill="#FF6B2B" opacity="0.7" />
      </motion.svg>

      {/* Blurred Warm Solar Glow */}
      <motion.div
        animate={{ scale: [1, 1.07, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className={`relative rounded-full blur-xl ${orbSize}`}
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #F5A65B 0%, #FF6B2B 52%, #C8420E 100%)",
          boxShadow: "0 0 50px rgba(255, 107, 43, 0.55)",
        }}
      />

      {/* Crisp Inner Core */}
      <div
        className={`absolute rounded-full ${
          size === "lg"
            ? "h-12 w-12"
            : size === "sm"
            ? "h-6 w-6"
            : "h-10 w-10"
        }`}
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #FDF6EE 0%, #F5A65B 45%, #FF6B2B 100%)",
          boxShadow: "0 0 24px rgba(245, 166, 91, 0.6)",
        }}
      />
    </div>
  );
}
