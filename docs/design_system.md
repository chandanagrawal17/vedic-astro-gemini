# Design System: "Solar Obsidian" (Pattern-Inspired Editorial Aesthetic)

## 1. Visual Direction
Inspired by the luxury atmospheric depth of *The Pattern*, reimagined in a warm, luminous **Solar Obsidian** palette. Instead of cool purples or generic light-mode SaaS cards, the interface feels like warm candlelight and orbital geometry floating in velvety dark obsidian—evoking *Jyotish* (light) while feeling unmistakably modern, grounded, and high-agency for US consumers.

---

## 2. Color Tokens (CSS Variables & Tailwind)

Add these variables to `src/app/globals.css`:

```css
:root {
  /* Atmospheric Canvases */
  --bg-obsidian: #0D0907;         /* Primary app background */
  --bg-obsidian-elevated: #16100C;/* Secondary / modal canvas */
  --surface-glass: rgba(28, 19, 14, 0.72);
  --surface-glass-strong: rgba(38, 25, 18, 0.88);

  /* Solar Orange & Ember Accents */
  --solar-tangerine: #FF6B2B;     /* Primary glow, active pills, primary CTAs */
  --solar-ember: #C8420E;         /* Deep gradient shadow / hover state */
  --solar-amber: #F5A65B;         /* Highlights, orbital lines, progress arcs */
  --solar-soft: rgba(255, 107, 43, 0.14); /* Pill fills & subtle halos */

  /* Borders & Hairlines */
  --border-hairline: rgba(245, 166, 91, 0.18);
  --border-active: rgba(255, 107, 43, 0.55);

  /* Typography */
  --text-ivory: #FDF6EE;          /* Primary editorial headings & key copy */
  --text-stone: #B8A99E;          /* Secondary body text */
  --text-muted: #7C6E65;          /* Micro labels, dates, timestamps */

  /* Semantic Indicators (Warm-Calibrated) */
  --status-aligned: #4ADE80;      /* Soft sage-emerald for high alignment */
  --status-caution: #F59E0B;      /* Warm amber for friction / blind spots */
  --status-alert: #F87171;        /* Muted coral-red for severe loops */
}
```

### Signature Gradients & Glows
- **Ambient Background Mesh:** Two soft blurred radial gradients positioned behind content (`pointer-events-none fixed inset-0 -z-10`):
  - Top-right glow: `radial-gradient(circle at 85% 15%, rgba(255, 107, 43, 0.22), transparent 52%)`
  - Bottom-left glow: `radial-gradient(circle at 12% 82%, rgba(200, 66, 14, 0.18), transparent 50%)`
- **Primary CTA Gradient:** `linear-gradient(135deg, #FF7A3D 0%, #E8521A 100%)` with warm glow shadow `0 8px 28px -6px rgba(255, 107, 43, 0.45)`.
- **Solar Orb Hero Backdrop:** Soft blurred sphere (`blur-2xl`) transitioning `#F5A65B` -> `#FF6B2B` -> `#C8420E` behind concentric thin `1px` SVG orbital rings (`stroke="rgba(245,166,91,0.18)"`).

---

## 3. Typography System (`next/font/google`)

Pair a high-contrast editorial serif with a clean geometric sans-serif:

- **Display / Editorial Serif (`--font-serif`):** `Cormorant Garamond` (weights 500, 600, 700) or `Playfair Display` (weights 500, 600).
  - *Usage:* Screen titles, Archetype names (*"The Urgency Loop"*, *"The Structural Stripping"*), Era names, Hero hooks.
- **UI & Body Sans (`--font-sans`):** `Plus Jakarta Sans` (weights 400, 500, 600, 700).
  - *Usage:* Body paragraphs, form inputs, uppercase micro-eyebrows, buttons, metrics.

### Type Scale
- **Hero Editorial Title:** `text-[32px] leading-[1.12] font-serif tracking-[-0.01em] text-[#FDF6EE]`
- **Card Editorial Heading:** `text-[24px] leading-[1.2] font-serif text-[#FDF6EE]`
- **Eyebrow / Section Kicker:** `text-[11px] font-sans font-semibold uppercase tracking-[0.14em] text-[#F5A65B]`
- **Body Copy:** `text-[15px] leading-[1.6] font-sans text-[#D9CEC5]`
- **Micro / Meta:** `text-[12px] font-sans text-[#8E7F75]`

---

## 4. Layout & Container Rules
- **Mobile-First App Shell:** Render full-bleed on mobile devices (`< 480px`). On tablet/desktop, center inside a refined `max-w-[430px] min-h-screen mx-auto` column framed by subtle `1px` side hairlines (`border-x border-[#F5A65B]/10`) so it feels like a bespoke native app everywhere.
- **Spacing Rhythm:**
  - Page horizontal padding: `px-5` (`20px`)
  - Vertical stack spacing between cards: `space-y-4` (`16px`)
  - Card internal padding: `p-5` (`20px`)
  - Generous bottom safe-area padding (`pb-24`) when sticky CTAs are active.

---

## 5. Core Reusable Components

