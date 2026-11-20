import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SolarShell } from "@/components/ui/SolarShell";
import { SolarOrbHero } from "@/components/ui/SolarOrbHero";

export default function LandingPage() {
  return (
    <SolarShell>
      <div className="flex flex-1 flex-col justify-between px-5 pt-10 pb-4">
        {/* Top Brand Eyebrow */}
        <div className="flex items-center justify-center">
          <span className="rounded-full border border-[#F5A65B]/20 bg-[#1C130E]/70 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5A65B]">
            Personal Blueprint
          </span>
        </div>

        {/* Hero Orb + Editorial Hook */}
        <div className="my-auto py-8 text-center">
          <SolarOrbHero size="lg" />

          <h1 className="mt-8 font-serif text-[32px] leading-[1.12] tracking-[-0.01em] text-[#FDF6EE]">
            Let&rsquo;s see if we can pinpoint the exact 2-year stretch that
            forced you to rebuild.
          </h1>

          <p className="mt-4 text-[15px] leading-[1.6] text-[#B8A99E]">
            Ancient pattern intelligence meets modern self-reflection—mapped to
            your identity, relationships, and career.
          </p>

          <div className="mt-8">
            <Link
              href="/onboarding"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 font-sans text-[15px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition"
            >
              <span>Find My Reset Window</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="h-4" />
      </div>
    </SolarShell>
  );
}
