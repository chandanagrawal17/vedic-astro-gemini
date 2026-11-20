import React from "react";

interface ObsidianCardProps {
  children: React.ReactNode;
  className?: string;
  highlightRim?: boolean;
  warmTint?: boolean;
}

export function ObsidianCard({
  children,
  className = "",
  highlightRim = true,
  warmTint = false,
}: ObsidianCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[22px] backdrop-blur-xl border p-5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ${
        warmTint
          ? "bg-[#24150D]/80 border-[#FF6B2B]/30"
          : "bg-[#1C130E]/75 border-[#F5A65B]/20"
      } ${
        highlightRim
          ? "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[#F5A65B]/40 before:to-transparent"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
