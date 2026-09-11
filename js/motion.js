(function(){
  "use strict";

  /*
   * Scroll choreography layer — GSAP + ScrollTrigger (+ optional Lenis).
   * Fails closed: if GSAP/ScrollTrigger didn't load, or the visitor has
   * reduced-motion enabled, this does nothing and main.js's existing
   * plain .reveal IntersectionObserver keeps the site working exactly
   * as it did before this upgrade.
   */
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add("gsap-enhanced");
  window.__motionEnhanced = true;

  var DELAY_MAP = { "hero-copy": 0.05, "hero-visual": 0.2 };

  // ---- Lenis smooth scroll: desktop + fine pointer only ----
  var wantsLenis = window.matchMedia("(min-width: 900px)").matches && window.matchMedia("(pointer: fine)").matches;
  if (wantsLenis && typeof Lenis !== "undefined"){
    // Deliberately lerp-based, not duration-based: a fixed-duration eased
    // animation gets its internal clock reset on every new wheel tick, so a
    // continuous trackpad swipe (many ticks/sec) keeps restarting it and the
    // visible position falls behind the accumulated target — then the whole
    // pent-up distance plays out in one fast burst once scrolling stops.
    // lerp mode just damps continuously toward whatever the current target
    // is, every frame, so there's no backlog that can build up like that.
    var lenis = new Lenis({ lerp: 0.12, smoothWheel: true, wheelMultiplier: 1 });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function(time){ lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // ---- Generic .reveal handling (supersedes main.js's plain version) ----
  function setupReveals(){
    document.querySelectorAll(".reveal").forEach(function(el){
      var isHeading = el.classList.contains("section-head") || el.classList.contains("display-lg");
      var delay = 0;
      for (var key in DELAY_MAP){
        if (el.classList.contains(key)) delay = DELAY_MAP[key];
      }
      gsap.fromTo(el,
        { opacity: 0, y: 28, scale: isHeading ? 0.97 : 1 },
        {
          opacity: 1, y: 0, scale: 1,
          duration: 0.8,
          delay: delay,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%" }
        }
      );
    });
  }

  // ---- Section-seam crossfades (Hero->Value strip, About->Services, Process->Compare) ----
  function setupSectionTransitions(){
    document.querySelectorAll(".section-transition").forEach(function(section){
      gsap.fromTo(section,
        { opacity: 0.4, y: 46, scale: 0.985 },
        {
          opacity: 1, y: 0, scale: 1,
          ease: "power1.out",
          scrollTrigger: { trigger: section, start: "top 92%", end: "top 58%", scrub: 0.6 }
        }
      );
    });
  }

  // ---- Nav active-section indicator ----
  function setupNavIndicator(){
    var navLinks = document.querySelectorAll(".nav-links a[href^='#']");
    if (!navLinks.length) return;
    navLinks.forEach(function(link){
      var target = document.getElementById(link.getAttribute("href").slice(1));
      if (!target) return;
      ScrollTrigger.create({
        trigger: target,
        start: "top 40%",
        end: "bottom 40%",
        onToggle: function(self){
          if (!self.isActive) return;
          navLinks.forEach(function(l){ l.classList.remove("active"); });
          link.classList.add("active");
        }
      });
    });
  }

  // ---- About: staggered paragraph reveal (desktop) + subtle drifting dot layer ----
  function setupAbout(){
    var section = document.querySelector(".about");
    if (!section) return;

    gsap.matchMedia().add("(min-width: 981px)", function(){
      section.querySelectorAll(".about-copy .reveal").forEach(function(p){
        gsap.fromTo(p, { opacity: 0.25, y: 22 }, {
          opacity: 1, y: 0, ease: "power1.out",
          scrollTrigger: { trigger: p, start: "top 78%", end: "top 42%", scrub: 0.5 }
        });
      });
    });

    var driftLayer = section.querySelector(".about-dot-field");
    if (driftLayer){
      gsap.to(driftLayer, {
        yPercent: 8,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true }
      });
    }
  }

  // ---- Services: sticky panel tracks the active card while scrolling (desktop) ----
  var SERVICE_ICONS = [
    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 40V20l10 6V20l10 6V14l10 8v18z"/><path d="M6 40h32"/></svg>',
    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 26 18 14l8 8-12 12z"/><path d="M22 18l6-6 12 12-6 6"/><path d="M14 30l4 4M18 26l4 4"/></svg>',
    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="20" cy="20" r="12"/><path d="M29 29 40 40"/><path d="M15 20l4 4 8-8"/></svg>',
    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 30h36l-4 8H10z"/><path d="M12 30V16h16l6 8"/><circle cx="16" cy="40" r="2.4"/><circle cx="32" cy="40" r="2.4"/></svg>',
    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="10" y="8" width="22" height="28" rx="1.5"/><path d="M16 16h10M16 22h10M16 28h6"/><circle cx="34" cy="32" r="8"/><path d="M30 32l3 3 5-6"/></svg>',
    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 32V16h18v16"/><path d="M24 22h9l7 7v3h-4"/><circle cx="14" cy="35" r="3.2"/><circle cx="34" cy="35" r="3.2"/></svg>'
  ];

  function setupServices(){
    var scroller = document.querySelector(".services-scroller");
    var sticky = document.getElementById("servicesSticky");
    if (!scroller || !sticky) return;

    var numEl = document.getElementById("servicesStickyNum");
    var iconEl = document.getElementById("servicesStickyIcon");
    var titleEl = document.getElementById("servicesStickyTitle");
    var cards = scroller.querySelectorAll(".service-card");
    if (iconEl && !iconEl.innerHTML) iconEl.innerHTML = SERVICE_ICONS[0];

    gsap.matchMedia().add("(min-width: 981px)", function(){
      var activeIndex = -1;

      // Derived from live scroll progress (not enter/leave edge events) so it
      // can never desync or skip a card, even on a very fast scroll or an
      // instant programmatic jump.
      function applyActive(i){
        if (i === activeIndex) return;
        activeIndex = i;
        var card = cards[i];
        cards.forEach(function(c){ c.classList.remove("is-active"); });
        card.classList.add("is-active");
        numEl.textContent = card.querySelector(".service-num").textContent;
        titleEl.textContent = card.querySelector("h3").textContent;
        iconEl.innerHTML = SERVICE_ICONS[i] || "";
        gsap.fromTo(sticky, { opacity: 0.45, y: 6 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out", overwrite: true });
      }

      // Pick whichever card's own center is closest to the viewport's
      // vertical center. Plain geometry, recomputed fresh on every call —
      // no edge-crossing semantics to miscalibrate or skip on a fast scroll.
      function closestCardIndex(){
        var centerY = window.innerHeight / 2;
        var bestIndex = 0;
        var bestDist = Infinity;
        cards.forEach(function(card, i){
          var rect = card.getBoundingClientRect();
          var dist = Math.abs(rect.top + rect.height / 2 - centerY);
          if (dist < bestDist){ bestDist = dist; bestIndex = i; }
        });
        return bestIndex;
      }

      function onScrollOrResize(){
        var rect = scroller.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return; // scroller off-screen, skip
        applyActive(closestCardIndex());
      }

      applyActive(closestCardIndex());
      window.addEventListener("scroll", onScrollOrResize, { passive: true });
      window.addEventListener("resize", onScrollOrResize);

      return function(){
        cards.forEach(function(c){ c.classList.remove("is-active"); });
        window.removeEventListener("scroll", onScrollOrResize);
        window.removeEventListener("resize", onScrollOrResize);
      };
    });
  }

  // ---- Process: brief pin of the heading while the timeline scrolls beneath (desktop) ----
  function setupProcess(){
    var section = document.querySelector(".process");
    if (!section) return;
    var head = section.querySelector(".section-head");
    var timeline = section.querySelector(".timeline");
    if (!head || !timeline) return;

    gsap.matchMedia().add("(min-width: 981px)", function(){
      var st = ScrollTrigger.create({
        trigger: timeline,
        start: "top 120px",
        end: "+=260",
        pin: head,
        pinSpacing: false
      });
      return function(){ st.kill(); };
    });
  }

  setupReveals();
  setupSectionTransitions();
  setupNavIndicator();
  setupAbout();
  setupServices();
  setupProcess();

  window.addEventListener("load", function(){ ScrollTrigger.refresh(); });
})();
