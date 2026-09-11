# Dependencies

There is no `package.json`, no `node_modules`, and no build step. Every dependency below is loaded at runtime via a `<link>` or `<script>` tag in `index.html`, the same way the project has always loaded Google Fonts. This document lists every one of them, in the order they appear in the page.

## Summary table

| Dependency | Version (pinned) | Loaded from | Required for | What breaks if it fails to load |
|---|---|---|---|---|
| Google Fonts (Space Grotesk, Inter) | latest served by Google's `css2` endpoint (not pinned — see note below) | `fonts.googleapis.com` / `fonts.gstatic.com` | All typography | Browser falls back to `"Inter", sans-serif` → generic sans-serif; layout is unaffected, just looks less refined |
| GSAP core | `3.12.5` | `cdnjs.cloudflare.com` | The entire `motion.js` enhancement layer | `motion.js` returns immediately (`typeof gsap === "undefined"`); site falls back to baseline `main.js` behaviour |
| GSAP ScrollTrigger plugin | `3.12.5` (matched to core) | `cdnjs.cloudflare.com` | Scroll-linked parts of `motion.js` | Same as above — `motion.js` checks for `ScrollTrigger` too and bails if either is missing |
| Lenis (smooth scroll) | `1.1.13` | `cdn.jsdelivr.net` | Desktop smooth/inertia scrolling only | `motion.js` checks `typeof Lenis !== "undefined"` before using it — if missing, GSAP/ScrollTrigger-driven animations still work, visitors just get native (non-inertia) scrolling |
| Three.js | `0.160.0` | `unpkg.com` (ES module, via import map) | The 3D hero globe only | `globe.js`'s `import * as THREE from "three"` would fail to resolve; the existing SVG hero graphic is simply never replaced — nothing else on the page is affected |

## Why CDN scripts instead of npm packages

