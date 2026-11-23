import { BlueprintFreePayload } from "@/lib/types/blueprint";

export type BragCardMode = "3_eras" | "self_sabotage";

export interface BragCardData {
  mode: BragCardMode;
  firstName: string | null;
  eras: BlueprintFreePayload["eras"];
  selfSabotage: BlueprintFreePayload["selfSabotage"];
  appUrlLabel: string;
}

/**
 * Strictly strips all PII (email, birth date, birth time, birth city)
 * before constructing the shareable card payload.
 */
export function buildBragCardData(params: {
  mode: BragCardMode;
  includeFirstName: boolean;
  firstName?: string;
  freePayload: BlueprintFreePayload;
  appUrlLabel?: string;
}): BragCardData {
  const safeName = params.includeFirstName
    ? (params.firstName ?? "").trim().split(/\s+/)[0] || null
    : null;

  return {
    mode: params.mode,
    firstName: safeName,
    eras: params.freePayload.eras,
    selfSabotage: params.freePayload.selfSabotage,
    appUrlLabel: params.appUrlLabel || "personalblueprint.app",
  };
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 4
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function resolveFonts(): { serif: string; sans: string } {
  if (typeof window === "undefined") {
    return {
      serif: "Georgia, serif",
      sans: "-apple-system, BlinkMacSystemFont, sans-serif",
    };
  }
  const styles = getComputedStyle(document.body);
  const sansVar = styles.getPropertyValue("--font-sans").trim();
  const serifVar = styles.getPropertyValue("--font-serif").trim();
  return {
    serif: serifVar ? `${serifVar}, Georgia, serif` : "Georgia, serif",
    sans: sansVar
      ? `${sansVar}, -apple-system, BlinkMacSystemFont, sans-serif`
      : "-apple-system, BlinkMacSystemFont, sans-serif",
  };
}

export async function renderBragCardPng(data: BragCardData): Promise<Blob> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }

  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable.");
  }

  const { serif, sans } = resolveFonts();

  // 1. Deep Obsidian Base
  ctx.fillStyle = "#0D0907";
  ctx.fillRect(0, 0, W, H);

  // 2. Ambient Solar Obsidian Radial Glows
  const topGlow = ctx.createRadialGradient(W * 0.78, H * 0.14, 20, W * 0.78, H * 0.14, 720);
  topGlow.addColorStop(0, "rgba(255, 107, 43, 0.28)");
  topGlow.addColorStop(0.55, "rgba(200, 66, 14, 0.10)");
  topGlow.addColorStop(1, "rgba(13, 9, 7, 0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  const bottomGlow = ctx.createRadialGradient(W * 0.18, H * 0.85, 20, W * 0.18, H * 0.85, 680);
  bottomGlow.addColorStop(0, "rgba(245, 166, 91, 0.18)");
  bottomGlow.addColorStop(0.5, "rgba(200, 66, 14, 0.08)");
  bottomGlow.addColorStop(1, "rgba(13, 9, 7, 0)");
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, 0, W, H);

  // 3. Outer Hairline Frame
  ctx.strokeStyle = "rgba(245, 166, 91, 0.20)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 44, 44, W - 88, H - 88, 44);
  ctx.stroke();

  // 4. Solar Orb + Concentric Orbital Rings at Top
  const orbX = W / 2;
  const orbY = 305;

  const ringRadii = [190, 148, 106];
  ringRadii.forEach((radius, idx) => {
    ctx.beginPath();
    ctx.arc(orbX, orbY, radius, 0, Math.PI * 2);
    ctx.strokeStyle =
      idx === 2 ? "rgba(255, 107, 43, 0.34)" : "rgba(245, 166, 91, 0.18)";
    ctx.lineWidth = 1.8;
    ctx.stroke();
  });

  // Orbital dots
  ctx.fillStyle = "#F5A65B";
  ctx.beginPath();
  ctx.arc(orbX + 148 * Math.cos(-0.6), orbY + 148 * Math.sin(-0.6), 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FF6B2B";
  ctx.beginPath();
  ctx.arc(orbX - 106 * Math.cos(0.9), orbY + 106 * Math.sin(0.9), 4, 0, Math.PI * 2);
  ctx.fill();

  // Orb Glow & Core
  const orbHalo = ctx.createRadialGradient(orbX, orbY, 10, orbX, orbY, 118);
  orbHalo.addColorStop(0, "rgba(253, 246, 238, 0.95)");
  orbHalo.addColorStop(0.35, "rgba(245, 166, 91, 0.78)");
  orbHalo.addColorStop(0.68, "rgba(255, 107, 43, 0.42)");
  orbHalo.addColorStop(1, "rgba(200, 66, 14, 0)");
  ctx.fillStyle = orbHalo;
  ctx.beginPath();
  ctx.arc(orbX, orbY, 118, 0, Math.PI * 2);
  ctx.fill();

  const orbCore = ctx.createRadialGradient(orbX - 12, orbY - 12, 4, orbX, orbY, 44);
  orbCore.addColorStop(0, "#FDF6EE");
  orbCore.addColorStop(0.55, "#F5A65B");
  orbCore.addColorStop(1, "#FF6B2B");
  ctx.fillStyle = orbCore;
  ctx.beginPath();
  ctx.arc(orbX, orbY, 44, 0, Math.PI * 2);
  ctx.fill();

  // 5. Top Eyebrow Badge
  const eyebrowText = data.firstName
    ? `${data.firstName.toUpperCase()}’S PERSONAL BLUEPRINT`
    : "PERSONAL BLUEPRINT";
  ctx.font = `600 24px ${sans}`;
  ctx.fillStyle = "#F5A65B";
  ctx.textAlign = "center";
  ctx.fillText(eyebrowText, W / 2, 558);

  if (data.mode === "3_eras") {
    ctx.font = `600 68px ${serif}`;
    ctx.fillStyle = "#FDF6EE";
    ctx.fillText("My Last 10 Years", W / 2, 650);
    ctx.fillStyle = "#F5A65B";
    ctx.fillText("in 3 Named Eras", W / 2, 728);

    const eraItems = [
      {
        tag: `ERA 1 · ${data.eras.era1.dateRange}`,
        title: data.eras.era1.title,
        desc: data.eras.era1.summary,
        highlight: false,
        badge: null as string | null,
      },
      {
        tag: `ERA 2 · ${data.eras.era2.dateRange}`,
        title: data.eras.era2.title,
        desc: data.eras.era2.summary,
        highlight: false,
        badge: null as string | null,
      },
      {
        tag: `ERA 3 · CURRENT · ${data.eras.era3Preview.dateRange}`,
        title: data.eras.era3Preview.title,
        desc: "The chapter I just stepped into—mapped by pattern intelligence.",
        highlight: true,
        badge: `${data.eras.era3Preview.percentComplete}% Complete`,
      },
    ];

    let cardY = 800;
    const cardW = W - 160;
    const cardX = 80;
    const cardH = 248;

    for (const item of eraItems) {
      ctx.fillStyle = item.highlight
        ? "rgba(44, 24, 15, 0.90)"
        : "rgba(28, 19, 14, 0.82)";
      ctx.strokeStyle = item.highlight
        ? "rgba(255, 107, 43, 0.65)"
        : "rgba(245, 166, 91, 0.22)";
      ctx.lineWidth = item.highlight ? 2.5 : 1.5;
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 30);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.font = `600 21px ${sans}`;
      ctx.fillStyle = item.highlight ? "#FF6B2B" : "#F5A65B";
      ctx.fillText(item.tag, cardX + 38, cardY + 52);

      if (item.badge) {
        ctx.font = `600 20px ${sans}`;
        const badgeW = ctx.measureText(item.badge).width + 36;
        ctx.fillStyle = "rgba(255, 107, 43, 0.18)";
        ctx.strokeStyle = "rgba(255, 107, 43, 0.55)";
        ctx.lineWidth = 1.5;
        drawRoundedRect(ctx, cardX + cardW - badgeW - 34, cardY + 26, badgeW, 38, 19);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.fillStyle = "#F5A65B";
        ctx.fillText(item.badge, cardX + cardW - badgeW / 2 - 34, cardY + 52);
        ctx.textAlign = "left";
      }

      ctx.font = `600 42px ${serif}`;
      ctx.fillStyle = "#FDF6EE";
      ctx.fillText(item.title, cardX + 38, cardY + 112, cardW - 76);

      ctx.font = `400 25px ${sans}`;
      ctx.fillStyle = "#D9CEC5";
      const lines = wrapLines(ctx, item.desc, cardW - 76, 3);
      lines.forEach((line, idx) => {
        ctx.fillText(line, cardX + 38, cardY + 158 + idx * 34);
      });

      cardY += cardH + 28;
    }
  } else {
    // Self-Sabotage Loop Card
    ctx.font = `600 26px ${sans}`;
    ctx.fillStyle = "#F59E0B";
    ctx.fillText("MY #1 SELF-SABOTAGE LOOP", W / 2, 636);

    const cardW = W - 160;
    const cardX = 80;
    const cardY = 710;
    const cardH = 760;

    ctx.fillStyle = "rgba(32, 20, 14, 0.88)";
    ctx.strokeStyle = "rgba(255, 107, 43, 0.48)";
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 38);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = `600 84px ${serif}`;
    ctx.fillStyle = "#FDF6EE";
    const titleLines = wrapLines(ctx, data.selfSabotage.loopName, cardW - 100, 3);
    const titleStartY = cardY + 190;
    titleLines.forEach((line, idx) => {
      ctx.fillText(line, W / 2, titleStartY + idx * 96);
    });

    // Divider line
    const divY = titleStartY + titleLines.length * 96 + 34;
    ctx.strokeStyle = "rgba(245, 166, 91, 0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 120, divY);
    ctx.lineTo(W / 2 + 120, divY);
    ctx.stroke();

    ctx.font = `400 34px ${sans}`;
    ctx.fillStyle = "#D9CEC5";
    const symptomLines = wrapLines(
      ctx,
      `“${data.selfSabotage.symptomSentence}”`,
      cardW - 120,
      5
    );
    symptomLines.forEach((line, idx) => {
      ctx.fillText(line, W / 2, divY + 90 + idx * 52);
    });
  }

  // 6. Footer Tagline & App URL
  ctx.textAlign = "center";
  ctx.font = `600 44px ${serif}`;
  ctx.fillStyle = "#FDF6EE";
  ctx.fillText("Know your patterns. Own your life.", W / 2, 1738);

  ctx.font = `500 24px ${sans}`;
  ctx.fillStyle = "#8E7F75";
  ctx.fillText(data.appUrlLabel, W / 2, 1802);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export PNG image."));
    }, "image/png");
  });
}
