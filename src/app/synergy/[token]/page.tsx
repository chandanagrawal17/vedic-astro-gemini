"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, MapPin, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { SynergyReportView } from "@/components/synergy/SynergyReportView";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import { SolarOrbHero } from "@/components/ui/SolarOrbHero";
import { SolarShell } from "@/components/ui/SolarShell";
import { MOCK_CITIES } from "@/lib/mock/blueprintMock";
import { createAndSaveSession } from "@/lib/store/sessionStore";
import type {
  BirthWindow,
  LocationOption,
  PrecisionMode,
  SynergyComparisonPayload,
  SynergyRelationshipContext,
} from "@/lib/types/blueprint";

interface InviteState {
  status: "awaiting_partner" | "ready";
  shareToken: string;
  relationshipContext: SynergyRelationshipContext;
  ownerDisplayName: string;
  ownerVibeLine: string | null;
  hasSavedPartnerChart: boolean;
  comparison: SynergyComparisonPayload | null;
}

interface LocalSynergyRecord {
  comparison: SynergyComparisonPayload;
  storageMode: "saved_to_account" | "local_only";
  partnerInput?: {
    email: string;
    firstName: string;
    birthDate: string;
    birthCity: string;
    birthLat: number;
    birthLon: number;
    birthTz: number;
    precisionMode: PrecisionMode;
    birthTime: string | null;
    birthWindow: BirthWindow | null;
  };
}

const CONTEXT_BADGE: Record<SynergyRelationshipContext, string> = {
  romantic: "Romantic Synergy Invite",
  close_friend: "Close Friend Synergy Invite",
  creative_partner: "Creative Partner Synergy Invite",
};

const WINDOW_OPTIONS: { value: BirthWindow; label: string; range: string }[] = [
  { value: "morning", label: "Morning", range: "6am – 12pm" },
  { value: "afternoon", label: "Afternoon", range: "12pm – 6pm" },
  { value: "evening", label: "Evening", range: "6pm – 12am" },
  { value: "late_night", label: "Late Night", range: "12am – 6am" },
];

