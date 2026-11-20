"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { HardResetFeedback } from "@/lib/types/blueprint";

interface AccuracyCheckProps {
  initialValue?: HardResetFeedback | null;
  onSelect: (value: HardResetFeedback) => void;
}

const OPTIONS: { value: HardResetFeedback; label: string }[] = [
  { value: "scarily_accurate", label: "Scarily Accurate" },
  { value: "partially_true", label: "Partially True" },
  { value: "not_quite", label: "Not Quite" },
];

export function AccuracyCheck({
  initialValue = null,
  onSelect,
}: AccuracyCheckProps) {
  const [selected, setSelected] = useState<HardResetFeedback | null>(
    initialValue
  );
  const [showToast, setShowToast] = useState(false);

  const handleChoose = (val: HardResetFeedback) => {
    setSelected(val);
    onSelect(val);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="mt-5 border-t border-[#F5A65B]/15 pt-4">
      <p className="text-[12px] font-medium text-[#B8A99E]">
        How close did we get?
      </p>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleChoose(opt.value)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition active:scale-[0.97] border ${
                isSelected
                  ? "bg-[#FF6B2B]/20 border-[#FF6B2B] text-[#FDF6EE] shadow-[0_0_14px_rgba(255,107,43,0.28)]"
                  : "bg-[#120C09]/70 border-[#F5A65B]/20 text-[#B8A99E] hover:border-[#F5A65B]/45 hover:text-[#FDF6EE]"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {showToast && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#FF6B2B]/15 border border-[#FF6B2B]/30 px-3 py-1 text-[11px] text-[#F5A65B]">
          <Check className="h-3 w-3" />
          <span>Noted—calibrating your Blueprint depth</span>
        </div>
      )}
    </div>
  );
}
