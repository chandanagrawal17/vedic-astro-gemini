import Link from "next/link";
import { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { SolarShell } from "@/components/ui/SolarShell";
import { ObsidianCard } from "@/components/ui/ObsidianCard";

export const metadata: Metadata = {
  title: "Privacy Policy — Personal Blueprint",
  description:
    "Plain-English US privacy practices for Personal Blueprint. Your birth data and personal reflections are private and never sold.",
};

export default function PrivacyPage() {
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
            Transparency &amp; Privacy
          </p>
          <h1 className="mt-1 font-serif text-[32px] leading-tight text-[#FDF6EE]">
            Privacy Policy
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
              1. What We Collect
            </h2>
            <p className="mt-1.5 text-[#B8A99E]">
              We collect only what is needed to calculate and save your Personal
              Blueprint: your first name, email address, birth date, birth city
              coordinates, optional birth time or time window, and the
              relationship/career context choices you tap during onboarding.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-[20px] text-[#FDF6EE]">
              2. How Pattern Synthesis Protects Your Identity
            </h2>
            <p className="mt-1.5 text-[#B8A99E]">
              Your email address is never sent to our AI language model. When
              synthesizing your Blueprint narrative, we strip personal
              identifiers and send only anonymized pattern telemetry.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-[20px] text-[#FDF6EE]">
              3. Never Sold or Shared With Brokers
            </h2>
            <p className="mt-1.5 text-[#B8A99E]">
              We never sell, rent, or broker your birth details, email address,
              or personal reflection notes to third-party advertisers.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-[20px] text-[#FDF6EE]">
              4. Shareable Cards &amp; Deletion
            </h2>
            <p className="mt-1.5 text-[#B8A99E]">
              Shareable 9:16 cards generated inside the app exclude your email,
              birth date, birth time, and birth city. To request full deletion of
              your chart and Blueprint record, contact our beta support email
              anytime.
            </p>
          </div>
        </ObsidianCard>

        <div className="flex items-center justify-center gap-4 text-[12px] text-[#8E7F75]">
          <Link href="/terms" className="hover:text-[#FDF6EE] underline">
            Terms of Use
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
