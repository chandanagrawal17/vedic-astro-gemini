import { Metadata } from "next";
import { EntryWedgeLanding } from "@/components/landing/EntryWedgeLanding";

export const metadata: Metadata = {
  title: "Your 3 Eras — Personal Blueprint",
  description:
    "See your last 10 years mapped into 3 psychological chapters—and the era you just entered.",
};

export default function ThreeErasLandingPage() {
  return (
    <EntryWedgeLanding
      entryHook="3-eras"
      eyebrow="Personal Blueprint · 10-Year Arc"
      headline="See your last 10 years mapped into 3 psychological chapters—and the era you just entered."
      subcopy="Discover what each chapter forced you to outgrow and where your momentum is shifting next."
      ctaLabel="Map My 3 Eras"
    />
  );
}
