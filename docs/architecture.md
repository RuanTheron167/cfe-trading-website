# Architecture

## Mental model: two layers

The codebase is built as a **baseline layer** that works with zero external dependencies, plus an **optional enhancement layer** that adds scroll-driven motion and a 3D globe on top of it. The enhancement layer is written so that if any part of it fails to load or is deliberately skipped, the baseline layer keeps the site fully functional.

```
┌─────────────────────────────────────────────────────────────┐
│  BASELINE LAYER (always active, zero dependencies)           │
│  index.html + css/styles.css + js/main.js                    │
│  → nav, mobile menu, accordion, form, plain fade-in reveals,  │
│    the scroll-driven timeline fill, the SVG hero graphic      │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ enhances, never replaces
┌─────────────────────────────────────────────────────────────┐
│  ENHANCEMENT LAYER (optional, CDN-loaded, independent halves) │
│                                                                │
│  js/globe.js  → Three.js 3D globe (replaces the SVG visually  │
│                  only after it succeeds; independent of GSAP) │
│                                                                │
│  js/motion.js → GSAP + ScrollTrigger + Lenis scrollytelling    │
│                  (independent of globe.js)                    │
└─────────────────────────────────────────────────────────────┘
```

`globe.js` and `motion.js` do not depend on each other. Either can fail, be blocked by an ad-blocker, or be skipped (reduced-motion, no WebGL) without affecting the other, and without affecting the baseline layer.

## File relationship map

| File | Depends on | Read by / affects |
|---|---|---|
| `index.html` | `css/styles.css`, all three JS files, Google Fonts, 4 CDN scripts | — |
| `css/styles.css` | Nothing (pure CSS, uses CSS custom properties defined in its own `:root`) | Every element in `index.html`; toggled by classes that `main.js`, `motion.js` and `globe.js` add at runtime (`.in-view`, `.gsap-enhanced`, `.is-active`, `.scrolled`, `.open`, `.active`) |
| `js/main.js` | DOM elements by ID (`nav`, `burger`, `mobileMenu`, `quoteForm`, `formNote`, `year`) and by class (`.reveal`, `.timeline`, `.accordion-item`) | Sets `window.__motionEnhanced` check (reads it, doesn't set it); sets the `--tl-progress` CSS custom property that `.timeline-dot` (CSS) reads |
| `js/motion.js` | Global `gsap`, `ScrollTrigger`, `Lenis` (from CDN scripts loaded earlier in `index.html`); DOM elements by class/ID | Sets `window.__motionEnhanced = true` (read by `main.js`); sets `window.__lenis` (debugging hook); adds `.gsap-enhanced` class to `<html>` (read by CSS to disable the plain CSS transition on `.reveal`) |
| `js/globe.js` | Global `THREE` (via import map, ES module); DOM elements `#globeMount`, `#routeSvg`, `.hero` | Toggles `.is-active` on `#globeMount` and `.is-hidden` on `#routeSvg` (both read by CSS); entirely independent of `motion.js` |

## Script load order (bottom of `<body>` in `index.html`)

Order matters here — later scripts assume earlier ones have already run.

```html
1. gsap.min.js                (CDN, cdnjs)
2. ScrollTrigger.min.js        (CDN, cdnjs — GSAP plugin, needs gsap already loaded)
3. lenis.min.js                 (CDN, jsdelivr — standalone, no dependency on GSAP)
4. <script type="importmap">    (maps the bare specifier "three" to a CDN URL)
5. js/globe.js                  (type="module" — deferred by default, runs after HTML parsing;
                                  independent of everything above except the "three" import map)
6. js/motion.js                 (plain script — runs synchronously at this point in parsing;
                                  checks for gsap/ScrollTrigger/Lenis as globals)
7. js/main.js                   (plain script — runs last; checks window.__motionEnhanced,
                                  which motion.js has by now already set if it activated)
```

Because `js/motion.js` is a classic (non-module) script, it executes synchronously in document order — by the time it runs, scripts 1–3 have already executed and `gsap`/`ScrollTrigger`/`Lenis` exist as globals (or don't, if a CDN failed). `js/globe.js` is a module script, which is deferred until after the document is parsed but before `DOMContentLoaded` — in practice it also runs before the two classic scripts below it, but it doesn't matter: it has no dependency on them.

**Critical ordering constraint:** `js/motion.js` must load *before* `js/main.js`. `main.js` reads `window.__motionEnhanced` to decide whether to run its own plain `.reveal` IntersectionObserver. If this order were reversed, both systems would run and double-animate the same elements.

## Why this architecture

1. **No build step, ever.** Every dependency is a `<script>` tag or an import-map entry, exactly like the pre-existing Google Fonts `<link>`. There is nothing to `npm install`, nothing to compile, nothing that can go stale in a lockfile.
2. **Nothing new is a hard dependency.** GSAP, ScrollTrigger, Lenis and Three.js are all genuinely optional — a CDN outage, an ad-blocker, an old browser, or `prefers-reduced-motion` simply means visitors get the plain (still complete, still attractive) version of the site instead of the motion-enhanced one.
3. **Single source of truth per behaviour.** Nothing is animated by two systems at once. The `window.__motionEnhanced` flag is the one gate that decides which system owns `.reveal` elements; `globe.js`'s `.is-active`/`.is-hidden` classes are the one gate that decides whether the SVG or the WebGL canvas is visible.
4. **Every enhancement fails closed, not open.** Each of `globe.js` and `motion.js` checks its preconditions (reduced-motion, WebGL support, `typeof gsap`) as the very first thing it does, and returns immediately if any fail — before creating any DOM nodes, timers, or listeners. There is no code path where a failed enhancement leaves the page in a half-broken state.

## Data flow example: the Process-section timeline dot

This is a good example of how the two layers cooperate without one depending on the other:

1. `js/main.js` (baseline, always runs) computes a scroll-progress percentage for the `.timeline` element on every scroll/resize event and writes it to a CSS custom property: `timeline.style.setProperty("--tl-progress", pct + "%")`.
2. `css/styles.css` defines `.timeline-dot { top: var(--tl-progress, 0%); ... }` — pure CSS reads that custom property.
3. `js/motion.js` never touches this at all. Even if GSAP fails to load entirely, the travelling dot on the Process timeline still works, because it was never part of the enhancement layer — it's baseline behaviour that happens to look like scrollytelling.

This pattern (JS computes a value → CSS custom property → CSS does the rendering) is used deliberately wherever it's sufficient, and is one of the reasons so much of the site's polish is not actually dependent on GSAP.
