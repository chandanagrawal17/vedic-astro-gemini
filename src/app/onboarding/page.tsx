"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, MapPin } from "lucide-react";
import { z } from "zod";
import { SolarShell } from "@/components/ui/SolarShell";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import {
  BirthWindow,
  CareerMode,
  LocationOption,
  OnboardingInput,
  PrecisionMode,
  RelationshipStatus,
} from "@/lib/types/blueprint";
import { MOCK_CITIES } from "@/lib/mock/blueprintMock";
import {
  loadAttribution,
  parseEntryHook,
  saveAttribution,
  trackFunnelEvent,
} from "@/lib/store/attributionStore";
import { createAndSaveSession } from "@/lib/store/sessionStore";

const WINDOW_OPTIONS: { value: BirthWindow; label: string; range: string }[] = [
  { value: "morning", label: "Morning", range: "6am – 12pm" },
  { value: "afternoon", label: "Afternoon", range: "12pm – 6pm" },
  { value: "evening", label: "Evening", range: "6pm – 12am" },
  { value: "late_night", label: "Late Night", range: "12am – 6am" },
];

const RELATIONSHIP_OPTIONS: {
  value: RelationshipStatus;
  label: string;
  sub: string;
}[] = [
  {
    value: "single",
    label: "Single / Dating",
    sub: "Attraction patterns & long-term peace",
  },
  {
    value: "relationship",
    label: "In a Relationship",
    sub: "Unspoken needs & silent friction",
  },
  {
    value: "married",
    label: "Married",
    sub: "Partnership durability & communication",
  },
  {
    value: "shifting",
    label: "Navigating a Shift",
    sub: "Clarity during emotional transition",
  },
];

