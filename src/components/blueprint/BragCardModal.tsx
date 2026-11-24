"use client";

import React, { useEffect, useState } from "react";
import { Download, Share2, Sparkles, X } from "lucide-react";
import {
  BragCardMode,
  buildBragCardData,
  renderBragCardPng,
} from "@/lib/bragCard/renderBragCard";
import { trackFunnelEvent } from "@/lib/store/attributionStore";
import { BlueprintFreePayload, EntryHook } from "@/lib/types/blueprint";

interface BragCardModalProps {
  isOpen: boolean;
  initialMode: BragCardMode;
  allowModeSwitch?: boolean;
  firstName: string;
  freePayload: BlueprintFreePayload;
  chartId?: string;
  sessionToken?: string;
  email?: string;
  entryHook?: EntryHook | null;
  onClose: () => void;
}

export function BragCardModal({
  isOpen,
  initialMode,
  allowModeSwitch = true,
  firstName,
  freePayload,
  chartId,
  sessionToken,
  email,
  entryHook,
  onClose,
}: BragCardModalProps) {
  const [mode, setMode] = useState<BragCardMode>(initialMode);
  const [includeFirstName, setIncludeFirstName] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [rendering, setRendering] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    let objectUrl: string | null = null;

    setRendering(true);
    setStatusMessage(null);

    const appUrlLabel =
      typeof window !== "undefined" ? window.location.host : "personalblueprint.app";
    const cardData = buildBragCardData({
      mode,
      includeFirstName,
      firstName,
      freePayload,
      appUrlLabel,
    });

    renderBragCardPng(cardData)
      .then((pngBlob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(pngBlob);
        setBlob(pngBlob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (active) setStatusMessage("Unable to generate preview image.");
      })
      .finally(() => {
        if (active) setRendering(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, mode, includeFirstName, firstName, freePayload]);

  if (!isOpen) return null;

  const logShareEvent = (method: "native_share" | "download") => {
    trackFunnelEvent({
      eventName: "brag_card_shared",
      chartId,
      sessionToken,
      email,
      entryHook,
      metadata: {
        mode,
        include_first_name: includeFirstName,
        method,
      },
    });
  };

  const handleDownload = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      mode === "3_eras"
        ? "personal-blueprint-3-eras.png"
        : "personal-blueprint-pattern.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logShareEvent("download");
    setStatusMessage("9:16 PNG saved to your device.");
  };

  const handleNativeShare = async () => {
    if (!blob) return;
    setSharing(true);
    setStatusMessage(null);

    try {
      const file = new File(
        [blob],
        mode === "3_eras"
          ? "personal-blueprint-3-eras.png"
          : "personal-blueprint-pattern.png",
        { type: "image/png" }
      );

      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      ) {
        await navigator.share({
          title: "My Personal Blueprint",
          text: "Know your patterns. Own your life.",
          files: [file],
        });
        logShareEvent("native_share");
        setStatusMessage("Shared cleanly.");
        return;
      }

      handleDownload();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // User closed native share sheet
        return;
      }
      handleDownload();
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="relative max-h-[92vh] w-full max-w-[430px] overflow-y-auto rounded-t-[26px] sm:rounded-[26px] bg-[#16100C] border border-[#F5A65B]/25 p-5 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close share card"
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#8E7F75] hover:bg-white/5 hover:text-[#FDF6EE] transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FF6B2B]/15 border border-[#FF6B2B]/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
          <Sparkles className="h-3 w-3" />
          <span>9:16 Share Card</span>
        </div>

        <h3 className="mt-2.5 font-serif text-[24px] leading-tight text-[#FDF6EE]">
          Share Your Pattern Card
        </h3>
        <p className="mt-1 text-[12px] text-[#8E7F75]">
          100% private—zero birth dates, times, cities, or emails included.
        </p>

        {/* Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {allowModeSwitch && (
            <div className="inline-flex rounded-full border border-[#F5A65B]/20 bg-[#120C09] p-1">
              <button
                type="button"
                onClick={() => setMode("3_eras")}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                  mode === "3_eras"
                    ? "bg-[#FF6B2B] text-[#0D0907]"
                    : "text-[#B8A99E]"
                }`}
              >
                3 Eras
              </button>
              <button
                type="button"
                onClick={() => setMode("self_sabotage")}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                  mode === "self_sabotage"
                    ? "bg-[#FF6B2B] text-[#0D0907]"
                    : "text-[#B8A99E]"
                }`}
              >
                Karma Loop
              </button>
            </div>
          )}

          <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-[#D9CEC5]">
            <input
              type="checkbox"
              checked={includeFirstName}
              onChange={(e) => setIncludeFirstName(e.target.checked)}
              className="h-4 w-4 rounded accent-[#FF6B2B]"
            />
            <span>Show first name</span>
          </label>
        </div>

        {/* 9:16 Preview */}
        <div className="mt-4 flex justify-center">
          <div className="relative aspect-[9/16] w-[220px] overflow-hidden rounded-[20px] border border-[#F5A65B]/25 bg-[#0D0907] shadow-[0_14px_40px_rgba(0,0,0,0.6)]">
            {rendering || !previewUrl ? (
              <div className="flex h-full w-full items-center justify-center text-[12px] text-[#8E7F75]">
                Rendering 9:16 card...
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Shareable Personal Blueprint card"
                className="h-full w-full object-cover"
              />
            )}
          </div>
        </div>

        {statusMessage && (
          <p className="mt-3 text-center text-[12px] text-[#4ADE80]">
            {statusMessage}
          </p>
        )}

        {/* Share & Download Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={!blob || sharing || rendering}
            onClick={handleNativeShare}
            className="inline-flex items-center justify-center gap-2 rounded-full py-3 px-4 font-sans text-[13px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_24px_-6px_rgba(255,107,43,0.45)] active:scale-[0.98] transition disabled:opacity-60"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </button>

          <button
            type="button"
            disabled={!blob || rendering}
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#F5A65B]/30 bg-[#1C130E] py-3 px-4 font-sans text-[13px] font-semibold text-[#FDF6EE] hover:border-[#FF6B2B]/60 active:scale-[0.98] transition disabled:opacity-60"
          >
            <Download className="h-4 w-4 text-[#F5A65B]" />
            <span>Download PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
