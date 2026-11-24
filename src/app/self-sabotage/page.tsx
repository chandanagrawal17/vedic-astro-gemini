import { Metadata } from "next";
import { EntryWedgeLanding } from "@/components/landing/EntryWedgeLanding";

export const metadata: Metadata = {
  title: "#1 Self-Sabotage Loop — Personal Blueprint",
  description:
    "Spot the single hidden habit quietly stalling you right before every breakthrough.",
};

export default function SelfSabotageLandingPage() {
  return (
    <EntryWedgeLanding
      entryHook="self-sabotage"
      eyebrow="Personal Blueprint · Karma"
      headline="Spot the single hidden habit quietly stalling you right before every breakthrough."
      subcopy="Name your #1 self-sabotage loop and see how it shows up across love and high-stakes decisions."
      ctaLabel="Reveal My Karma Loop"
    />
  );
}
