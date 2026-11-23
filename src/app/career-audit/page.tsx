import { Metadata } from "next";
import { EntryWedgeLanding } from "@/components/landing/EntryWedgeLanding";

export const metadata: Metadata = {
  title: "Career Alignment Audit — Personal Blueprint",
  description:
    "Great at your job, yet quietly restless? See if your current path actually matches your blueprint.",
};

export default function CareerAuditLandingPage() {
  return (
    <EntryWedgeLanding
      entryHook="career-audit"
      eyebrow="Personal Blueprint · Career Audit"
      headline="Great at your job, yet quietly restless? See if your current path actually matches your blueprint."
      subcopy="Uncover your natural operating mode, competence trap, and how leadership actually reads you."
      ctaLabel="Audit My Career Fit"
    />
  );
}
