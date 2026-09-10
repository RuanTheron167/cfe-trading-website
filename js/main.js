(function(){
  "use strict";

  /* Footer year */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Nav background on scroll */
  var nav = document.getElementById("nav");
  function onScroll(){
    if (window.scrollY > 12) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile menu */
  var burger = document.getElementById("burger");
  var mobileMenu = document.getElementById("mobileMenu");
  burger.addEventListener("click", function(){
    var open = mobileMenu.classList.toggle("open");
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });
  mobileMenu.querySelectorAll("a").forEach(function(a){
    a.addEventListener("click", function(){
      mobileMenu.classList.remove("open");
      burger.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    });
  });

  /* Scroll-reveal */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add("in-view"); });
  }

  /* Timeline fill progress */
  var timeline = document.querySelector(".timeline");
  if (timeline){
    var updateTimeline = function(){
      var rect = timeline.getBoundingClientRect();
      var vh = window.innerHeight;
      var total = rect.height;
      var visible = vh * 0.75 - rect.top;
      var pct = Math.max(0, Math.min(1, visible / total));
      timeline.style.setProperty("--tl-progress", (pct * 100) + "%");
    };
    updateTimeline();
    window.addEventListener("scroll", updateTimeline, { passive: true });
    window.addEventListener("resize", updateTimeline);
  }

  /* Accordion */
  var accordionItems = document.querySelectorAll(".accordion-item");
  accordionItems.forEach(function(item){
    var trigger = item.querySelector(".accordion-trigger");
    var panel = item.querySelector(".accordion-panel");
    trigger.addEventListener("click", function(){
      var isOpen = item.classList.contains("open");
      accordionItems.forEach(function(other){
        other.classList.remove("open");
        other.querySelector(".accordion-panel").style.maxHeight = null;
      });
      if (!isOpen){
        item.classList.add("open");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  });

  /* Quote form (front-end only — wire to a real backend/email service before launch) */
  var form = document.getElementById("quoteForm");
  var formNote = document.getElementById("formNote");
  if (form){
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var product = form.product.value.trim();
      if (!name || !email || !product){
        formNote.textContent = "Please fill in your name, email and product details.";
        formNote.classList.remove("success");
        return;
      }

      var subject = encodeURIComponent("Quote Request from " + name);
      var body = encodeURIComponent(
        "Name: " + name + "\n" +
        "Email: " + email + "\n" +
        "Phone: " + (form.phone.value.trim() || "-") + "\n\n" +
        "Product details:\n" + product
      );
      window.location.href = "mailto:info@cfetrading.co.za?subject=" + subject + "&body=" + body;

      formNote.textContent = "Opening your email client to send this request...";
      formNote.classList.add("success");
    });
  }
})();
