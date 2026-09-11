# Components Reference

Every section of `index.html`, in document order, with its HTML anatomy and exactly which CSS classes and JS hooks it depends on. IDs are unique page elements; classes are reused patterns.

---

## Flag sprite (hidden, top of `<body>`)

```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="flag-cn" viewBox="0 0 640 480">...</symbol>
    <symbol id="flag-za" viewBox="0 0 640 480">...</symbol>
  </defs>
</svg>
```

Not visible itself — defines two reusable SVG symbols (China and South Africa flags, sourced from the open-source [flag-icons](https://github.com/lipis/flag-icons) project, MIT licensed) that are referenced elsewhere via `<use href="#flag-cn">` / `<use href="#flag-za">`. See [assets.md](assets.md) for full provenance.

**Used by:** the hero SVG (`.map-flag`), the Process section route endpoints (`.route-endpoint`), and `js/globe.js`'s DOM overlay markers (`.globe-marker-flag`).

**Important implementation detail:** every standalone `<svg>` wrapper that contains a `<use href="#flag-...">` **must** carry `viewBox="0 0 640 480"` itself, matching the symbol's own viewBox. Without it, the browser has no coordinate system to scale the referenced symbol into, and it renders as a tiny, wrongly-cropped fragment. This bit developers once already (see [animations.md](animations.md) troubleshooting notes) — don't drop the `viewBox` when adding a new flag usage.

---

## Ticker bar — `.ticker-bar`

A single-row, infinitely-scrolling marquee of four repeated announcement strings (duplicated once in the markup so the CSS animation can loop seamlessly).

- `.ticker-track` — `animation: ticker 32s linear infinite` (keyframes translate `0%` → `-50%`, which is exactly one full copy of the duplicated content).
- No JS involvement at all — pure CSS animation.
- Paused entirely under `prefers-reduced-motion: reduce`.

---

## Nav — `#nav`

```html
<header class="nav" id="nav">
  <div class="nav-inner">
    <a class="logo">...</a>
    <nav class="nav-links" id="navLinks"> <!-- 6 anchor links --> </nav>
    <div class="nav-actions">
      <a class="btn btn-primary btn-sm">Get a Quote</a>
      <button class="burger" id="burger" aria-expanded="false"> <!-- 3 spans --> </button>
    </div>
  </div>
  <div class="mobile-menu" id="mobileMenu"> <!-- duplicate links, mobile only --> </div>
</header>
```

| Element | CSS role | JS role |
|---|---|---|
| `#nav` | `position: sticky; top:0`, gets `.scrolled` for a background/blur once scrolled | `main.js`: adds/removes `.scrolled` based on `window.scrollY > 12` |
| `.nav-links a` | Hidden below 720px (`display:none`); `::after` pseudo-element draws the sliding underline on hover/`.active` | `motion.js` (`setupNavIndicator`): adds `.active` to whichever link's target section is currently centered in the viewport |
| `#burger` | Hidden above 720px; three `span`s animate into an X via `.open` | `main.js`: toggles `.open` on itself and `#mobileMenu`, flips `aria-expanded` |
| `#mobileMenu` | `display:none` unless `.open` | `main.js`: closes itself (removes `.open`) when any of its own links are clicked |

---

## Hero — `.hero`

The most structurally complex section. Two-column grid (`.hero-inner`) collapsing to one column ≤980px.

**Left column — `.hero-copy.reveal`:** eyebrow, `<h1 class="display-xl">`, sub-copy, two CTA buttons (`.hero-cta`), three capability badges (`.hero-badges`).

**Right column — `.hero-visual.reveal#heroVisual`:** this is where the SVG-vs-WebGL swap happens.

```html
<div class="hero-visual reveal" id="heroVisual">
  <svg class="route-svg" id="routeSvg" viewBox="0 0 520 520">
    <!-- concentric rings, gradient trade-path, China/SA markers + flags + labels, animated mover dot -->
  </svg>
  <div class="globe-mount" id="globeMount"></div>   <!-- empty until globe.js populates it -->
  <div class="visual-cards"> <!-- two floating mini-cards --> </div>
</div>
```

| Element | Default state | What changes it |
|---|---|---|
| `#routeSvg` | Fully visible (`opacity:1`, no `.is-hidden`) | `globe.js` adds `.is-hidden` (→ `opacity:0`) the moment the WebGL globe successfully initializes. If `globe.js` never runs or bails out early, this SVG is the entire hero visual — it is a **complete, self-contained fallback**, not a placeholder. |
| `#globeMount` | Empty `<div>`, `opacity:0` (CSS) | `globe.js` appends a `<canvas>` and a `.globe-overlay` div into it, then adds `.is-active` (→ `opacity:1`, CSS transition) |
| `.mini-card-1` / `.mini-card-2` | Floating, independently animated (`animation: floaty`) | Positioned via the `.mini-card-1`/`.mini-card-2` modifier classes — **do not** rename these back to a shared un-suffixed class; see the history note in [styling-system.md](styling-system.md#a-bug-worth-remembering). |

**Inside the SVG**, `.trade-path` is the dashed curve between the two markers (CSS `animation: dashmove`), and the small gold circle with an `<animateMotion>` child (`.mover`) is a native SVG/SMIL animation, not CSS or JS — it travels along `#tradePath` on its own regardless of any other system.

---

## Value strip — `.value-strip.section-transition`

Four `.value-item.reveal` cards in a `repeat(4, 1fr)` grid (2-col ≤980px, 1-col ≤720px). Purely presentational; no unique JS.

The `.section-transition` class marks this section (along with `.services` and `.compare`) as one of the three deliberately-chosen "seam" sections that get an extra scroll-scrubbed scale/fade via `motion.js`'s `setupSectionTransitions()` — see [animations.md](animations.md#section-seam-transitions).

---

## About — `.about#about`

```html
<section class="about" id="about">
  <div class="about-dot-field" aria-hidden="true"></div>
  <div class="section-inner about-grid">
    <div class="reveal about-sticky"> <!-- eyebrow + h2 --> </div>
    <div class="about-copy">
      <p class="reveal">...</p>
      <p class="reveal">...</p>
      <a class="text-link reveal">See exactly how it works →</a>
    </div>
  </div>
</section>
```

| Element | Desktop (≥981px) | ≤980px |
|---|---|---|
| `.about-sticky` | `position: sticky; top: 140px` — the heading stays in view while the copy scrolls past it | `position: static` (explicit override in the 980px media query) |
| `.about-copy .reveal` (the 2 paragraphs + link) | `motion.js`'s `setupAbout()` scrub-reveals each one individually as it enters (opacity 0.25→1, `scrub: 0.5`) | Same elements, but since `setupAbout`'s scrub logic is wrapped in `gsap.matchMedia().add("(min-width: 981px)", ...)`, they fall back to the plain one-shot `.reveal` fade instead |
| `.about-dot-field` | Drifts vertically (`yPercent: 8`) via a scroll-scrubbed tween in `setupAbout()` | Same tween still runs (it isn't matchMedia-gated) but is subtle enough not to matter at any width |

---

## Services — `.services.section-transition#services`

The scrollytelling section. Structure:

```html
<div class="services-scroller">
  <div class="services-sticky" id="servicesSticky" aria-hidden="true">
    <span id="servicesStickyNum">01</span>
    <span id="servicesStickyIcon"></span>
    <span id="servicesStickyTitle">Factory Sourcing</span>
  </div>
  <div class="service-grid" id="servicesList">
    <div class="service-card reveal" data-service-index="0"> <!-- x6, index 0–5 --> </div>
  </div>
</div>
```

| Width | Layout | Active-tracking |
|---|---|---|
| ≥981px | `.services-scroller` is a 2-col grid (`.85fr 1.15fr`); `.services-sticky` is `position: sticky` and visible; `.service-grid` collapses to a single column inside it | `motion.js`'s `setupServices()` (desktop-only `matchMedia`) attaches a `scroll`/`resize` listener that finds whichever `.service-card`'s center is closest to the viewport's vertical center, and mirrors its number/title/icon into the sticky panel, plus toggles `.is-active` on that card (adds a gold→teal left border via `::before`) |
| ≤980px | `.services-scroller` becomes `display:block`; `.services-sticky` is `display:none`; `.service-grid` reverts to a 2-col (≤980) / 1-col (≤720) responsive grid, identical to the original pre-scrollytelling layout | No active-tracking JS runs at all (the whole `matchMedia` block is skipped) |

`iconEl.innerHTML` is populated from the `SERVICE_ICONS` array in `motion.js` (six inline SVG strings, one per service, indexed 0–5 matching `data-service-index`). These icons are decorative only — they duplicate no information that isn't already in the card's own number/title.

**`aria-hidden="true"` on `#servicesSticky`:** the sticky panel is a visual echo of whatever card is centered — the same information already exists, accessibly, in the `.service-card` itself. It's marked `aria-hidden` so screen readers don't announce the same six services twice.

---

## Process — `.process#process`

```html
<div class="timeline">
  <div class="route-endpoint route-endpoint-start"><svg class="flag-icon">...<use href="#flag-cn"/></svg><span>China</span></div>

  <div class="timeline-track">
    <div class="timeline-line" aria-hidden="true">
      <span class="timeline-progress"></span>
      <span class="timeline-dot"></span>
    </div>
    <div class="timeline-item reveal"> <!-- x6, numbered 1–6 --> </div>
  </div>

  <div class="route-endpoint route-endpoint-end"><svg class="flag-icon">...<use href="#flag-za"/></svg><span>South Africa</span></div>
</div>
```

**Why `.timeline-track` exists as a wrapper:** `.timeline-line` is `position: absolute; top: 6px; bottom: 6px` relative to its nearest positioned ancestor. If the two `.route-endpoint` badges were siblings of `.timeline-line` directly inside `.timeline` (instead of siblings of `.timeline-track`, one level further out), the line's `top`/`bottom` percentages would be measured against a taller box that includes the badges, and it would no longer align with the numbered markers. `.timeline-track` is the thing that must stay `position: relative` and contain *only* the line + the six items.

| Element | Mechanism |
|---|---|
| `.timeline-progress` (the gold→teal fill) | `height: var(--tl-progress, 0%)` — set by `js/main.js`'s `updateTimeline()` on every scroll/resize. **Baseline behaviour, no GSAP involved.** |
| `.timeline-dot` (the travelling marker) | `top: var(--tl-progress, 0%)` — reads the exact same custom property. Also baseline, also GSAP-independent. |
| `.section-head` (the heading above the timeline) | On desktop only, `motion.js`'s `setupProcess()` briefly pins it (`position: fixed` via GSAP `ScrollTrigger`'s `pin` option) for 260px of scroll as the timeline begins, then releases it |
| `.route-endpoint-start` / `-end` | Static, non-animated badges — purely markup + CSS, bookending the journey |

---

## Compare — `.compare.section-transition`

A CSS-grid table (`.compare-table` / `.compare-row` / `.compare-cell`) comparing DIY importing vs. CFE Trading. Below 720px, `.compare-head` is hidden and each `.compare-row` becomes a single column with `.compare-label` acting as an inline heading for its row. No JS.

---

## Industries — `.industries#industries`

A `flex-wrap` grid of `.chip` pills. No JS; hover state only (`transform: translateY(-2px)` + colour change).

---

## FAQ — `.faq#faq`

```html
<div class="accordion" id="accordion">
  <div class="accordion-item">
    <button class="accordion-trigger">Question <span class="accordion-icon">+</span></button>
    <div class="accordion-panel"><p>Answer</p></div>
  </div>
  <!-- x7 -->
</div>
```

`main.js` wires every `.accordion-trigger`: clicking one closes all `.accordion-item`s (removes `.open`, clears `panel.style.maxHeight`) then, if the clicked one wasn't already open, adds `.open` and sets `panel.style.maxHeight = panel.scrollHeight + "px"` — the classic JS-measured `max-height` transition technique (necessary because CSS can't transition to `height: auto`). Only one panel can be open at a time.

---

## Final CTA / Contact — `.final-cta#contact`

Two-column grid: contact details (email, location, response time) on the left, `#quoteForm` on the right.

`main.js` wires `#quoteForm`'s `submit` event: validates `name`/`email`/`product` are non-empty, then builds a `mailto:info@cfetrading.co.za?subject=...&body=...` URL from the form fields and navigates to it (`window.location.href = ...`), relying on the visitor's own email client. **This is a front-end-only implementation** — there is no backend, no fetch call, no email API. See [dependencies.md](dependencies.md#form-submission-has-no-backend) for what that means operationally.

---

## Footer — `.footer`

Four-column grid (brand blurb, Company links, Services list, Get In Touch). `#year` is set once by `main.js` (`new Date().getFullYear()`). `.footer-col a` links get the same sliding-underline hover treatment as the nav links, via their own `::after` rule.

---

## Cross-cutting classes (appear in many sections)

| Class | Meaning |
|---|---|
| `.reveal` | "Fade/rise into view on scroll." Owned by exactly one system at a time — see [animations.md](animations.md#the-reveal-system) |
| `.eyebrow` / `.eyebrow-dark` | The small uppercase label-with-dot above most section headings |
| `.display-xl` / `.display-lg` | The two heading sizes (hero vs. everything else) |
| `.section-inner` | Max-width (1180px) + horizontal padding wrapper, used inside almost every `<section>` |
| `.section-head` | Groups a section's eyebrow + heading + sub-copy; also the thing `setupReveals()` treats as "a heading" for the slightly-larger scale-in effect |
| `.btn` / `.btn-primary` / `.btn-ghost` / `.btn-lg` / `.btn-sm` / `.btn-block` | The one button component, composed via modifier classes |
