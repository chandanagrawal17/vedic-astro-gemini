"use client";

import React, { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { SolarShell } from "@/components/ui/SolarShell";
import { SolarOrbHero } from "@/components/ui/SolarOrbHero";
import { EntryHook } from "@/lib/types/blueprint";
import { saveAttribution, trackFunnelEvent } from "@/lib/store/attributionStore";

export interface EntryWedgeConfig {
  entryHook: EntryHook;
  eyebrow: string;
  headline: string;
  subcopy: string;
  ctaLabel: string;
}

function EntryWedgeLandingInner({
  entryHook,
  eyebrow,
  headline,
  subcopy,
  ctaLabel,
}: EntryWedgeConfig) {
  const searchParams = useSearchParams();
  const utmSource = searchParams.get("utm_source")?.trim() || undefined;

  useEffect(() => {
    saveAttribution({ entryHook, utmSource });
    trackFunnelEvent({
      eventName: "landing_view",
      entryHook,
      dedupeKey: `landing_${entryHook}`,
    });
  }, [entryHook, utmSource]);

  const onboardingHref = utmSource
    ? `/onboarding?hook=${encodeURIComponent(entryHook)}&utm_source=${encodeURIComponent(utmSource)}`
    : `/onboarding?hook=${encodeURIComponent(entryHook)}`;

  return (
    <SolarShell showDisclaimer={true}>
      <div className="flex flex-1 flex-col justify-between px-5 pt-10 pb-4">
        {/* Top Brand Eyebrow */}
        <div className="flex items-center justify-center">
          <span className="rounded-full border border-[#F5A65B]/20 bg-[#1C130E]/70 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5A65B]">
            {eyebrow}
          </span>
        </div>

        {/* Hero Orb + Editorial Hook */}
        <div className="my-auto py-8 text-center">
          <SolarOrbHero size="lg" />

          <h1 className="mt-8 font-serif text-[32px] leading-[1.12] tracking-[-0.01em] text-[#FDF6EE]">
            {headline}
          </h1>

          <p className="mt-4 text-[15px] leading-[1.6] text-[#B8A99E]">
            {subcopy}
          </p>

          <div className="mt-8">
            <Link
              href={onboardingHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 font-sans text-[15px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition"
            >
              <span>{ctaLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-4 text-[12px] text-[#8E7F75]">
            45-second setup · Free personal proof before any unlock
          </p>
        </div>

        <div className="h-2" />
      </div>
    </SolarShell>
  );
}

export function EntryWedgeLanding(props: EntryWedgeConfig) {
  return (
    <Suspense
      fallback={
        <SolarShell showDisclaimer={true}>
          <div className="flex flex-1 flex-col justify-between px-5 pt-10 pb-4">
            <div className="flex items-center justify-center">
              <span className="rounded-full border border-[#F5A65B]/20 bg-[#1C130E]/70 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5A65B]">
                {props.eyebrow}
              </span>
            </div>
            <div className="my-auto py-8 text-center">
              <SolarOrbHero size="lg" />
              <h1 className="mt-8 font-serif text-[32px] leading-[1.12] tracking-[-0.01em] text-[#FDF6EE]">
                {props.headline}
              </h1>
            </div>
            <div className="h-2" />
          </div>
        </SolarShell>
      }
    >
      <EntryWedgeLandingInner {...props} />
    </Suspense>
  );
}
