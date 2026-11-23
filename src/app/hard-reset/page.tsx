import { Metadata } from "next";
import { EntryWedgeLanding } from "@/components/landing/EntryWedgeLanding";

export const metadata: Metadata = {
  title: "Hard Reset Pinpoint — Personal Blueprint",
  description:
    "Can ancient pattern math pinpoint the exact 2-year stretch that forced you to rebuild?",
};

export default function HardResetLandingPage() {
  return (
    <EntryWedgeLanding
      entryHook="hard-reset"
      eyebrow="Personal Blueprint · Hard Reset"
      headline="Can ancient pattern math pinpoint the exact 2-year stretch that forced you to rebuild?"
      subcopy="Test it against your own past—free personal accuracy proof in under 45 seconds."
      ctaLabel="Pinpoint My Reset Window"
    />
  );
}
