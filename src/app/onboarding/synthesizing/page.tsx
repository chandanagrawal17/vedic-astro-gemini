"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SolarShell } from "@/components/ui/SolarShell";
import { SolarOrbHero } from "@/components/ui/SolarOrbHero";

const STATUS_LINES = [
  "Mapping your last 10 years...",
  "Scanning core friction loops...",
  "Building your Personal Blueprint...",
];

export default function SynthesizingPage() {
  const router = useRouter();
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setLineIndex(1), 1000);
    const t2 = setTimeout(() => setLineIndex(2), 2050);
    const t3 = setTimeout(() => {
      router.replace("/preview/demo-session");
    }, 3150);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [router]);

  return (
    <SolarShell showDisclaimer={false}>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <SolarOrbHero size="lg" animateSpin />

        <div className="mt-10 h-16 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={lineIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="font-serif text-[25px] leading-snug text-[#FDF6EE]"
            >
              {STATUS_LINES[lineIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <p className="mt-2 text-[12px] tracking-wide text-[#8E7F75]">
          Calibrating cycles &amp; behavioral patterns
        </p>
      </div>
    </SolarShell>
  );
}
