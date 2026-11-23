import { Metadata } from "next";
import { EntryWedgeLanding } from "@/components/landing/EntryWedgeLanding";

export const metadata: Metadata = {
  title: "Relationship Mirror — Personal Blueprint",
  description:
    "Uncover the relationship pattern you keep repeating—whether you're married, dating, or in between.",
};

export default function LoveMirrorLandingPage() {
  return (
    <EntryWedgeLanding
      entryHook="love-mirror"
      eyebrow="Personal Blueprint · Love Mirror"
      headline="Uncover the relationship pattern you keep repeating—whether you're married, dating, or in between."
      subcopy="Zero clichés, zero doom—just an honest read on your relational wiring and silent friction triggers."
      ctaLabel="See My Relationship Mirror"
    />
  );
}