The project has no build tooling by design — no bundler, no `npm install`, nothing to keep updated in a lockfile. Given that, loading pinned-version CDN scripts is the same approach already used for Google Fonts, and keeps the "clone the folder, open `index.html` (via a server), it works" simplicity intact. This was a deliberate decision, not an oversight — see [architecture.md](architecture.md#why-this-architecture).

**Trade-off to be aware of:** this makes the site dependent on four external CDNs being reachable at page-load time for the enhanced experience (not for the site to function at all — see the fallback column above). If you ever need the site to work fully offline or behind a strict CSP with no external script hosts allowed, these four files would need to be vendored locally into the project (e.g. a `js/vendor/` folder) and the `<script>` `src` attributes updated to point at them — no code changes would be needed beyond that, since nothing else assumes a CDN origin.

## Detail per dependency

### GSAP + ScrollTrigger

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
```

Loaded as classic (non-module) scripts, in this exact order — `ScrollTrigger.min.js` is a GSAP plugin and expects the `gsap` global to already exist when it runs. Both are free of charge and open for commercial use (GSAP's licensing changed in 2024 to make all plugins, including ScrollTrigger, free for all use cases). Used throughout `js/motion.js` — see [animations.md](animations.md) for every specific effect.

### Lenis

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"></script>
```

A small (~4KB gzipped) smooth-scroll library. Exposes a single global class, `Lenis`. `motion.js` only instantiates it when `window.matchMedia("(min-width: 900px)").matches && window.matchMedia("(pointer: fine)").matches` — i.e. desktop with a mouse, never on touch devices (native touch scrolling is already smooth, and Lenis is primarily solving the "smooth out mouse-wheel scrolling" problem). It's wired to GSAP's own ticker (`gsap.ticker.add(...)`) and to `ScrollTrigger.update`, which is the officially recommended integration pattern between the two libraries — Lenis animates the *real* `window`/`document` scroll position frame-by-frame (it does not use a transformed wrapper `<div>`), which is specifically why it coexists correctly with `position: sticky` elements elsewhere on the page (the About and Services sticky panels) without breaking them.

The `window.__lenis` global is deliberately exposed (`window.__lenis = lenis` in `motion.js`) purely as a debugging/QA hook — it lets anyone open devtools and call `window.__lenis.scrollTo(...)` to test scroll-linked behaviour without fighting Lenis's own animation loop. It has no functional purpose for visitors.

**Configuration — `lerp`, not `duration`:**

```js
new Lenis({ lerp: 0.12, smoothWheel: true, wheelMultiplier: 1 });
```

Lenis supports two mutually-exclusive smoothing strategies, chosen by which option you pass: a fixed-`duration` eased animation, or a `lerp` (continuous per-frame damping toward whatever the current target is — this is also Lenis's own library default when neither is specified). **This project deliberately uses `lerp`, not `duration`.**

An earlier version of this configuration used `duration: 1.05`, and it produced a real, reported bug: scrolling would feel "stuck" for a couple of trackpad gestures and then suddenly rush through several sections at once. Reading Lenis's own source confirmed the mechanism — every wheel-event tick calls `scrollTo()` again internally, and in duration mode that **resets the in-flight animation's clock back to zero** each time and retargets slightly further. A fast trackpad fires dozens of ticks per second, faster than the animation can progress before being reset, so the visible position falls further and further behind the accumulated target while scrolling continues. The moment the gesture ends and ticks stop arriving, the last call is finally left uninterrupted and plays out the *entire* pent-up distance over its full duration — visually, a sudden fast scroll through multiple sections right after input has already stopped.

`lerp` mode has no such clock to reset: each frame simply computes `damp(currentPosition, target, lerp * 60, deltaTime)`, so a new wheel tick just moves the target a little further and the current position keeps smoothly closing whatever gap currently exists — there's no way for a large invisible backlog to accumulate. This was verified directly (not just reasoned about) by simulating a 1-second rapid-wheel-tick gesture against both configurations: the old `duration: 1.05` config left ~339px of lag the instant the simulated gesture stopped, which then took roughly 54 animation frames (~900ms) to visibly bleed off; the current `lerp: 0.12` config had the lag already down to ~2px by the same point, settling essentially immediately.

If this value is ever retuned: lower `lerp` = smoother/heavier (more perceptible lag between input and motion); higher `lerp` = snappier/lighter (closer to native scrolling). Do not reintroduce a `duration` option alongside `lerp` — Lenis's `Animate.advance()` checks for `duration && easing` first and will silently switch back into the buggy fixed-duration mode if both are present.

### Three.js

```html
<script type="importmap">
{ "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
</script>
<script type="module" src="js/globe.js"></script>
```

Loaded via a browser-native [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) rather than a `<script src="...three.js">` global — this is the standard no-bundler pattern for consuming Three.js, and it means `js/globe.js` can write ordinary `import * as THREE from "three";` at the top of an ES module and have the browser resolve `"three"` to the pinned unpkg URL itself. Only Three.js's core module is imported — no `examples/jsm` addons (no `OrbitControls`, no loaders) — because the globe is a fixed, non-interactive, procedurally-generated visual (see [assets.md](assets.md) for why there's no texture image involved either).

**Real cost, stated plainly:** this is a genuine payload — Three.js's unminified ES module build is roughly 150–200KB gzipped over the wire. It's loaded via `type="module"`, which is non-blocking (doesn't delay first paint), and it's cached by the browser after the first visit, but it is the single heaviest thing this site loads. This was a deliberate trade-off made when choosing a real 3D WebGL globe over a lighter 2D/SVG alternative — see the "Globe tech" decision recorded in this project's history. If the payload ever becomes a concern, the fallback described in [animations.md](animations.md#hero-globe-jsglobejs) already provides a clean lighter-weight option (skip loading these two tags entirely and the SVG becomes the permanent hero visual).

### Google Fonts

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Not version-pinned (Google's `css2` endpoint always serves the current version of each font), which is standard practice for Google Fonts and low-risk since font families rarely change in visually-breaking ways. `font-display: swap` means text renders immediately in a fallback font and swaps in once the webfont loads, rather than staying invisible.

## Form submission has no backend

Documented here rather than in components-reference.md because it's really a "missing dependency," not a component detail: the quote form (`#quoteForm` in the Contact section) has **no server-side integration of any kind**. On submit, `js/main.js` validates the required fields client-side, then builds a `mailto:` URL and navigates to it, handing off entirely to whatever email client is registered on the visitor's device. There is no fetch call, no third-party form service (no Formspree, no Netlify Forms, no EmailJS), and no analytics/conversion tracking on submission.

**Operational implication:** if a visitor has no email client configured (increasingly common, especially on desktop), the form will appear to do nothing when submitted. Wiring this to a real backend or form-handling service is the single most impactful functional gap in the site and should be treated as a pre-launch checklist item, not a documentation footnote — this doc simply records the current, real behaviour of the code as it exists today.
