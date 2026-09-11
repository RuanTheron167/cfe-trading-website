# Animations & Interactions

Every animation in the site, grouped by which system owns it. For each one: what it is, what triggers it, and what happens if its dependency is unavailable.

## The `.reveal` system

The most-used animation in the site — a fade-up-into-view applied to dozens of elements across every section. It has **exactly one owner at a time**, decided by `window.__motionEnhanced`:

| | Owner: `js/main.js` (baseline) | Owner: `js/motion.js` (enhanced) |
|---|---|---|
| **Active when** | `window.__motionEnhanced` is falsy (GSAP/ScrollTrigger failed to load, or reduced-motion is on) | `motion.js` ran successfully and set `window.__motionEnhanced = true` |
| **Mechanism** | `IntersectionObserver` (threshold 0.15, -60px bottom margin) adds `.in-view` to each `.reveal` element once, then unobserves it. CSS `.reveal{opacity:0;transform:translateY(28px);transition:...}` → `.reveal.in-view{opacity:1;transform:translateY(0)}` does the actual animating. | `gsap.fromTo()` per element with its own `scrollTrigger:{trigger:el, start:"top 88%"}`, animating `opacity`/`y`/`scale` directly via inline styles. `html.gsap-enhanced .reveal{transition:none}` disables the CSS transition so it can't fight GSAP's own tweening of the same properties. |
| **Per-element nuance** | A handful of `nth-child` rules give staggered `transition-delay` to `.service-card` (0→0.3s) and `.value-item` (0→0.24s) siblings, plus fixed delays on `.hero-copy`/`.hero-visual` | Same stagger intent, reimplemented as a `DELAY_MAP = {"hero-copy":0.05, "hero-visual":0.2}` lookup; sibling stagger for service cards/value items isn't reproduced explicitly in JS but the effect is close enough visually that it wasn't worth duplicating — **note for future maintainers:** if you want identical staggering under both systems, port the `nth-child` delays into `DELAY_MAP` or a similar per-selector table |
| **Elements treated as "headings"** (get a scale-in from 0.97, not just fade/rise) | N/A — CSS system has no scale effect | Any `.reveal` element that also has `.section-head` or `.display-lg` |

**Why this matters for anyone editing the site:** if you add a new element with class `reveal`, it is automatically picked up by *whichever* system is active — no registration needed. You do not need to add anything to `motion.js` for a plain fade-up to work. You only need to touch `motion.js` if the new element needs bespoke behaviour (scrubbing, pinning, a sticky panel, etc.).

## Section-seam transitions

Three sections — `.value-strip`, `.services`, `.compare` — additionally carry class `.section-transition`. `motion.js`'s `setupSectionTransitions()` gives each one a scroll-**scrubbed** (not one-shot) `opacity 0.4→1 / y 46→0 / scale 0.985→1` tween across the range `start:"top 92%"` to `end:"top 58%"`. This is deliberately only three of the page's nine sections — the three highest-impact transitions (Hero→Value strip, About→Services, Process→Compare) — rather than instrumenting every section boundary identically, to avoid overusing the effect.

**No GSAP → no effect at all** (the sections just render normally; they have no independent CSS animation of their own beyond whatever their child `.reveal` elements do).

## Hero globe (`js/globe.js`)

Everything about the globe is described in detail in this file's own extensive header comments; the short version:

| Layer | What it does | Notes |
|---|---|---|
| Continuous rotation | `globeGroup.rotation.y += autoSpeed * delta`, `autoSpeed = 2π/150` — one full rotation every ~150 seconds | Runs every animation frame while the render loop is active |
| Scroll-linked tilt | An extra `±0.08 rad` added to `rotation.x`, computed from how far the `.hero` section has scrolled through the viewport | Skipped entirely in simplified/mobile mode (see below) |
| Travelling packet | A small sphere moves along the China↔SA arc on a 4.5s loop (`curve.getPointAt(t)`) | The 3D equivalent of the SVG fallback's `<animateMotion>` mover dot |
| Marker labels/flags | Real DOM elements (`.globe-marker`), **not** baked into the WebGL canvas — repositioned every frame via `Vector3.project(camera)` and faded based on whether that point on the sphere currently faces the camera | Chosen deliberately so the flags/text stay crisp and reuse ordinary CSS, rather than being rendered into a texture |

**Three tiers of fallback**, checked in order at the very top of `globe.js`, before anything is created:
1. `prefers-reduced-motion: reduce` → **full fallback**, do nothing, the SVG stays exactly as it always was.
2. `navigator.hardwareConcurrency <= 2` or `navigator.deviceMemory <= 2` (very low-end device) → **full fallback**, same as above.
3. No WebGL context available (`webgl2`/`webgl` both fail) → **full fallback**, same as above.
4. Otherwise, if viewport ≤980px → **simplified 3D**: fewer dot-sphere points (14 lat steps instead of 22), capped pixel ratio at 1.5 instead of 2, and the scroll-linked tilt is skipped — but it is still the real WebGL globe, not the SVG.
5. Otherwise → full desktop 3D experience.

The render loop (`requestAnimationFrame`) is paused (not just throttled) whenever the `.hero` section scrolls out of view (`IntersectionObserver`, threshold 0.05) or the browser tab is hidden (`visibilitychange` → `document.hidden`), and resumed when either condition clears. A `webglcontextlost` handler also exists as a last-resort safety net — if the GPU context is ever lost mid-session, it stops the loop and reverts to the SVG rather than showing a frozen/broken canvas.

**Independent of `motion.js` entirely** — it does not check for GSAP, does not use ScrollTrigger, and would behave identically even if `motion.js` were deleted.

## Services scrollytelling

