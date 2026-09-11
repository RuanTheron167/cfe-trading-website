# Responsive Behaviour

Two breakpoints, defined once in CSS (`@media (max-width: 980px)` and `@media (max-width: 720px)`) and deliberately reused as literal values in the JS enhancement layer wherever it needs to know whether it's in the "desktop" or "mobile/tablet" context. There is no CSS breakpoint variable/custom-property (media query conditions can't reference CSS custom properties), so **980 and 720 are hard-coded in five places total** — if you ever change one of these breakpoints, all five need to change together:

| # | Location | Value used |
|---|---|---|
| 1 | `css/styles.css` | `@media (max-width: 980px)` |
| 2 | `css/styles.css` | `@media (max-width: 720px)` |
| 3 | `js/globe.js` | `window.matchMedia("(max-width: 980px)")` → `isSimplified` |
| 4 | `js/motion.js` | `gsap.matchMedia().add("(min-width: 981px)", ...)` — appears 3 times (`setupAbout`, `setupServices`, `setupProcess`) |
| 5 | `js/motion.js` | `window.matchMedia("(min-width: 900px)")` — a *third*, deliberately different threshold, used only to decide whether Lenis initializes (see note below) |

**Note on the 900px vs 980/981px difference:** this is not an inconsistency to "fix" — it's intentional. Lenis (smooth scroll) is gated at 900px because it's really asking "is this a desktop-class pointer/viewport," while the layout-affecting `matchMedia` calls are gated at 980/981px to match the CSS layout breakpoint exactly. A viewport between 900–980px will get Lenis's smooth scrolling but the mobile/tablet layout (stacked sections, no sticky panels) — this is fine because Lenis doesn't care about layout, only about how wheel input is smoothed.

## What changes at 980px (`max-width: 980px`)

| Component | Above 980px | At/below 980px |
|---|---|---|
| `.hero-inner` | 2-column grid | 1 column (`grid-template-columns: 1fr`) |
| `.hero-visual` | Sized by the grid column | `max-width: 420px; margin: 0 auto` (centered) |
| `.about-grid`, `.faq-grid`, `.cta-grid` | 2-column | 1 column |
| `.value-strip-inner` | `repeat(4, 1fr)` | `repeat(2, 1fr)` |
| `.service-grid` (outside the scrollytelling wrapper — i.e. if it were ever used standalone) | `repeat(3, 1fr)` | `repeat(2, 1fr)` |
| `.footer-grid` | `1.4fr 1fr 1fr 1fr` | `1fr 1fr` |
| `.compare-row` | `1fr 1.3fr 1.3fr` | `.8fr 1fr 1fr` (smaller padding/font too) |
| `.about-sticky` | `position: sticky` | `position: static` (explicit override) |
| `.services-scroller` | 2-column grid with sticky panel | `display: block` |
| `.services-sticky` | Visible, sticky | `display: none` |
| `.services-scroller .service-grid` | `1fr` (single column, scrollytelling mode) | `repeat(2, 1fr)` |
| Hero globe (`js/globe.js`) | Full detail: 22 lat-steps on the dot sphere, pixel ratio capped at 2, scroll-linked tilt active | "Simplified" mode: 14 lat-steps, pixel ratio capped at 1.5, scroll-linked tilt disabled (ambient rotation only) — **still the real WebGL globe**, not a fallback to the SVG |
| `setupAbout()` paragraph scrub / `setupServices()` active-tracking / `setupProcess()` heading pin (all in `motion.js`) | Active (inside `gsap.matchMedia("(min-width: 981px)")`) | Not active — the elements just use whatever generic behaviour they'd have anyway (plain `.reveal` fade for About's paragraphs; the static responsive grid for Services; no pin for Process's heading) |

## What changes at 720px (`max-width: 720px`)

| Component | Above 720px | At/below 720px |
|---|---|---|
| `.nav-links` | Visible | `display: none` |
| `.burger` | `display: none` | `display: flex` (hamburger menu takes over navigation) |
| `.display-xl` / `.display-lg` | Full `clamp()` range | Smaller `clamp()` range (still fluid, just a lower ceiling) |
| `.value-strip-inner`, `.service-grid`, `.services-scroller .service-grid` | 2 columns (inherited from the 980px rule) | 1 column |
| `.compare-row` | 3-column (from 980px rule) | 1 column; `.compare-head` is hidden entirely and each `.compare-label` becomes an inline heading for its row |
| `.footer-grid` | 2 columns (from 980px rule) | 1 column |
| `.form-row-split` (email/phone fields) | Side by side | Stacked |
| Section vertical padding (`about`, `services`, `process`, `compare`, `industries`, `faq`, `final-cta`) | 110–130px depending on section | Uniformly `80px 0` |
| `.section-inner`, `.hero-inner`, `.scroll-cue`, `.nav-inner` horizontal padding | 32px (or 18px for nav) | 20px / 16px |

## Lenis / smooth-scroll cutoff (900px + fine pointer)

Independent of the two layout breakpoints above. Lenis only initializes when **both** conditions hold:
```js
window.matchMedia("(min-width: 900px)").matches && window.matchMedia("(pointer: fine)").matches
```
This means: a large tablet or laptop with a trackpad/mouse gets Lenis; any touch-primary device (phone, tablet in touch mode) never does, regardless of its viewport width — native touch scrolling is already smooth and Lenis is solving a different problem (smoothing discrete mouse-wheel deltas).

## Very-low-end device cutoff (globe only)

A third, informal tier exists only for the hero globe, unrelated to viewport width:
```js
(navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
(navigator.deviceMemory && navigator.deviceMemory <= 2)
```
If either signals a genuinely constrained device (regardless of screen size — this could theoretically be a small-core desktop, not just a phone), `globe.js` skips WebGL entirely and the SVG hero graphic is used, full stop. `deviceMemory` is Chromium-only (Safari/Firefox don't implement it), so on those browsers this check relies on `hardwareConcurrency` alone.

## Testing checklist for future changes

If you change layout at one breakpoint, verify all of these still agree with each other:
1. The CSS media query itself (980 or 720).
2. Any `matchMedia`/`gsap.matchMedia` call in `motion.js` or `globe.js` that assumes the same layout state.
3. Actually resize a real browser window through the breakpoint slowly — `gsap.matchMedia()` contexts are supposed to auto-revert their setup (including removing classes like `.is-active` from `.service-card`, per the cleanup functions returned from each `matchMedia().add()` callback) when the media query stops matching, but this depends on the browser firing a real `matchMedia` change event, which doesn't always happen identically in every testing tool — a genuine resize of a real window is the most reliable way to confirm it.
