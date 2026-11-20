import React from "react";

interface AlignmentMeterProps {
  score: number;
  subtitle: string;
}

export function AlignmentMeter({ score, subtitle }: AlignmentMeterProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 74;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center pt-2 pb-1">
      <div className="relative w-[190px] h-[108px] flex items-end justify-center">
        <svg viewBox="0 0 180 100" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient
              id="alignmentGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#C8420E" />
              <stop offset="55%" stopColor="#FF6B2B" />
              <stop offset="100%" stopColor="#F5A65B" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <path
            d="M 16 90 A 74 74 0 0 1 164 90"
            fill="none"
            stroke="rgba(245, 166, 91, 0.16)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Glowing Progress Arc */}
          <path
            d="M 16 90 A 74 74 0 0 1 164 90"
            fill="none"
            stroke="url(#alignmentGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: "drop-shadow(0 0 8px rgba(255, 107, 43, 0.55))",
            }}
          />
        </svg>

        {/* Centered Score */}
        <div className="absolute bottom-1 flex flex-col items-center">
          <span className="font-serif text-[40px] leading-none font-semibold text-[#FDF6EE]">
            {clamped}%
          </span>
        </div>
      </div>

      <p className="mt-2 text-[13px] font-medium text-[#F5A65B]">{subtitle}</p>
    </div>
  );
}
