# Styling System

All styling lives in one file, `css/styles.css` (961 lines), organized into clearly commented sections in this order: Tokens → Type → Buttons → Ticker → Nav → Hero → Value Strip → About → Services → Process/Timeline → Compare → Industries → FAQ → Final CTA/Contact → Footer → Flags → Hero Globe → About Sticky/Drift → Services Scrollytelling → Process Route → Section Transitions → Nav Active Indicator → Micro-interactions → Scroll Reveal → Reduced Motion → Responsive.

There is no CSS preprocessor, no PostCSS, no CSS-in-JS, no utility framework (no Tailwind). It's hand-written CSS using native custom properties.

## Design tokens (`:root`)

```css
:root{
  --bg: #0a0d12;          /* page background — near-black navy */
  --bg-alt: #0d1119;       /* slightly lighter, used for alternating section bands */
  --surface: #12161f;      /* card/panel background */
  --surface-2: #171c27;    /* hover state of surface */
  --border: #232936;       /* the one border colour used everywhere */
  --text: #f5f6f8;         /* primary text (near-white); also used as background for the light-on-dark sections (About, FAQ) */
  --text-dim: #9aa3b2;      /* secondary text */
  --text-faint: #5c6577;    /* tertiary/label text */
  --gold: #d9a441;          /* primary accent — CTAs, highlights */
  --gold-2: #f0c674;        /* lighter gold — hover states, icon tints */
  --teal: #2fb8a6;          /* secondary accent — pairs with gold in gradients (hero path, timeline fill, service-card active border) */
  --red: #c0392b;           /* defined but not currently used anywhere in the stylesheet — reserved */

  --font-display: "Space Grotesk", "Inter", sans-serif;
  --font-body: "Inter", sans-serif;

  --container: 1180px;      /* the one max-width used by .section-inner and a few other wrappers */
  --radius: 14px;           /* the one border-radius used for cards/panels/tables */
  --ease: cubic-bezier(.16,.84,.44,1);  /* the one easing curve used for essentially every CSS transition in the file */
}
```

**Every colour, radius and easing curve in the site traces back to one of these tokens.** If a rebrand is ever needed, changing these ~14 variables changes the whole site's palette consistently — there are no hard-coded hex colours scattered through component rules except where a section deliberately needs a colour token doesn't cover (e.g. the About/FAQ sections' body-copy colour `#3a3f47`/`#4a4f57`, chosen for AA contrast against the light `--text` background rather than reusing a dark-theme token).

The `--tl-progress` custom property is **not** defined in `:root` — it's set at runtime by `js/main.js` directly on the `.timeline` element (see [architecture.md](architecture.md#data-flow-example-the-process-section-timeline-dot)), which is why `.timeline-progress` and `.timeline-dot` both reference it with a `, 0%` fallback (so the layout is sane before JS has run once).

## Typography

Two font families, loaded from Google Fonts in `index.html`'s `<head>`:
- **Space Grotesk** (weights 500/600/700) — `--font-display`, used for every heading, nav logo, badges, numbers, labels — anything uppercase/tracked-out.
- **Inter** (weights 400/500/600/700) — `--font-body`, used for all paragraph copy, buttons, and form fields.

Two heading scales, both fluid via `clamp()`:
```css
.display-xl{ font-size: clamp(2.6rem, 5.6vw, 4.6rem); }  /* hero <h1> only */
.display-lg{ font-size: clamp(2rem, 3.6vw, 3rem); }       /* every other section heading */
```
Both are `text-transform: uppercase`, `font-weight: 700`, `letter-spacing: -.01em`. There is no `.display-sm` or further scale — everything else is `.section-sub` (17px body copy) or explicit component font-sizes (e.g. `.service-card h3` at 19px).

## Layout patterns

- **`.section-inner`** — `max-width: var(--container); margin: 0 auto; padding: 0 32px` (20px on mobile). The one horizontal-rhythm wrapper used inside nearly every `<section>`.
- **Two-column grids that collapse to one column at 980px** — this exact pattern (`display:grid; grid-template-columns: <ratio>fr <ratio>fr; gap: Npx`, overridden to `1fr` in the 980px media query) is used independently by `.hero-inner`, `.about-grid`, `.faq-grid`, `.cta-grid`, and (with a scrollytelling twist) `.services-scroller`. They are not a shared class — each is its own rule with its own ratio and gap, but they all follow the identical collapse strategy.
- **Card-grid-as-bordered-table** — `.service-grid` and `.compare-table` both use the "1px gap + `background: var(--border)` behind it" trick to draw hairline dividers between cells without individual `border` declarations fighting each other at shared edges.
- **Alternating section backgrounds** — the page alternates `var(--bg)` (hero, services, compare, contact) / `var(--bg-alt)` (value strip, process, industries) / `var(--text)` i.e. near-white (about, FAQ) to create visual rhythm down a long single-page scroll. This is a deliberate content decision, not incidental — if you add a new section, pick its background with this rhythm in mind.

## Component reference

See [components-reference.md](components-reference.md) for a full per-section breakdown of every class. This file covers system-level patterns only.

## A bug worth remembering

Early in this project's history, the two floating "mini-cards" in the hero (`.mini-card-1` and `.mini-card-2`) shared a single base rule that also carried positioning:

```css
/* WRONG — this was the bug */
.mini-card{ top: 6%; left: -2%; }       /* positioning baked into the shared class */
.mini-card-2{ bottom: 8%; right: -2%; }  /* adds MORE positioning on top */
```

Because both elements have the class `mini-card` **and** one of `mini-card-1`/`mini-card-2`, the second card ended up with `top`, `left`, `bottom` **and** `right` all set simultaneously — which stretches an absolutely-positioned element to fill the space between all four edges instead of sizing to its content. The fix was to move `top`/`left` out of the shared `.mini-card` rule and into a dedicated `.mini-card-1` rule, symmetric with `.mini-card-2`. **The lesson:** never put edge-positioning (`top`/`left`/`right`/`bottom`) in a base class that a modifier class will also add edge-positioning to — split them into modifier-only rules from the start.

## Reduced motion

One `@media (prefers-reduced-motion: reduce)` block near the end of the file disables every purely-decorative CSS `animation` (`ticker-track`, `trade-path`, `pulse-ring`, `mini-card`, `globe-marker-ring`), hides the SVG hero's travelling `.mover` dot entirely, kills the `.globe-mount` opacity transition, and forces every `.reveal` element to its final visible state with no transition. This is the CSS half of reduced-motion support; see [animations.md](animations.md#reduced-motion) for how the JS half (which independently checks the same media query in both `motion.js` and `globe.js`) complements it.

## Responsive rules

Two breakpoints only: `max-width: 980px` and `max-width: 720px`. Full breakdown in [responsive-behaviour.md](responsive-behaviour.md) — including the JS-side `matchMedia` queries in `motion.js`/`globe.js` that are deliberately kept in sync with these exact two numbers.