### A. Smoked Glass Card (`<ObsidianCard />`)
```tsx
className="relative overflow-hidden rounded-[22px] bg-[#1C130E]/75 backdrop-blur-xl border border-[#F5A65B]/20 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
```
- Optional subtle top inner rim highlight: `before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[#F5A65B]/40 before:to-transparent`.

### B. Locked Curiosity Card (`<LockedInsightCard />`)
- Displays the real eyebrow + real intriguing headline (e.g., *"Your Job vs. Business Verdict"*), followed by 2 lines of realistic dummy skeleton/blurred placeholder copy (`select-none blur-[6px] opacity-45 pointer-events-none`)—**never real secret text in the DOM**—overlaid with a crisp frosted lock pill (`Unlock with Full Blueprint`).

### C. Curved Orbital Era Timeline (`<LifeChaptersArc />`)
- SVG quadratic Bézier arc spanning the card width with 3–4 glowing circular nodes (`r=6` inactive amber outline, `r=9` active pulsing tangerine fill).
- Displays `Era 1` (left), `Era 2` (mid-left), `Era 3 · Current` (elevated peak node with `% complete` pill), and `Era 4` (right).
- Tapping any unlocked node smoothly updates the active chapter summary card below.

### D. Alignment Meter (`<AlignmentMeter />`)
- Semi-circular glowing SVG progress arc (0%–100%) transitioning `#C8420E` -> `#FF6B2B` -> `#F5A65B`, displaying the score in large serif (`64%`) centered inside the arc with the 4-word subtitle underneath.

### E. Accuracy Validator Pills (`<AccuracyCheck />`)
- Appears directly inside Proof Screen 1's **Hard Reset** card:
  - Prompt: *"How close did we get?"*
  - 3 outlined pill buttons: `Scarily Accurate` | `Partially True` | `Not Quite`
  - Selected state fills with `bg-[#FF6B2B]/20 border-[#FF6B2B] text-[#FDF6EE]` and triggers a subtle warm confirmation toast (*"Noted—calibrating your Blueprint depth"*).

### F. Primary & Secondary Buttons
- **Primary Pill CTA:** `w-full rounded-full py-3.5 px-6 font-sans text-[15px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition`
- **Ghost Pill CTA:** `rounded-full py-2.5 px-4 font-sans text-[13px] font-medium text-[#FDF6EE] bg-[#1C130E]/80 border border-[#F5A65B]/25 hover:border-[#FF6B2B]/60 transition`

---

## 6. Screen-by-Screen Visual Blueprint
1. **Landing / Entry Wedge (`/` & `/hard-reset`):** Centered glowing solar orb + fine concentric orbital rings at top, bold serif hook (*"Let’s see if we can pinpoint the exact 2-year stretch that forced you to rebuild."*), 1-line subcopy, single glowing orange CTA (*"Find My Reset Window — 45s"*), subtle transparency badge at bottom.
2. **Onboarding Steps 1–3 (`/onboarding`):** Clean progress bar at top (thin glowing amber line), one focused question group per step, dark glass inputs with warm amber focus rings, zero clutter.
3. **Synthesis Screen (`/onboarding/synthesizing`):** Full-screen centered animated concentric solar rings gently rotating, cycling 3 calm serif status lines (*"Mapping your last 10 years..."* -> *"Scanning core friction loops..."* -> *"Building your Personal Blueprint..."*).
4. **Proof Screen 1 (`/preview/[id]`):**
   - Hero Card: **The Hard Reset Pinpoint** (glowing ember orb header, exact year span in large serif, 2-sentence candid read, Accuracy Validator pills).
   - Card 2: **Your Last 10 Years in 3 Eras** (Curved Orbital Arc with Era 1 & 2 tappable, Era 3 glowing with `%` badge and locked details).
   - Sticky bottom button: *"See Your Blind Spot & Alignment ->"*
5. **Proof Screen 2 (`/preview/[id]?step=2`):**
   - Card 1: **#1 Self-Sabotage Loop** (Amber warning eyebrow, evocative serif loop title, 1 gut-punch symptom sentence, locked Trigger Map & 3-Step Antidote).
   - Card 2: **Career Alignment Audit** (Semi-circular Alignment Meter `%`, 1-word Ideal Mode pill, locked Job vs. Business Verdict).
   - Card 3: **Relationship Mirror** (Branched Married/Single archetype title, locked Silent Friction & Timing breakdown).
   - Sticky bottom CTA: *"Unlock My Complete Blueprint"* -> opens Soft Auth Modal -> Stripe Paywall.
6. **Stripe Paywall (`/unlock/[id]`):** Compact atmospheric sheet showing the user's personalized checklist (*"Your 5 Personalized Reports Ready"*), two clean pricing cards (**`$19` One-Time Unlock** highlighted "Most Popular" vs. **`$39/yr` Full Pass**), trust micro-copy (*"Instant access · 100% private · One-time payment"*), and Stripe Checkout CTA.
7. **Unlocked Blueprint Hub (`/blueprint`):** Top editorial greeting (*"Alex's Blueprint"* + *"Know your patterns. Own your life."*), horizontal underline sub-tabs (`Overview` | `Eras` | `Career` | `Love` | `Blind Spot`), full rich cards with an inline **"+ Save a personal reflection"** drawer inside each tab,