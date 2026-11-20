"use client";

import React, { useState } from "react";
import { X, Mail, Sparkles } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { OnboardingInput } from "@/lib/types/blueprint";

interface SoftAuthModalProps {
  isOpen: boolean;
  firstName: string;
  sessionId?: string;
  sessionToken?: string;
  onboardingInput?: OnboardingInput;
  onClose: () => void;
  onContinue: (email?: string) => void;
}

export function SoftAuthModal({
  isOpen,
  firstName,
  sessionId = "demo-session",
  sessionToken,
  onboardingInput,
  onClose,
  onContinue,
}: SoftAuthModalProps) {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const activeToken = sessionToken || sessionId;

  const claimSession = async () => {
    if (!activeToken || activeToken === "demo-session") return;
    const res = await fetch("/api/auth/claim-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: activeToken,
        firstName: onboardingInput?.firstName ?? firstName,
        relationshipStatus: onboardingInput?.relationshipStatus,
        careerMode: onboardingInput?.careerMode,
        careerField: onboardingInput?.careerField,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "Failed to link your Blueprint session.");
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();

      if (userData.user) {
        await claimSession();
        onContinue(userData.user.email ?? undefined);
        return;
      }

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        `/unlock/${sessionId}`
      )}&session_token=${encodeURIComponent(activeToken)}`;

      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (oauthErr) {
        setError(oauthErr.message);
        setLoading(false);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect Google sign-in right now."
      );
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter a valid email to save your Blueprint.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      // If user already has an active Supabase session, claim & continue directly
      const { data: existingUser } = await supabase.auth.getUser();
      if (existingUser.user) {
        await claimSession();
        onContinue(existingUser.user.email ?? trimmedEmail);
        return;
      }

      if (!otpSent) {
        const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          `/unlock/${sessionId}`
        )}&session_token=${encodeURIComponent(activeToken)}`;

        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            emailRedirectTo,
            shouldCreateUser: true,
          },
        });

        if (otpErr) {
          setError(otpErr.message);
          return;
        }

        setOtpSent(true);
        return;
      }

      // Verify 6-digit OTP token
      const cleanToken = otpCode.trim();
      if (cleanToken.length < 6) {
        setError("Enter the 6-digit verification code sent to your email.");
        return;
      }

      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: cleanToken,
        type: "email",
      });

      if (verifyErr) {
        setError(verifyErr.message);
        return;
      }

      await claimSession();
      onContinue(trimmedEmail);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
      <div className="relative w-full max-w-[430px] rounded-t-[26px] sm:rounded-[26px] bg-[#16100C] border border-[#F5A65B]/25 p-6 shadow-[0_-12px_50px_rgba(0,0,0,0.75)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-5 top-5 rounded-full p-1.5 text-[#8E7F75] hover:bg-white/5 hover:text-[#FDF6EE] transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FF6B2B]/15 border border-[#FF6B2B]/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
          <Sparkles className="h-3 w-3" />
          <span>Save Your Blueprint</span>
        </div>

        <h3 className="mt-3 font-serif text-[26px] leading-tight text-[#FDF6EE]">
          Keep {firstName}&rsquo;s patterns private &amp; accessible anywhere.
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-[#B8A99E]">
          Create a quick private profile so your full 5-module Blueprint stays
          saved—never shared or sold.
        </p>

        {/* Google Auth Button */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleAuth}
          className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-full border border-[#F5A65B]/25 bg-[#1C130E] py-3.5 px-5 text-[14px] font-semibold text-[#FDF6EE] hover:border-[#FF6B2B]/60 active:scale-[0.98] transition disabled:opacity-60"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#FDF6EE"
              d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#F5A65B]/15" />
          <span className="text-[11px] uppercase tracking-[0.14em] text-[#7C6E65]">
            or
          </span>
          <div className="h-px flex-1 bg-[#F5A65B]/15" />
        </div>

        {/* Email Magic Link / OTP Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E7F75]" />
            <input
              type="email"
              value={email}
              disabled={otpSent || loading}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full rounded-full border border-[#F5A65B]/20 bg-[#120C09] py-3.5 pl-11 pr-4 text-[14px] text-[#FDF6EE] placeholder:text-[#7C6E65] focus:border-[#FF6B2B] focus:outline-none disabled:opacity-70"
            />
          </div>

          {otpSent && (
            <div className="space-y-2">
              <p className="px-2 text-[12px] text-[#F5A65B]">
                We sent a magic link &amp; 6-digit code to {email.trim()}. Click
                the link or enter your code below:
              </p>
              <input
                type="text"
                inputMode="numeric"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="6-digit code"
                maxLength={8}
                className="w-full rounded-full border border-[#F5A65B]/30 bg-[#120C09] py-3 px-4 text-center text-[15px] tracking-[0.2em] text-[#FDF6EE] placeholder:tracking-normal placeholder:text-[#7C6E65] focus:border-[#FF6B2B] focus:outline-none"
              />
            </div>
          )}

          {error && <p className="text-[12px] text-[#F87171] px-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full py-3.5 px-6 font-sans text-[15px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition disabled:opacity-60"
          >
            {loading
              ? "Connecting..."
              : otpSent
                ? "Verify Code & Continue"
                : "Continue to Full Blueprint"}
          </button>

          {otpSent && (
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtpCode("");
                setError("");
              }}
              className="w-full text-center text-[12px] text-[#8E7F75] hover:text-[#FDF6EE] transition"
            >
              Use a different email
            </button>
          )}
        </form>

        <p className="mt-4 text-center text-[11px] text-[#7C6E65]">
          Private profile · No spam, one-click delete anytime
        </p>
      </div>
    </div>
  );
}