Covered in detail in [components-reference.md](components-reference.md#services--servicessection-transitionservices). Summary: a `scroll`/`resize` listener (desktop-only, via `gsap.matchMedia().add("(min-width: 981px)", ...)`) recomputes which `.service-card`'s center is closest to the viewport's vertical center on every event, and synchronously updates the sticky panel's text/icon plus the active card's highlight class.

**Deliberately not built on ScrollTrigger's `onEnter`/`onEnterBack` edge-callbacks** — an earlier version was, and it had a real bug: a fast scroll (or an instant programmatic jump) could cross several cards' trigger zones within a single update, and GSAP would fire multiple `onEnter` calls in the same tick, each one killing/overwriting the previous one's in-flight tween — the *class* would end up on the correct final card, but the *text content* (which was updated inside a tween's `onComplete`) could get stuck on an earlier card's data because its callback got cancelled before running. The fix was two-fold and both parts matter:
1. Update the sticky panel's `textContent`/`innerHTML` **synchronously**, not inside an animation's `onComplete` — the GSAP tween on the sticky panel is now purely a cosmetic fade/slide accent layered on top of an always-correct DOM state, never a gate on correctness.
2. Replace the six separate edge-triggered `ScrollTrigger`s with a single geometry check (`closestCardIndex()`) that's recomputed fresh on every scroll event — there's no "edge" to cross or skip, so it can't desync regardless of scroll speed.

## Process section

- **Timeline fill + travelling dot** — baseline behaviour, not part of the enhancement layer at all. See [architecture.md](architecture.md#data-flow-example-the-process-section-timeline-dot).
- **Section-head pin** — desktop-only (`gsap.matchMedia().add("(min-width: 981px)", ...)`), pins `.section-head` in place via `ScrollTrigger`'s `pin` option for 260px of scroll (`start:"top 120px"`, `end:"+=260"`) as the timeline begins, then releases it. Purely a GSAP/ScrollTrigger effect — no fallback needed because without GSAP the heading simply scrolls normally, which is already a perfectly good default.

## About section

- **Sticky heading** — pure CSS (`position: sticky`), not JS-dependent at all; disabled (`position: static`) below 981px via the same media query CSS already uses elsewhere.
- **Staggered paragraph reveal** — desktop-only GSAP scrub (`scrub: 0.5`) on the two `<p class="reveal">` elements plus the "See exactly how it works →" link, each independently fading in as it crosses `top 78%` → `top 42%`. Below 981px, or with no GSAP, these three elements just use the plain one-shot `.reveal` system instead (see above) — there's no dedicated fallback code because they already carry the shared `.reveal` class.
- **Drifting dot-field layer** — a scroll-scrubbed `yPercent: 8` parallax on `.about-dot-field`, **not** matchMedia-gated (runs at all widths), but subtle enough (a faint radial-dot texture) that it doesn't need to be.

## Micro-interactions (pure CSS, always active regardless of JS)

| Interaction | Selector | Mechanism |
|---|---|---|
| Nav link sliding underline | `.nav-links a::after` | `right: 100%` → `right: 0` on `:hover` or `.active` |
| Text-link sliding underline | `.text-link::after` | Same technique, `currentColor` |
| Footer link sliding underline | `.footer-col a::after` | Same technique, `var(--gold-2)` |
| Button press feedback | `.btn:active` | `transform: scale(.97)` |
| Button hover lift | `.btn-primary:hover` / `.btn-ghost:hover` | `transform: translateY(-2px)` + colour change |
| Chip hover lift | `.chip:hover` | `transform: translateY(-2px)` + colour change |
| Service card hover | `.service-card:hover` | Background swap to `--surface-2` |
| Accordion icon rotation | `.accordion-item.open .accordion-icon` | `transform: rotate(45deg)` (turns the `+` into a `×`) |

None of these depend on `motion.js` or `globe.js` — they are plain `:hover`/`:active` CSS and work identically with every script blocked.

## Nav active-section indicator

`motion.js`'s `setupNavIndicator()` creates one `ScrollTrigger` per nav link (`start:"top 40%"`, `end:"bottom 40%"` on the link's target section), adding `.active` to whichever link's section is currently in that 40%-from-top band. GSAP-only — with no GSAP, nav links simply have no active state (they still work as plain anchor links).

## Reduced motion

Checked independently, at the very top, by both enhancement scripts:

- `js/globe.js`: `if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;` — the entire Three.js globe is skipped.
- `js/motion.js`: `if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;` — the entire GSAP/ScrollTrigger/Lenis layer is skipped, and `window.__motionEnhanced` is never set, so `main.js`'s plain reveal system takes over automatically.
- `css/styles.css`'s own `@media (prefers-reduced-motion: reduce)` block (see [styling-system.md](styling-system.md#reduced-motion)) independently disables the purely-CSS decorative animations (ticker, pulse rings, mini-card float, trade-path dash, SVG mover, globe marker pulse).

**A visitor with reduced-motion enabled gets, deterministically, the exact same experience as a visitor whose browser has no JavaScript at all** (see next section) — full content, no motion, no globe, no scrollytelling. This is intentional, not a degraded afterthought.

## What the site looks like with JavaScript entirely disabled

Everything above the fold and every section renders correctly — all content, all layout, all responsive behaviour, all `:hover`/`:active` CSS interactions. The specific things that don't work: the mobile hamburger menu won't open (it's JS-toggled), the FAQ accordion panels won't expand, the quote form won't validate or build its `mailto:` link (though the `<form>` will still visually render), `.reveal` elements stay at their CSS-default hidden state forever (since neither the IntersectionObserver nor GSAP ever runs to reveal them — **this is the one real degradation**, worth knowing about if progressive enhancement without JS is ever a hard requirement), and the hero shows its SVG (never replaced by the canvas). This is a reasonable, honest no-JS experience for a site that was never built with a no-JS requirement in mind.
