"use client";

import React, { useState } from "react";
import { Check, Copy, ExternalLink, Share2, Sparkles } from "lucide-react";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import type { SynergyRelationshipContext } from "@/lib/types/blueprint";

interface SynergyInviteCardProps {
  chartId?: string;
  sessionToken?: string;
}

const CONTEXT_OPTIONS: {
  value: SynergyRelationshipContext;
  label: string;
}[] = [
  { value: "romantic", label: "Romantic" },
  { value: "close_friend", label: "Close Friend" },
  { value: "creative_partner", label: "Creative Partner" },
];

export function SynergyInviteCard({
  chartId,
  sessionToken,
}: SynergyInviteCardProps) {
  const [relationshipContext, setRelationshipContext] =
    useState<SynergyRelationshipContext>("romantic");
  const [creating, setCreating] = useState(false);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canCreate = Boolean(chartId || sessionToken);
  const fullUrl =
    sharePath && typeof window !== "undefined"
      ? `${window.location.origin}${sharePath}`
      : sharePath ?? "";

  const handleGenerateLink = async (
    nextContext: SynergyRelationshipContext = relationshipContext
  ) => {
    const targetId = chartId || sessionToken;
    if (!targetId) {
      setErrorMsg("Save or refresh your Blueprint session to create a Synergy link.");
      return null;
    }

    setCreating(true);
    setErrorMsg(null);
    setStatusMsg(null);
    setCopied(false);

    try {
      const res = await fetch("/api/synergy/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { "x-session-token": sessionToken } : {}),
        },
        body: JSON.stringify({
          chartId: targetId,
          relationshipContext: nextContext,
          sessionToken,
        }),
      });
      const data = (await res.json()) as {
        sharePath?: string;
        error?: string;
      };
      if (!res.ok || !data.sharePath) {
        throw new Error(data.error || "Unable to create Synergy invite link.");
      }

      setSharePath(data.sharePath);
      return `${window.location.origin}${data.sharePath}`;
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Unable to create Synergy link."
      );
      return null;
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (urlToCopy?: string) => {
    const target = urlToCopy || fullUrl;
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      setStatusMsg("Copied private invite link to clipboard.");
    } catch {
      setStatusMsg("Link ready—copy it from the box above.");
    }
  };

  const handleShare = async () => {
    const url = fullUrl || (await handleGenerateLink());
    if (!url) return;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Compare our Behavioral Synergy",
          text: "I ran my Personal Blueprint—add your details (100% private) to see how our patterns click.",
          url,
        });
        setStatusMsg("Shared private invite link.");
        return;
      } catch {
        // User cancelled or share unsupported; fall back to clipboard copy
      }
    }

    await handleCopy(url);
  };

  return (
    <ObsidianCard warmTint>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#F5A65B]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            Behavioral Synergy Link
          </span>
        </div>
        <span className="rounded-full border border-[#4ADE80]/30 bg-[#4ADE80]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#4ADE80]">
          Zero PII Shared
        </span>
      </div>

      <h3 className="mt-2 font-serif text-[23px] leading-snug text-[#FDF6EE]">
        Check Your Synergy With Someone
      </h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#D9CEC5]">
        Send a private invite link. They enter their own birth details—your birth
        date, time, and city stay hidden.
      </p>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B8A99E]">
          Relationship Lens
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONTEXT_OPTIONS.map((option) => {
            const selected = relationshipContext === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={creating}
                onClick={() => {
                  setRelationshipContext(option.value);
                  setSharePath(null);
                  setStatusMsg(null);
                }}
                className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
                  selected
                    ? "border-[#FF6B2B] bg-[#FF6B2B]/20 text-[#FDF6EE] shadow-[0_0_14px_rgba(255,107,43,0.22)]"
                    : "border-[#F5A65B]/25 bg-[#120C09]/80 text-[#B8A99E] hover:border-[#FF6B2B]/55 hover:text-[#FDF6EE]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {sharePath && (
        <div className="mt-3.5 flex items-center justify-between gap-2 rounded-xl border border-dashed border-[#F5A65B]/35 bg-[#0D0907]/80 px-3 py-2.5">
          <span className="truncate font-mono text-[12px] text-[#F5A65B]">
            {fullUrl}
          </span>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#FF6B2B]/45 bg-[#1C130E] px-2.5 py-1 text-[11px] font-semibold text-[#F5A65B] hover:border-[#FF6B2B]"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-[#4ADE80]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <button
          type="button"
          disabled={!canCreate || creating}
          onClick={() => void handleShare()}
          className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-5 text-[14px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition disabled:opacity-55"
        >
          <Share2 className="h-4 w-4" />
          <span>
            {creating
              ? "Generating Private Link..."
              : sharePath
                ? "Share Synergy Invite Link"
                : "Create & Share Synergy Link"}
          </span>
        </button>

        {sharePath && (
          <a
            href={sharePath}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[#F5A65B]/25 bg-[#1C130E]/80 py-2.5 px-4 text-[12.5px] font-semibold text-[#FDF6EE] hover:border-[#FF6B2B]/60 transition"
          >
            <span>Preview Partner Invite</span>
            <ExternalLink className="h-3.5 w-3.5 text-[#F5A65B]" />
          </a>
        )}
      </div>

      {statusMsg && (
        <p className="mt-2.5 text-center text-[12px] text-[#4ADE80]">
          {statusMsg}
        </p>
      )}
      {errorMsg && (
        <p className="mt-2.5 text-center text-[12px] text-[#F87171]">
          {errorMsg}
        </p>
      )}
    </ObsidianCard>
  );
}