export default function SynergyInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteState | null>(null);
  const [localRecord, setLocalRecord] = useState<LocalSynergyRecord | null>(null);

  // Partner B Intake Form
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<LocationOption | null>(null);
  const [cityResults, setCityResults] = useState<LocationOption[]>([]);
  const [showCityList, setShowCityList] = useState(false);
  const [searchingCity, setSearchingCity] = useState(false);
  const [precisionMode, setPrecisionMode] = useState<PrecisionMode>("exact");
  const [birthTime, setBirthTime] = useState("12:00");
  const [birthWindow, setBirthWindow] = useState<BirthWindow>("morning");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const localStorageKey = `pb_synergy_local_${token}`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    fetch(`/api/synergy/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = (await res.json()) as InviteState & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || "Synergy invite link not found.");
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        setInvite(data);
        if (data.status === "awaiting_partner" && typeof window !== "undefined") {
          try {
            const cached = window.localStorage.getItem(localStorageKey);
            if (cached) {
              setLocalRecord(JSON.parse(cached) as LocalSynergyRecord);
            }
          } catch {
            // Ignore malformed local storage
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Unable to load Synergy invite."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, localStorageKey]);

  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 2 || (selectedCity && selectedCity.cityName === q)) {
      setCityResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingCity(true);
      try {
        const dobQuery = birthDate
          ? `&dob=${encodeURIComponent(birthDate)}`
          : "";
        const res = await fetch(
          `/api/location?q=${encodeURIComponent(q)}${dobQuery}`
        );
        if (res.ok) {
          const data = (await res.json()) as { results?: LocationOption[] };
          if (data.results) {
            setCityResults(data.results);
            return;
          }
        }
      } catch {
        // Fallback below
      } finally {
        setSearchingCity(false);
      }
      const lower = q.toLowerCase();
      setCityResults(
        MOCK_CITIES.filter(
          (c) =>
            c.cityName.toLowerCase().includes(lower) ||
            c.region.toLowerCase().includes(lower)
        )
      );
    }, 250);

    return () => clearTimeout(timer);
  }, [cityQuery, selectedCity, birthDate]);

  const handleSubmitCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!firstName.trim()) {
      setFormError("Please enter your first name.");
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      const emailCheck = z
        .string()
        .email("Please enter a valid email address.")
        .safeParse(trimmedEmail);
      if (!emailCheck.success) {
        setFormError(
          emailCheck.error.issues[0]?.message ||
            "Please enter a valid email address."
        );
        return;
      }
    }

    if (!birthDate) {
      setFormError("Please select your birth date.");
      return;
    }

    let resolvedCity = selectedCity;
    if (!resolvedCity && cityQuery.trim().length >= 2) {
      try {
        const dobQuery = birthDate
          ? `&dob=${encodeURIComponent(birthDate)}`
          : "";
        const res = await fetch(
          `/api/location?q=${encodeURIComponent(cityQuery.trim())}${dobQuery}`
        );
        if (res.ok) {
          const data = (await res.json()) as { results?: LocationOption[] };
          resolvedCity = data.results?.[0] ?? null;
        }
      } catch {
        // Ignore; handled below
      }
    }

    if (!resolvedCity) {
      setFormError(
        "Please select a birth city from the dropdown suggestions so we can resolve coordinates accurately."
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/synergy/${encodeURIComponent(token)}/compare`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            email: trimmedEmail,
            birthDate,
            birthCity: resolvedCity.cityName,
            birthLat: resolvedCity.lat,
            birthLon: resolvedCity.lon,
            birthTz: resolvedCity.tzOffset,
            ...(resolvedCity.timeZone
              ? { birthTimeZone: resolvedCity.timeZone }
              : {}),
            precisionMode,
            birthTime: precisionMode === "exact" ? birthTime : null,
            birthWindow: precisionMode === "window" ? birthWindow : null,
          }),
        }
      );

      const data = (await res.json()) as {
        comparison?: SynergyComparisonPayload;
        storageMode?: "saved_to_account" | "local_only";
        error?: string;
      };

      if (!res.ok || !data.comparison) {
        throw new Error(data.error || "Unable to calculate Synergy comparison.");
      }

      const record: LocalSynergyRecord = {
        comparison: data.comparison,
        storageMode: data.storageMode ?? "local_only",
        partnerInput: {
          email: trimmedEmail,
          firstName: firstName.trim().split(/\s+/)[0] || firstName.trim(),
          birthDate,
          birthCity: resolvedCity.cityName,
          birthLat: resolvedCity.lat,
          birthLon: resolvedCity.lon,
          birthTz: resolvedCity.tzOffset,
          precisionMode,
          birthTime: precisionMode === "exact" ? birthTime : null,
          birthWindow: precisionMode === "window" ? birthWindow : null,
        },
      };

      if (record.storageMode === "local_only" && typeof window !== "undefined") {
        window.localStorage.setItem(localStorageKey, JSON.stringify(record));
      }

      setLocalRecord(record);
      if (record.storageMode === "saved_to_account" && invite) {
        setInvite({
          ...invite,
          status: "ready",
          hasSavedPartnerChart: true,
          comparison: data.comparison,
        });
      }
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to calculate Synergy right now."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartOwnBlueprint = () => {
    const partnerInput = localRecord?.partnerInput;
    if (partnerInput) {
      createAndSaveSession({
        email: partnerInput.email,
        firstName: partnerInput.firstName,
        birthDate: partnerInput.birthDate,
        birthCity: partnerInput.birthCity,
        birthLat: partnerInput.birthLat,
        birthLon: partnerInput.birthLon,
        birthTz: partnerInput.birthTz,
        precisionMode: partnerInput.precisionMode,
        birthTime: partnerInput.birthTime,
        birthWindow: partnerInput.birthWindow,
        relationshipStatus: "single",
        careerMode: "employed",
        careerField: "",
        entryHook: "love-mirror",
      });

      if (partnerInput.email) {
        router.push("/onboarding/synthesizing");
        return;
      }
    }

    router.push("/onboarding?hook=love-mirror");
  };

  const handleResetLocal = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(localStorageKey);
    }
    setLocalRecord(null);
  };

  const activeComparison = invite?.comparison ?? localRecord?.comparison ?? null;
  const activeStorageMode: "saved_to_account" | "local_only" =
    invite?.hasSavedPartnerChart
      ? "saved_to_account"
      : localRecord?.storageMode ?? "local_only";
  const hasEmailTyped = email.trim().length > 0;

  return (
    <SolarShell>
      <div className="flex-1 px-5 pt-7 pb-12">
        {loading && (
          <div className="space-y-4">
            <SolarOrbHero size="sm" animateSpin />
            <ObsidianCard warmTint>
              <div className="h-4 w-32 rounded bg-[#F5A65B]/15 animate-pulse" />
              <div className="mt-3 h-7 w-56 rounded bg-[#FDF6EE]/10 animate-pulse" />
              <div className="mt-3 h-16 w-full rounded bg-[#D9CEC5]/10 animate-pulse" />
            </ObsidianCard>
          </div>
        )}

        {!loading && loadError && (
          <ObsidianCard warmTint>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Synergy Invite
            </p>
            <h1 className="mt-2 font-serif text-[26px] text-[#FDF6EE]">
              Link Unavailable
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-[#D9CEC5]">
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-5 w-full rounded-full py-3 px-5 text-[14px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B]"
            >
              Explore Personal Blueprint
            </button>
          </ObsidianCard>
        )}

        {!loading && !loadError && invite && activeComparison && (
          <SynergyReportView
            comparison={activeComparison}
            shareToken={invite.shareToken}
            storageMode={activeStorageMode}
            onStartOwnBlueprint={handleStartOwnBlueprint}
            onResetLocalComparison={
              activeStorageMode === "local_only" ? handleResetLocal : undefined
            }
          />
        )}

        {!loading && !loadError && invite && !activeComparison && (
          <div className="space-y-4">
            <SolarOrbHero size="sm" animateSpin />

            <div className="text-center">
              <span className="inline-flex rounded-full border border-[#F5A65B]/30 bg-[#F5A65B]/10 px-3 py-1 text-[11px] font-semibold text-[#F5A65B]">
                {CONTEXT_BADGE[invite.relationshipContext]}
              </span>
              <h1 className="mt-3 font-serif text-[29px] leading-tight text-[#FDF6EE]">
                {invite.ownerDisplayName} invited you to compare your patterns
              </h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#B8A99E]">
                See how your communication rhythm, stress reflexes, and long-term
                pacing interact—in 30 seconds.
              </p>
            </div>

            {invite.ownerVibeLine && (
              <div className="rounded-2xl border border-[#F5A65B]/25 bg-[#120C09]/85 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                  {invite.ownerDisplayName}&rsquo;s Relational Vibe
                </div>
                <p className="mt-1.5 font-serif text-[19px] leading-snug text-[#FDF6EE]">
                  &ldquo;{invite.ownerVibeLine}&rdquo;
                </p>
              </div>
            )}

            <ObsidianCard>
              <form onSubmit={handleSubmitCompare} className="space-y-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                  Your Details (Private)
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B8A99E]">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Michelle"
                    className="mt-1.5 w-full rounded-xl border border-[#F5A65B]/20 bg-[#120C09] px-3.5 py-3 text-[14px] text-[#FDF6EE] placeholder:text-[#7C6E65] focus:border-[#FF6B2B] focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B8A99E]">
                      Email{" "}
                      <span className="font-normal normal-case tracking-normal text-[#7C6E65]">
                        (Optional)
                      </span>
                    </label>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                        hasEmailTyped
                          ? "border-[#4ADE80]/35 bg-[#4ADE80]/10 text-[#4ADE80]"
                          : "border-[#F5A65B]/25 bg-[#F5A65B]/10 text-[#F5A65B]"
                      }`}
                    >
                      {hasEmailTyped ? (
                        <>
                          <ShieldCheck className="h-3 w-3" />
                          <span>Saved to Account</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3" />
                          <span>Local-Only Mode</span>
                        </>
                      )}
                    </span>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com — leave blank to keep local"
                    className="mt-1.5 w-full rounded-xl border border-[#F5A65B]/20 bg-[#120C09] px-3.5 py-3 text-[14px] text-[#FDF6EE] placeholder:text-[#7C6E65] focus:border-[#FF6B2B] focus:outline-none"
                  />
                  <p className="mt-1.5 text-[11.5px] leading-snug text-[#8E7F75]">
                    {hasEmailTyped
                      ? "Your chart will be cached privately under this email so you can unlock your full Blueprint anytime."
                      : "Leave blank to run locally in your browser without storing your birth details in our database."}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B8A99E]">
                      Birth Date
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[#F5A65B]/20 bg-[#120C09] px-3.5 py-3 text-[14px] text-[#FDF6EE] focus:border-[#FF6B2B] focus:outline-none"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B8A99E]">
                      Birth City
                    </label>
                    <div className="relative mt-1.5">
                      <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#8E7F75]" />
                      <input
                        type="text"
                        value={cityQuery}
                        onFocus={() => setShowCityList(true)}
                        onChange={(e) => {
                          setCityQuery(e.target.value);
                          setSelectedCity(null);
                          setShowCityList(true);
                        }}
                        placeholder="City, Country or State"
                        className="w-full rounded-xl border border-[#F5A65B]/20 bg-[#120C09] pl-9 pr-3 py-3 text-[14px] text-[#FDF6EE] placeholder:text-[#7C6E65] focus:border-[#FF6B2B] focus:outline-none"
                      />
                    </div>
                    {showCityList && (cityResults.length > 0 || searchingCity) && (
                      <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[#F5A65B]/25 bg-[#16100C] shadow-xl">
                        {searchingCity && (
                          <div className="px-3 py-2 text-[12px] text-[#8E7F75]">
                            Searching locations...
                          </div>
                        )}
                        {cityResults.map((city, idx) => (
                          <button
                            key={`${city.cityName}-${idx}`}
                            type="button"
                            onClick={() => {
                              setSelectedCity(city);
                              setCityQuery(city.cityName);
                              setShowCityList(false);
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-[#FDF6EE] hover:bg-[#FF6B2B]/15"
                          >
                            <span>{city.cityName}</span>
                            <span className="text-[11px] text-[#8E7F75]">
                              {city.region}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B8A99E]">
                    Time of Birth
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(
                      [
                        { value: "exact", label: "Exact Time" },
                        { value: "window", label: "Rough Window" },
                        { value: "dob_only", label: "I Don't Know" },
                      ] as const
                    ).map((opt) => {
                      const active = precisionMode === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPrecisionMode(opt.value)}
                          className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
                            active
                              ? "border-[#FF6B2B] bg-[#FF6B2B]/20 text-[#FDF6EE]"
                              : "border-[#F5A65B]/25 bg-[#120C09]/80 text-[#B8A99E]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {precisionMode === "exact" && (
                    <input
                      type="time"
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                      className="mt-2.5 w-full rounded-xl border border-[#F5A65B]/20 bg-[#120C09] px-3.5 py-3 text-[14px] text-[#FDF6EE] focus:border-[#FF6B2B] focus:outline-none"
                    />
                  )}

                  {precisionMode === "window" && (
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      {WINDOW_OPTIONS.map((w) => (
                        <button
                          key={w.value}
                          type="button"
                          onClick={() => setBirthWindow(w.value)}
                          className={`rounded-xl border px-3 py-2 text-left transition ${
                            birthWindow === w.value
                              ? "border-[#FF6B2B] bg-[#FF6B2B]/15 text-[#FDF6EE]"
                              : "border-[#F5A65B]/20 bg-[#120C09] text-[#B8A99E]"
                          }`}
                        >
                          <div className="text-[12px] font-semibold">{w.label}</div>
                          <div className="text-[11px] text-[#8E7F75]">{w.range}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {precisionMode === "dob_only" && (
                    <p className="mt-2 text-[12px] text-[#F5A65B]">
                      Honest Precision Mode: we&rsquo;ll compare core rhythm &amp;
                      communication style without guessing rising-hour overlays.
                    </p>
                  )}
                </div>

                {formError && (
                  <p className="text-[12.5px] text-[#F87171]">{formError}</p>
                )}

                <div className="border-t border-[#F5A65B]/15 pt-3 text-[11.5px] text-[#8E7F75]">
                  &#128274; Your birth date, time, and city are never shared with{" "}
                  {invite.ownerDisplayName}.
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 text-[14.5px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition disabled:opacity-60"
                >
                  <span>
                    {submitting
                      ? "Calculating Synergy..."
                      : "Reveal Our Synergy Breakdown"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </ObsidianCard>

            <p className="text-center text-[11.5px] text-[#7C6E65]">
              Calculated using Vedic pattern math &amp; numerology. 100% private.
            </p>
          </div>
        )}
      </div>
    </SolarShell>
  );
}
