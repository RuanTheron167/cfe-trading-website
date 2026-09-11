# Assets

## There are no raster images anywhere in this project

The `assets/` folder exists but is empty. Every visual element on the site — the globe, the route graphic, the icons, the flags, the favicon — is either pure CSS (gradients, box-shadows), inline SVG markup, or procedurally generated at runtime. This was a deliberate choice made when the site was first built (not a placeholder waiting to be filled in), for three reasons: it keeps the page weight tiny, it avoids any photo-licensing question entirely, and it fits the "industrial, minimal, flat" brand direction better than stock photography would.

If a future redesign introduces real photography or product imagery, `assets/` is exactly where those files should live, and `index.html`/`css/styles.css` would need `<img>` tags or `background-image` rules added — none currently exist anywhere in the codebase.

## Favicon

Defined entirely inline in `index.html`'s `<head>`, as a data URI — no separate `.ico`/`.png` file:

```html
<link rel="icon" href="data:image/svg+xml,%3Csvg ...%3E">
```

It's a small SVG: a rounded square in `--bg` (`#0a0d12`) with a bold gold "C" centered in it. Because it's a data URI, there is nothing to host separately and nothing that can 404.

## The two SVG flag sprites

Defined once, hidden, near the top of `<body>` in `index.html`:

```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="flag-cn" viewBox="0 0 640 480">...</symbol>
    <symbol id="flag-za" viewBox="0 0 640 480">...</symbol>
  </defs>
</svg>
```

**Provenance:** these paths were sourced from the [flag-icons](https://github.com/lipis/flag-icons) project (MIT licensed), specifically the `4x3/cn.svg` and `4x3/za.svg` files — not hand-drawn, not a simplified approximation. This matters for the South African flag in particular, which has a genuinely intricate six-colour geometric construction (a black hoist triangle bordered in white, surrounded by a green "Y" bordered in gold, splitting into red-top/blue-bottom bands) that would be easy to get subtly wrong by hand; using the real, accurate path data avoids that risk entirely.

**Reused three times**, always via `<use href="#flag-cn">` / `<use href="#flag-za">`:
1. Inside the hero's `#routeSvg`, next to the China/South Africa markers (small, positioned with explicit `x`/`y`/`width`/`height` on the `<use>` element itself, since it's already inside a viewBox-having parent `<svg>`).
2. In the Process section's `.route-endpoint-start`/`-end` badges, each inside its own standalone `<svg class="flag-icon" viewBox="0 0 640 480">`.
3. In `js/globe.js`'s DOM overlay markers, created programmatically (`document.createElementNS(...)`) with the same `viewBox="0 0 640 480"` set explicitly on the generated `<svg>`.

**The one rule that must never be dropped:** any *standalone* `<svg>` wrapper containing a `<use href="#flag-...">` must itself declare `viewBox="0 0 640 480"` (matching the symbol's own viewBox). Without it, the browser has no coordinate system in which to scale the referenced symbol's content down into the small rendered box, and the flag renders as a tiny, wrongly-positioned fragment — this was a real bug caught and fixed during development (see the flag sprite note in [components-reference.md](components-reference.md#flag-sprite-hidden-top-of-body)). The one place this rule does *not* apply is usage #1 above, where the `<use>` lives inside `#routeSvg`, which already has its own `viewBox="0 0 520 520"` — in that case the `<use>` element's own `width`/`height` attributes are what control its rendered size.

## Icons

Two distinct icon systems, both inline SVG, neither an icon font or an external icon library:

1. **Service icons** (Factory Sourcing, Price Negotiation, Quality Control, Export & Freight, SA Customs Clearance, Final-Mile Delivery) — six small hand-drawn line icons, defined as raw SVG markup strings in the `SERVICE_ICONS` array inside `js/motion.js`, injected into the Services section's sticky panel (`#servicesStickyIcon`) at runtime as the active card changes. They live in JS rather than in `index.html` because they're only ever needed by the desktop scrollytelling sticky panel — there was no reason to duplicate six extra SVGs into the markup that ships to every visitor when only the enhancement layer (and only on desktop) ever displays them.
2. **Everything else** (the `+`/`×` accordion toggle, the "語"/"¥"/"✓"/"⇥" glyphs used as small badge icons in the hero/value-strip, the hamburger's three `<span>` bars) — these are plain text/Unicode characters or CSS-drawn shapes, not SVG at all. This is intentional minimalism, not a placeholder — there was no need to reach for SVG icons for single-glyph badges.

## Fonts

Loaded from Google Fonts, not self-hosted — see [dependencies.md](dependencies.md#google-fonts) for the exact `<link>` tags and licensing note. No font files exist in this repository.

## The Three.js-generated glow texture

Worth calling out specifically because it's the one piece of "art" that's neither SVG nor a static file: `js/globe.js`'s `makeGlowTexture()` function draws a soft radial gradient (gold, fading to transparent) onto an offscreen `<canvas>` at runtime using the 2D Canvas API, then hands that canvas to Three.js as a `CanvasTexture` for the ambient glow sprite behind the globe. This keeps the globe's "art" fully procedural and dependency-free — no image file to host, license, or keep in sync with the palette tokens (the gradient's colour is hard-coded to match `--gold` at the time of writing; if `--gold` in `css/styles.css` is ever changed, this function's hard-coded `"rgba(217,164,65,...)"` values should be updated to match, since JS cannot read a CSS custom property's *computed* value without an explicit `getComputedStyle` call, which `globe.js` does not currently make).