const CAREER_OPTIONS: {
  value: CareerMode;
  label: string;
  sub: string;
}[] = [
  {
    value: "employed",
    label: "9–5 Day Job",
    sub: "Full-time role inside a company or team",
  },
  {
    value: "employed_hybrid",
    label: "9–5 + Building on the Side",
    sub: "Steady paycheck while growing something of your own",
  },
  {
    value: "founder",
    label: "Founder / Business Owner",
    sub: "Running your own company, practice, or venture",
  },
  {
    value: "freelance_hybrid",
    label: "Freelance / Consulting",
    sub: "Independent client work, advisory, or portfolio career",
  },
  {
    value: "in_transition",
    label: "Between Roles / Exploring",
    sub: "Recently stepped away, laid off, or figuring out what's next",
  },
];

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<LocationOption | null>(null);
  const [showCityList, setShowCityList] = useState(false);

  const [precisionMode, setPrecisionMode] = useState<PrecisionMode>("exact");
  const [birthTime, setBirthTime] = useState("08:30");
  const [birthWindow, setBirthWindow] = useState<BirthWindow>("morning");
  const [step1Error, setStep1Error] = useState("");

  // Step 2 & 3 state
  const [relationshipStatus, setRelationshipStatus] =
    useState<RelationshipStatus | null>(null);
  const [careerMode, setCareerMode] = useState<CareerMode>("employed");
  const [careerField, setCareerField] = useState("");
  const [step3Error, setStep3Error] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cityResults, setCityResults] = useState<LocationOption[]>(
    MOCK_CITIES.slice(0, 12)
  );
  const [isSearchingCity, setIsSearchingCity] = useState(false);

  useEffect(() => {
    const hookParam = searchParams.get("hook");
    const utmParam = searchParams.get("utm_source");
    const saved = saveAttribution({
      entryHook: hookParam ? parseEntryHook(hookParam) : undefined,
      utmSource: utmParam || undefined,
    });
    trackFunnelEvent({
      eventName: "onboarding_started",
      entryHook: saved.entryHook,
      dedupeKey: `onboarding_started_${saved.entryHook}`,
    });
  }, [searchParams]);

  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 2) {
      setCityResults(MOCK_CITIES.slice(0, 12));
      setIsSearchingCity(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCity(true);
      try {
        const res = await fetch(
          `/api/location?q=${encodeURIComponent(q)}`
        );
        if (res.ok) {
          const data = (await res.json()) as { results?: LocationOption[] };
          if (data.results) {
            setCityResults(data.results);
          }
        }
      } catch {
        const lower = q.toLowerCase();
        setCityResults(
          MOCK_CITIES.filter(
            (c) =>
              c.cityName.toLowerCase().includes(lower) ||
              c.region.toLowerCase().includes(lower)
          )
        );
      } finally {
        setIsSearchingCity(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [cityQuery]);

  const handleSelectCity = (city: LocationOption) => {
    setSelectedCity(city);
    setCityQuery(city.cityName);
    setShowCityList(false);
    setStep1Error("");
    setStep3Error("");
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setStep1Error("Please enter your full name.");
      return;
    }
    if (!birthDate) {
      setStep1Error("Please select your date of birth.");
      return;
    }
    if (!cityQuery.trim()) {
      setStep1Error("Please enter or select your birth city.");
      return;
    }
    if (!selectedCity && cityQuery.trim().length < 2) {
      setStep1Error("Please select a birth city from the dropdown.");
      return;
    }
    const emailValidation = z
      .string()
      .trim()
      .email("Please enter a valid email address.")
      .safeParse(email);
    if (!emailValidation.success) {
      setStep1Error(
        emailValidation.error.issues[0]?.message ||
          "Please enter a valid email address."
      );
      return;
    }
    setStep1Error("");
    setStep3Error("");
    setStep(2);
  };

  const handleSelectRelationship = (chosenStatus: RelationshipStatus) => {
    setRelationshipStatus(chosenStatus);
    setTimeout(() => {
      setStep(3);
    }, 120);
  };

  const handleSubmitBlueprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setStep3Error("");

    let cityObj = selectedCity;
    if (!cityObj) {
      const trimmedCity = cityQuery.trim();
      if (trimmedCity.length < 2) {
        setStep3Error(
          "Please select a birth city from the dropdown before generating your Blueprint."
        );
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch(
          `/api/location?q=${encodeURIComponent(trimmedCity)}`
        );
        if (res.ok) {
          const data = (await res.json()) as { results?: LocationOption[] };
          if (data.results && data.results.length > 0) {
            cityObj = data.results[0];
            setSelectedCity(cityObj);
            setCityQuery(cityObj.cityName);
          }
        }
      } catch {
        // Handled below when cityObj remains null
      }

      if (!cityObj) {
        setIsSubmitting(false);
        setStep3Error(
          "We couldn’t find that birth city. Please select a city from the Step 1 dropdown."
        );
        return;
      }
    }

    setIsSubmitting(true);
    const firstNameOnly = fullName.trim().split(/\s+/)[0] || fullName.trim();
    const attribution = loadAttribution();

    const payload: OnboardingInput = {
      email: email.trim(),
      firstName: firstNameOnly,
      birthDate,
      birthCity: cityObj.cityName,
      birthLat: cityObj.lat,
      birthLon: cityObj.lon,
      birthTz: cityObj.tzOffset,
      precisionMode,
      birthTime: precisionMode === "exact" ? birthTime : null,
      birthWindow: precisionMode === "window" ? birthWindow : null,
      relationshipStatus: relationshipStatus ?? "single",
      careerMode,
      careerField: careerField.trim(),
      entryHook: attribution.entryHook,
      utmSource: attribution.utmSource,
    };

    createAndSaveSession(payload);
    router.push("/onboarding/synthesizing");
  };

  const progressPct = step === 1 ? "33%" : step === 2 ? "66%" : "100%";

  return (
    <SolarShell showDisclaimer={true}>
      <div className="flex flex-1 flex-col px-5 pt-6 pb-10">
        {/* Top Progress Header */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              if (step === 1) router.push("/");
              else if (step === 2) setStep(1);
              else setStep(2);
            }}
            className="inline-flex items-center gap-1 text-[13px] text-[#B8A99E] hover:text-[#FDF6EE] transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            Step {step} of 3
          </span>
        </div>

        {/* Thin Glowing Amber Progress Bar */}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#F5A65B]/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#C8420E] via-[#FF6B2B] to-[#F5A65B] transition-all duration-300"
            style={{ width: progressPct }}
          />
        </div>

        {/* STEP 1: Birth Details */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="mt-7 flex-1 flex flex-col">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Pattern Coordinates
            </p>
            <h1 className="mt-1.5 font-serif text-[28px] leading-tight text-[#FDF6EE]">
              Where &amp; when did your timeline begin?
            </h1>

            <ObsidianCard className="mt-5 space-y-4 overflow-visible">
              {/* Full Name */}
              <div>
                <label className="block text-[12px] font-medium text-[#B8A99E]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="mt-1.5 w-full rounded-xl border border-[#F5A65B]/20 bg-[#120C09] px-3.5 py-3 text-[15px] text-[#FDF6EE] placeholder:text-[#7C6E65] focus:border-[#FF6B2B] focus:outline-none"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-[12px] font-medium text-[#B8A99E]">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#F5A65B]/20 bg-[#120C09] px-3.5 py-3 text-[15px] text-[#FDF6EE] focus:border-[#FF6B2B] focus:outline-none"
                />
              </div>

              {/* Birth City Autocomplete (Global Cities) */}
              <div className="relative">
                <label className="block text-[12px] font-medium text-[#B8A99E]">
                  Birth City
                </label>
                <div className="relative mt-1.5">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E7F75]" />
                  <input
                    type="text"
                    value={cityQuery}
                    onFocus={() => setShowCityList(true)}
                    onBlur={() => {
                      setTimeout(() => setShowCityList(false), 160);
                    }}
                    onChange={(e) => {
                      setCityQuery(e.target.value);
                      setSelectedCity(null);
                      setShowCityList(true);
                    }}
                    placeholder="Search any city worldwide (e.g. London, Mumbai, Tokyo)"
                    className="w-full rounded-xl border border-[#F5A65B]/20 bg-[#120C09] py-3 pl-10 pr-3.5 text-[15px] text-[#FDF6EE] placeholder:text-[#7C6E65] focus:border-[#FF6B2B] focus:outline-none"
                  />
                </div>

                {showCityList && (isSearchingCity || cityResults.length > 0) && (
                  <div className="absolute z-30 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-[#F5A65B]/25 bg-[#16100C] shadow-2xl">
                    {isSearchingCity && (
                      <div className="px-3.5 py-2.5 text-[12px] text-[#8E7F75]">
                        Searching cities worldwide...
                      </div>
                    )}
                    {cityResults.map((city) => (
                      <button
                        key={`${city.cityName}-${city.region}-${city.lat}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectCity(city)}
                        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13px] text-[#FDF6EE] hover:bg-[#FF6B2B]/15 transition"
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

              {/* Time of Birth (3-Tier Zero-Shame Escape Hatch) */}
              <div>
                <label className="block text-[12px] font-medium text-[#B8A99E]">
                  Time of Birth
                </label>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: "exact", label: "Exact Time" },
                      { id: "window", label: "Rough Window" },
                      { id: "dob_only", label: "Don't Know" },
                    ] as const
                  ).map((mode) => {
                    const active = precisionMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setPrecisionMode(mode.id)}
                        className={`rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition ${
                          active
                            ? "border-[#FF6B2B] bg-[#FF6B2B]/20 text-[#FDF6EE]"
                            : "border-[#F5A65B]/15 bg-[#120C09] text-[#B8A99E] hover:border-[#F5A65B]/35"
                        }`}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>

                {precisionMode === "exact" && (
                  <input
                    type="time"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    className="mt-2.5 w-full rounded-xl border border-[#F5A65B]/20 bg-[#120C09] px-3.5 py-2.5 text-[15px] text-[#FDF6EE] focus:border-[#FF6B2B] focus:outline-none"
                  />
                )}

                {precisionMode === "window" && (
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    {WINDOW_OPTIONS.map((w) => {
                      const active = birthWindow === w.value;
                      return (
                        <button
                          key={w.value}
                          type="button"
                          onClick={() => setBirthWindow(w.value)}
                          className={`rounded-xl border px-3 py-2 text-left transition ${
                            active
                              ? "border-[#FF6B2B] bg-[#FF6B2B]/15 text-[#FDF6EE]"
                              : "border-[#F5A65B]/15 bg-[#120C09] text-[#B8A99E]"
                          }`}
                        >
                          <div className="text-[12px] font-semibold">
                            {w.label}
                          </div>
                          <div className="text-[10px] text-[#8E7F75]">
                            {w.range}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {precisionMode === "dob_only" && (
                  <p className="mt-2.5 rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/70 px-3.5 py-2.5 text-[12px] leading-relaxed text-[#B8A99E]">
                    No problem—we&rsquo;ll map your multi-year reset cycles and
                    core patterns without guessing exact-minute details.
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="onboarding-email"
                  className="block text-[12px] font-medium text-[#B8A99E]"
                >
                  Email
                </label>
                <input
                  id="onboarding-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@domain.com"
                  className="mt-1.5 w-full rounded-xl border border-[#F5A65B]/20 bg-[#120C09] px-3.5 py-3 text-[15px] text-[#FDF6EE] placeholder:text-[#7C6E65] focus:border-[#FF6B2B] focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#8E7F75]">
                  Used only to save your private Blueprint and prevent duplicate
                  readings.
                </p>
              </div>
            </ObsidianCard>

            {step1Error && (
              <p className="mt-3 text-[13px] text-[#F87171] px-1">
                {step1Error}
              </p>
            )}

            <div className="mt-6">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 font-sans text-[15px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Relationship Context (Generates Blueprint on Tap) */}
        {step === 2 && (
          <div className="mt-7 flex-1 flex flex-col">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Relational Context
            </p>
            <h1 className="mt-1.5 font-serif text-[28px] leading-tight text-[#FDF6EE]">
              What best describes your love &amp; partnership chapter right now?
            </h1>
            <p className="mt-2 text-[14px] text-[#B8A99E]">
              1 tap—this calibrates your Relationship Mirror.
            </p>

            <div className="mt-6 space-y-3">
              {RELATIONSHIP_OPTIONS.map((opt) => {
                const active = relationshipStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectRelationship(opt.value)}
                    className={`flex w-full items-center justify-between rounded-[20px] border p-4 text-left transition active:scale-[0.99] ${
                      active
                        ? "border-[#FF6B2B] bg-[#FF6B2B]/15 shadow-[0_0_20px_rgba(255,107,43,0.2)]"
                        : "border-[#F5A65B]/20 bg-[#1C130E]/75 hover:border-[#F5A65B]/45"
                    }`}
                  >
                    <div>
                      <div className="text-[15px] font-semibold text-[#FDF6EE]">
                        {opt.label}
                      </div>
                      <div className="mt-0.5 text-[12px] text-[#B8A99E]">
                        {opt.sub}
                      </div>
                    </div>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        active
                          ? "border-[#FF6B2B] bg-[#FF6B2B] text-[#0D0907]"
                          : "border-[#F5A65B]/25"
                      }`}
                    >
                      {active && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Work & Career Context (Option A) */}
        {step === 3 && (
          <form
            onSubmit={handleSubmitBlueprint}
            className="mt-7 flex-1 flex flex-col"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Work &amp; Career Context
            </p>
            <h1 className="mt-1.5 font-serif text-[28px] leading-tight text-[#FDF6EE]">
              What best describes your work chapter right now?
            </h1>
            <p className="mt-2 text-[14px] text-[#B8A99E]">
              This calibrates your Career Fit Audit and 3-path score.
            </p>

            <div className="mt-5 space-y-2.5">
              {CAREER_OPTIONS.map((opt) => {
                const active = careerMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCareerMode(opt.value)}
                    className={`flex w-full items-center justify-between rounded-[20px] border p-3.5 text-left transition active:scale-[0.99] ${
                      active
                        ? "border-[#FF6B2B] bg-[#FF6B2B]/15 shadow-[0_0_20px_rgba(255,107,43,0.2)]"
                        : "border-[#F5A65B]/20 bg-[#1C130E]/75 hover:border-[#F5A65B]/45"
                    }`}
                  >
                    <div>
                      <div className="text-[14.5px] font-semibold text-[#FDF6EE]">
                        {opt.label}
                      </div>
                      <div className="mt-0.5 text-[12px] text-[#B8A99E]">
                        {opt.sub}
                      </div>
                    </div>
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        active
                          ? "border-[#FF6B2B] bg-[#FF6B2B] text-[#0D0907]"
                          : "border-[#F5A65B]/25"
                      }`}
                    >
                      {active && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <label
                htmlFor="onboarding-career-field"
                className="block text-[12px] font-medium text-[#B8A99E]"
              >
                Your Field or Role{" "}
                <span className="text-[#8E7F75]">(optional)</span>
              </label>
              <input
                id="onboarding-career-field"
                type="text"
                maxLength={120}
                value={careerField}
                onChange={(e) => setCareerField(e.target.value)}
                placeholder="e.g. Software Engineering, Healthcare, Finance, Design"
                className="mt-1.5 w-full rounded-xl border border-[#F5A65B]/20 bg-[#120C09] px-3.5 py-3 text-[15px] text-[#FDF6EE] placeholder:text-[#7C6E65] focus:border-[#FF6B2B] focus:outline-none"
              />
            </div>

            {step3Error && (
              <div className="mt-4 rounded-xl border border-[#F87171]/30 bg-[#F87171]/10 px-3.5 py-2.5 text-[13px] text-[#F87171]">
                <p>{step3Error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setStep3Error("");
                    setStep(1);
                    setShowCityList(true);
                  }}
                  className="mt-1.5 text-[12px] font-semibold text-[#F5A65B] underline underline-offset-2 hover:text-[#FDF6EE] transition"
                >
                  Edit birth city in Step 1 &rarr;
                </button>
              </div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 font-sans text-[15px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition disabled:opacity-60"
              >
                <span>
                  {isSubmitting ? "Verifying City..." : "Generate My Blueprint"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </SolarShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <SolarShell showDisclaimer={true}>
          <div className="flex flex-1 items-center justify-center px-5 py-12 text-sm text-[#B8A99E]">
            Loading onboarding...
          </div>
        </SolarShell>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  );
}
