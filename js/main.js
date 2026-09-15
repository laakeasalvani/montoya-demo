(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var noHover = window.matchMedia("(hover: none)").matches;

  /* ---------------- page routing (#/about, #/services ...) ---------------- */
  var pages = document.querySelectorAll(".page");
  var navLinks = document.querySelectorAll("a[data-route]");

  function routeFromHash() {
    var h = location.hash;
    if (h.indexOf("#/") !== 0) return null;
    var name = h.slice(2) || "home";
    return document.querySelector('.page[data-page="' + name + '"]') ? name : "home";
  }

  function show(name) {
    pages.forEach(function (p) {
      var on = p.dataset.page === name;
      if (on && p.hidden) { p.hidden = false; p.style.animation = "none"; void p.offsetWidth; p.style.animation = ""; }
      if (!on) p.hidden = true;
      if (!on) p.querySelectorAll("video").forEach(function (v) { v.pause(); });
    });
    navLinks.forEach(function (a) { a.classList.toggle("is-current", a.dataset.route === name); });
    closeMenu();
    if (name === "home") hero.start(); else hero.stop();
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", function () {
    var r = routeFromHash();
    if (r) show(r);
  });

  /* in-page jump links on the services page shouldn't change the route */
  document.querySelectorAll('.svc-jump a').forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var t = document.querySelector(a.getAttribute("href"));
      if (t) t.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  });

  /* ---------------- mobile menu ---------------- */
  var toggle = document.querySelector(".menu-toggle");
  var menu = document.getElementById("mobile-menu");
  var menuClose = menu.querySelector(".menu-close");

  function openMenu() {
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    menuClose.focus();
  }
  function closeMenu() {
    if (menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
  toggle.addEventListener("click", openMenu);
  menuClose.addEventListener("click", function () { closeMenu(); toggle.focus(); });
  /* any link inside the menu closes it (the hashchange then switches the page) */
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  window.addEventListener("resize", function () { if (window.innerWidth > 900) closeMenu(); });

  /* ---------------- hero: cross-fading job clips ---------------- */
  var hero = (function () {
    var vids = Array.prototype.slice.call(document.querySelectorAll(".hero-video"));
    var steps = document.querySelectorAll(".ticker-steps i");
    var i = 0, timer = null, running = false;

    function mark() { steps.forEach(function (s, n) { s.classList.toggle("is-on", n === i); }); }
    function safePlay(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

    function next() {
      var cur = vids[i];
      i = (i + 1) % vids.length;
      var nv = vids[i];
      nv.currentTime = 0;
      safePlay(nv);
      nv.classList.add("is-active");
      cur.classList.remove("is-active");
      setTimeout(function () { if (!cur.classList.contains("is-active")) cur.pause(); }, 1200);
      vids[(i + 1) % vids.length].preload = "auto";
      mark();
    }

    return {
      start: function () {
        if (running || reduceMotion || !vids.length) return;
        running = true;
        vids[1] && (vids[1].preload = "auto");
        safePlay(vids[i]);
        timer = setInterval(next, 6500);
      },
      stop: function () {
        running = false;
        clearInterval(timer);
        vids.forEach(function (v) { v.pause(); });
      }
    };
  })();

  /* ---------------- reel cards: hover to play, tap on phones ---------------- */
  function play(card) {
    var v = card.querySelector("video");
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
    card.classList.add("is-playing");
  }
  function pause(card) {
    card.querySelector("video").pause();
    card.classList.remove("is-playing");
  }

  var cards = document.querySelectorAll(".reel-card");
  cards.forEach(function (card) {
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "Play video: " + card.querySelector(".tag").textContent);
    if (!noHover) {
      card.addEventListener("mouseenter", function () { play(card); });
      card.addEventListener("mouseleave", function () { pause(card); });
    }
    card.addEventListener("click", function () {
      card.classList.contains("is-playing") ? pause(card) : play(card);
    });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.click(); }
    });
  });

  /* phones: play whichever card is mostly on screen */
  if (noHover && "IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.target.closest(".page[hidden]")) return;
        en.isIntersecting ? play(en.target) : pause(en.target);
      });
    }, { threshold: 0.75 });
    cards.forEach(function (c) { io.observe(c); });
  }

  /* ---------------- work filters ---------------- */
  var chips = document.querySelectorAll(".chip");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.dataset.filter;
      chips.forEach(function (c) { c.classList.toggle("is-on", c === chip); c.setAttribute("aria-pressed", c === chip); });
      document.querySelectorAll('[data-page="work"] [data-cat]').forEach(function (el) {
        var show = f === "all" || el.dataset.cat === f;
        el.hidden = !show;
        if (!show && el.classList.contains("reel-card")) pause(el);
      });
    });
  });

  /* ---------------- quote form (demo only: nothing is sent) ---------------- */
  var form = document.querySelector(".quote-form");
  var success = document.querySelector(".form-success");

  function setError(input, msg) {
    var label = input.closest(".field");
    var old = label.querySelector(".field-error");
    if (old) old.remove();
    input.classList.toggle("is-invalid", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (msg) {
      var el = document.createElement("span");
      el.className = "field-error";
      el.textContent = msg;
      label.appendChild(el);
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = form.elements.name, phone = form.elements.phone;
    var ok = true;
    if (!name.value.trim()) { setError(name, "Add your name so we know who to ask for."); ok = false; } else setError(name);
    if (phone.value.replace(/\D/g, "").length < 10) { setError(phone, "Enter a 10-digit phone number, like 503-555-0123."); ok = false; } else setError(phone);
    if (!ok) { form.querySelector(".is-invalid").focus(); return; }
    form.hidden = true;
    success.hidden = false;
    success.focus();
  });

  document.querySelector("[data-reset-form]").addEventListener("click", function () {
    form.reset();
    success.hidden = true;
    form.hidden = false;
  });

  /* ---------------- start ---------------- */
  show(routeFromHash() || "home");
})();
