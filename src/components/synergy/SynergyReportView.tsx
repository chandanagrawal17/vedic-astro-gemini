"use client";

import React, { useState } from "react";
import { ArrowRight, Check, Copy, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { AlignmentMeter } from "@/components/blueprint/AlignmentMeter";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import type { SynergyComparisonPayload } from "@/lib/types/blueprint";

interface SynergyReportViewProps {
  comparison: SynergyComparisonPayload;
  shareToken: string;
  storageMode: "saved_to_account" | "local_only";
  onStartOwnBlueprint: () => void;
  onResetLocalComparison?: () => void;
}

export function SynergyReportView({
  comparison,
  shareToken,
  storageMode,
  onStartOwnBlueprint,
  onResetLocalComparison,
}: SynergyReportViewProps) {
  const [copied, setCopied] = useState(false);

  const isExact = comparison.precisionBadge.mode === "exact";

  const handleCopyLink = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/synergy/${shareToken}`
        : `/synergy/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Pair + Precision Badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
          {comparison.participants.ownerFirstName} &times;{" "}
          {comparison.participants.partnerFirstName}
        </span>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
            isExact
              ? "border-[#4ADE80]/35 bg-[#4ADE80]/10 text-[#4ADE80]"
              : "border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#F59E0B]"
          }`}
        >
          {comparison.precisionBadge.label}
        </span>
      </div>

      {/* Hero Synergy Score Card */}
      <ObsidianCard warmTint>
        <div className="text-center">
          <AlignmentMeter
            score={comparison.overallScore}
            subtitle={`${comparison.rawPoints.earned} / ${comparison.rawPoints.max} Pattern Alignment`}
          />
          <h1 className="mt-3 font-serif text-[26px] leading-tight text-[#FDF6EE]">
            {comparison.headline}
          </h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#B8A99E]">
            {comparison.precisionBadge.note}
          </p>
        </div>
      </ObsidianCard>

      {/* Storage Mode Transparency Pill */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#F5A65B]/15 bg-[#16100C]/90 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {storageMode === "saved_to_account" ? (
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#4ADE80]" />
          ) : (
            <Lock className="h-4 w-4 shrink-0 text-[#F5A65B]" />
          )}
          <p className="text-[12px] leading-snug text-[#D9CEC5]">
            {storageMode === "saved_to_account"
              ? "Saved privately to your email so you can unlock your full Blueprint without re-entering birth details."
              : "Local-only comparison: your birth details were not stored in our database."}
          </p>
        </div>
        {storageMode === "local_only" && onResetLocalComparison && (
          <button
            type="button"
            onClick={onResetLocalComparison}
            className="shrink-0 text-[11px] font-semibold text-[#F5A65B] hover:underline"
          >
            Re-run
          </button>
        )}
      </div>

      {/* 2 Core Relationship Lenses */}
      <ObsidianCard>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
          Core Relationship Lenses
        </p>
        <div className="mt-3 space-y-2.5">
          <div className="rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-[#FDF6EE]">
                {comparison.coreLenses.attractionAndChemistry.label}
              </span>
              <span className="rounded-full border border-[#4ADE80]/30 bg-[#4ADE80]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#4ADE80]">
                {comparison.coreLenses.attractionAndChemistry.score}%
              </span>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#D9CEC5]">
              {comparison.coreLenses.attractionAndChemistry.insight}
            </p>
          </div>

          <div className="rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-[#FDF6EE]">
                {comparison.coreLenses.innerBondAndDurability.label}
              </span>
              <span className="rounded-full border border-[#F5A65B]/30 bg-[#F5A65B]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#F5A65B]">
                {comparison.coreLenses.innerBondAndDurability.score}%
              </span>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#D9CEC5]">
              {comparison.coreLenses.innerBondAndDurability.insight}
            </p>
          </div>
        </div>
      </ObsidianCard>

      {/* Side-by-Side Behavioral Mirror */}
      <ObsidianCard>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
          How You Each Show Up
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
              {comparison.participants.ownerFirstName}
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#D9CEC5]">
              {comparison.participantStyles.ownerSummary}
            </p>
          </div>

          <div className="rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
              {comparison.participants.partnerFirstName}
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#D9CEC5]">
              {comparison.participantStyles.partnerSummary}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[#B8A99E]">
          {comparison.participantStyles.sharedAnchor}
        </p>
      </ObsidianCard>

      {/* 8-Dimension Compatibility */}
      <ObsidianCard>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            8-Dimension Compatibility
          </span>
          <span className="text-[11px] text-[#8E7F75]">Zero jargon</span>
        </div>

        <div className="mt-2 divide-y divide-[#F5A65B]/10">
          {comparison.dimensions.map((dim) => {
            const pct = dim.max > 0 ? Math.round((dim.earned / dim.max) * 100) : 0;
            const widthPct = dim.earned === 0 ? 4 : Math.max(8, pct);
            const barClass =
              dim.tone === "aligned"
                ? "bg-gradient-to-r from-[#22C55E] to-[#4ADE80]"
                : dim.tone === "growth"
                  ? "bg-gradient-to-r from-[#D97706] to-[#F59E0B]"
                  : "bg-gradient-to-r from-[#C8420E] via-[#FF6B2B] to-[#F5A65B]";

            return (
              <div key={dim.key} className="py-2.5 first:pt-1 last:pb-0">
                <div className="flex items-center justify-between gap-2 text-[13px] font-semibold text-[#FDF6EE]">
                  <span>{dim.label}</span>
                  <span className="text-[12px] text-[#F5A65B]">
                    {dim.earned} / {dim.max}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F5A65B]/15">
                  <div
                    className={`h-full rounded-full ${barClass}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[12px] leading-snug text-[#B8A99E]">
                  {dim.summary}
                </p>
              </div>
            );
          })}
        </div>
      </ObsidianCard>

      {/* Friction Guardrail + 10-Second Repair */}
      <ObsidianCard warmTint>
        <span className="inline-flex rounded-full border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#F59E0B]">
          Navigating Your Growth Edge
        </span>
        <h3 className="mt-2 font-serif text-[22px] leading-snug text-[#FDF6EE]">
          {comparison.frictionAndAgency.title}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#D9CEC5]">
          {comparison.frictionAndAgency.growthEdgeNote}
        </p>

        <div className="mt-3 rounded-xl border border-[#4ADE80]/25 bg-[#120C09]/85 p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4ADE80]">
            Speakable 10-Second Shift
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#FDF6EE]">
            {comparison.frictionAndAgency.tenSecondRepair}
          </p>
        </div>
      </ObsidianCard>

      {/* Bottom CTAs */}
      <div className="space-y-2.5 pt-1">
        <button
          type="button"
          onClick={onStartOwnBlueprint}
          className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 text-[14.5px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition"
        >
          <Sparkles className="h-4 w-4" />
          <span>Get My Own Full Blueprint</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        {storageMode === "saved_to_account" && (
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#F5A65B]/25 bg-[#1C130E]/80 py-3 px-4 text-[13px] font-semibold text-[#FDF6EE] hover:border-[#FF6B2B]/60 transition"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-[#4ADE80]" />
                <span>Copied Shareable Result Link</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-[#F5A65B]" />
                <span>Copy Shareable Result Link</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
