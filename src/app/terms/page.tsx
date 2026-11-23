import Link from "next/link";
import { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { SolarShell } from "@/components/ui/SolarShell";
import { ObsidianCard } from "@/components/ui/ObsidianCard";

export const metadata: Metadata = {
  title: "Terms of Use — Personal Blueprint",
  description:
    "Plain-English US terms of use for Personal Blueprint. Designed for self-reflection and personal insight only.",
};

export default function TermsPage() {
  return (
    <SolarShell showDisclaimer={false}>
      <div className="flex-1 px-5 pt-6 pb-12 space-y-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#B8A99E] hover:text-[#FDF6EE] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            Plain-English Terms
          </p>
          <h1 className="mt-1 font-serif text-[32px] leading-tight text-[#FDF6EE]">
            Terms of Use
          </h1>
          <p className="mt-1.5 text-[12px] text-[#8E7F75]">
            Last updated: November 2026 · United States
          </p>
        </div>

        <ObsidianCard className="space-y-4 text-[14px] leading-relaxed text-[#D9CEC5]">
          <p>
            Powered transparently by Vedic pattern calculations and numerology
            for self-reflection and personal insight—not clinical therapy,
            medical, legal, or financial advice.
          </p>

          <div>
            <h2 className="font-serif text-[20px] text-[#FDF6EE]">
              1. Self-Reflection &amp; Agency
            </h2>
            <p className="mt-1.5 text-[#B8A99E]">
              Personal Blueprint is a reflective journaling and pattern-framing
              tool. All career, relationship, and life decisions remain solely
              yours. Nothing inside the app constitutes medical diagnosis,
              psychological therapy, legal counsel, or investment advice.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-[20px] text-[#FDF6EE]">
              2. Early Beta Access
            </h2>
            <p className="mt-1.5 text-[#B8A99E]">
              During our Early Beta, full Blueprint unlocks are granted free of
              charge for testing and product feedback. Features, pricing tiers,
              and availability may evolve before public launch.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-[20px] text-[#FDF6EE]">
              3. Acceptable Use
            </h2>
            <p className="mt-1.5 text-[#B8A99E]">
              You agree to use Personal Blueprint for personal, non-commercial
              reflection and not to scrape, automate bulk chart submissions, or
              attempt to bypass service rate limits.
            </p>
          </div>
        </ObsidianCard>

        <div className="flex items-center justify-center gap-4 text-[12px] text-[#8E7F75]">
          <Link href="/privacy" className="hover:text-[#FDF6EE] underline">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/" className="hover:text-[#FDF6EE] underline">
            Personal Blueprint Home
          </Link>
        </div>
      </div>
    </SolarShell>
  );
}
