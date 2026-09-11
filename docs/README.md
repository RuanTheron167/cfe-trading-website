# CFE Trading Website — Technical Documentation

This is the technical documentation for the CFE Trading marketing site. It documents the codebase **as implemented** — not a design brief or a wish list. If something described here doesn't match the code, the code is correct and this doc is stale; please fix the doc.

This is a static, no-build, no-framework website: five source files, zero local dependencies, a handful of pinned third-party scripts loaded from CDNs. There is no `package.json`, no bundler, and no server-side code. Any static file host (Netlify, Vercel, GitHub Pages, S3, cPanel, etc.) can serve it as-is.

## Project structure

```
CFE Website/
├── index.html          Single-page site — all sections, markup, script tags
├── css/
│   └── styles.css       All styling: tokens, layout, components, animations, responsive rules
├── js/
│   ├── main.js           Baseline behaviour (works with zero external dependencies)
│   ├── motion.js          GSAP/ScrollTrigger/Lenis scroll-choreography layer (optional enhancement)
│   └── globe.js           Three.js hero globe (optional enhancement, ES module)
├── assets/               Empty — see docs/assets.md, no binary/raster assets are used
├── docs/                 You are here
├── README.md
└── .gitignore
```

## How to run it locally

There's nothing to install or build. Any static file server works, e.g.:

```bash
cd "CFE Website"
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Opening `index.html` directly via `file://` also mostly works, but the `type="module"` script (`js/globe.js`) and the import map will be blocked by the browser's module CORS policy on `file://` — always test through an actual HTTP server.

## Documentation index

| Doc | Covers |
|---|---|
| [architecture.md](architecture.md) | The big picture: how the 5 files relate, the progressive-enhancement layering model, script load order, data flow between files |
| [components-reference.md](components-reference.md) | Every page section, its HTML anatomy, and the exact CSS classes / JS hooks / element IDs each one depends on |
| [styling-system.md](styling-system.md) | Design tokens, typography scale, layout patterns, the CSS architecture end to end |
| [animations.md](animations.md) | Every animation and interaction in the site: what it is, what triggers it, and what happens if its dependency is missing |
| [dependencies.md](dependencies.md) | Every external dependency (fonts + 4 CDN scripts), exact pinned versions, why each is there, and what breaks (nothing critical) if one fails to load |
| [responsive-behaviour.md](responsive-behaviour.md) | The two breakpoints (980px, 720px) and exactly what changes at each, per component |
| [assets.md](assets.md) | The favicon, the two inline SVG flag sprites, Google Fonts — and confirmation that there are no raster images anywhere in the project |

## The one sentence summary

The site is a normal static HTML/CSS page (fully functional on its own) with an optional "motion layer" (GSAP + ScrollTrigger + Lenis + Three.js, all loaded from CDNs) that progressively enhances it with scroll-driven animation, a 3D globe, and scrollytelling — and every one of those enhancements is written to fail silently and leave the plain version working if its dependency doesn't load, if WebGL isn't available, or if the visitor has `prefers-reduced-motion` set.
