(function () {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) root.classList.add("reduce-motion");

  const toggle = document.querySelector("[data-theme-toggle]");
  function current() {
    return root.dataset.theme === "dark" ? "dark" : "light";
  }
  function apply(theme, persist) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    if (persist) localStorage.setItem("onlyscrubs-theme", theme);
    if (persist) localStorage.getItem("onlyscrubs-theme");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#10191c" : "#f3f6f4");
    if (toggle) {
      const dark = theme === "dark";
      toggle.setAttribute("aria-pressed", dark ? "true" : "false");
      toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    }
  }
  apply(current(), false);
  toggle?.addEventListener("click", function () {
    const next = current() === "dark" ? "light" : "dark";
    root.classList.add("theme-anim");
    window.setTimeout(function () { root.classList.remove("theme-anim"); }, 400);
    // Cross-fade the whole page instead of snapping colours (Safari 18+, Chrome). Falls back to an instant swap.
    if (!reduce && typeof document.startViewTransition === "function") {
      document.startViewTransition(function () { apply(next, true); });
    } else {
      apply(next, true);
    }
  });
  if (!localStorage.getItem("onlyscrubs-theme")) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (event) {
      if (!localStorage.getItem("onlyscrubs-theme") && !new URLSearchParams(location.search).get("theme")) {
        apply(event.matches ? "dark" : "light", false);
      }
    });
  }

  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  const navScrim = document.querySelector("[data-nav-scrim]");
  const desktopNav = window.matchMedia("(min-width: 1024px)");

  function navIsDesktop() {
    return desktopNav.matches;
  }

  function navIsOpen() {
    return Boolean(nav && nav.classList.contains("is-open"));
  }

  function firstNavItem() {
    return nav && nav.querySelector(".nav-primary a, .nav-primary button:not([hidden])");
  }

  function navFocusables() {
    if (!nav) return [];
    const items = [];
    if (navToggle) items.push(navToggle);
    nav.querySelectorAll("a, button").forEach(function (el) {
      if (el.hidden) return;
      items.push(el);
    });
    return items;
  }

  function lockPage(lock) {
    const root = document.documentElement;
    if (lock) {
      if (root.classList.contains("nav-locked")) return;
      const gap = window.innerWidth - root.clientWidth;
      root.style.setProperty("--nav-scrollbar-comp", (gap > 0 ? gap : 0) + "px");
      root.dataset.navScrollY = String(window.scrollY);
      root.classList.add("nav-locked");
      document.body.style.top = "-" + window.scrollY + "px";
    } else if (root.classList.contains("nav-locked")) {
      const y = Number(root.dataset.navScrollY || 0);
      root.classList.remove("nav-locked");
      document.body.style.top = "";
      root.style.removeProperty("--nav-scrollbar-comp");
      delete root.dataset.navScrollY;
      window.scrollTo(0, y);
    }
  }

  function setNav(open, opts) {
    if (!nav || !navToggle) return;
    const willOpen = Boolean(open) && !navIsDesktop();
    const already = navIsOpen();
    nav.classList.toggle("is-open", willOpen);
    navToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
    if (navScrim) {
      navScrim.classList.toggle("is-open", willOpen);
      navScrim.setAttribute("aria-hidden", willOpen ? "false" : "true");
    }
    lockPage(willOpen);
    if (willOpen) revealHeader();
    if (willOpen && !already) {
      const first = firstNavItem();
      if (first) first.focus();
    } else if (!willOpen && already && opts && opts.focusToggle) {
      navToggle.focus();
    }
  }

  navToggle?.addEventListener("click", function () {
    setNav(!navIsOpen());
  });
  document.addEventListener("keydown", function (event) {
    if (!navIsOpen() || navIsDesktop()) return;
    if (event.key === "Escape") {
      setNav(false, { focusToggle: true });
      return;
    }
    if (event.key !== "Tab") return;
    const items = navFocusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  // Close the menu when a link is chosen, the scrim is tapped, or the page behind it is tapped.
  document.addEventListener("click", function (event) {
    if (!navIsOpen()) return;
    if (event.target.closest("[data-nav-toggle]")) return;
    if (event.target.closest("[data-nav] a") || event.target.closest("[data-nav-scrim]") || !event.target.closest("[data-nav]")) {
      setNav(false);
    }
  });
  desktopNav.addEventListener("change", function () {
    if (desktopNav.matches) setNav(false);
  });

  const reveals = document.querySelectorAll(".reveal");
  if (reduce || document.documentElement.classList.contains("vt-enter") || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  let configPromise;
  function loadConfig() {
    if (!configPromise) configPromise = fetch("/api/config").then(function (res) { return res.json(); }).catch(function () { return {}; });
    return configPromise;
  }
  window.OnlyScrubs = window.OnlyScrubs || {};
  window.OnlyScrubs.config = loadConfig;
  window.OnlyScrubs.token = function (form) {
    const field = form.querySelector('[name="cf-turnstile-response"]');
    return field ? field.value : "";
  };

  function showSignedIn(on) {
    document.querySelectorAll("[data-admin-logout]").forEach(function (el) { el.hidden = !on; });
  }
  fetch("/api/admin/session").then(function (res) { return res.json(); }).then(function (data) {
    showSignedIn(Boolean(data && data.signedIn));
  }).catch(function () {});

  function usableSupportUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      if (url.protocol !== "https:" && url.protocol !== "http:") return "";
      const host = url.hostname.toLowerCase();
      if (!host || host === "example.com" || host.endsWith(".example") || host === "localhost") return "";
      return url.href;
    } catch (error) {
      return "";
    }
  }
  loadConfig().then(function (cfg) {
    const href = usableSupportUrl(cfg.supportUrl);
    document.querySelectorAll("[data-support-block]").forEach(function (block) { block.hidden = !href; });
    document.querySelectorAll("[data-support-slot]").forEach(function (slot) {
      slot.textContent = "";
      if (!href) {
        slot.hidden = true;
        return;
      }
      const link = document.createElement("a");
      link.className = "button secondary compact";
      link.href = href;
      link.rel = "noopener noreferrer";
      link.textContent = "Buy the next round of coffee";
      slot.appendChild(link);
      slot.hidden = false;
    });
    if (cfg.adsEnabled) {
      document.querySelectorAll("[data-ad-slot]").forEach(function (slot) { slot.hidden = false; });
    }
    if (cfg.turnstileSiteKey && document.querySelector("[data-turnstile]")) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = function () {
        document.querySelectorAll("[data-turnstile]").forEach(function (slot) {
          window.turnstile.render(slot, { sitekey: cfg.turnstileSiteKey });
        });
      };
      document.head.appendChild(script);
    }
  });

  document.querySelectorAll("form[data-newsletter]").forEach(function (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const message = form.querySelector("[data-form-message]");
      message.textContent = "Writing you in…";
      try {
        const res = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: form.email.value,
            consent: Boolean(form.consent && form.consent.checked),
            website: form.website ? form.website.value : "",
            turnstileToken: window.OnlyScrubs.token(form)
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not subscribe.");
        form.reset();
        message.textContent = "You're on the list. OnlyScrubs (hello@onlyscrubs.org) will email you, and every message has an unsubscribe link.";
      } catch (error) {
        message.textContent = error.message;
      }
    });
  });

  document.addEventListener("click", async function (event) {
    const button = event.target.closest("[data-share]");
    if (!button) return;
    const url = button.getAttribute("data-share-url") || location.href.split("?")[0];
    const title = button.getAttribute("data-share-title") || document.title;
    if (navigator.share) {
      try {
        await navigator.share({ title: title, url: url });
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      const previous = button.textContent;
      button.textContent = "Link copied";
      setTimeout(function () { button.textContent = previous; }, 1600);
    } catch (error) {
      button.textContent = "Copy failed";
    }
  });

  const guideFilters = document.querySelector("[data-guide-filters]");
  if (guideFilters) {
    const cards = Array.from(document.querySelectorAll("[data-guide-card]"));
    let active = new URLSearchParams(location.search).get("tag") || "";
    function draw() {
      guideFilters.querySelectorAll("[data-tag]").forEach(function (button) {
        const on = (button.dataset.tag || "") === active;
        button.classList.toggle("is-active", on);
        button.setAttribute("aria-pressed", on ? "true" : "false");
      });
      cards.forEach(function (card) {
        const tags = (card.dataset.tags || "").split(",");
        card.hidden = Boolean(active) && tags.indexOf(active) === -1;
      });
      if (cards[0] && drawn) cards[0].parentElement.classList.add("is-filtered");
      drawn = true;
    }
    let drawn = false;
    guideFilters.addEventListener("click", function (event) {
      const button = event.target.closest("[data-tag]");
      if (!button) return;
      active = button.dataset.tag || "";
      const url = new URL(location.href);
      if (active) url.searchParams.set("tag", active);
      else url.searchParams.delete("tag");
      history.replaceState(null, "", url);
      draw();
    });
    draw();
  }

  function runningStandalone() {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches;
    return standalone || window.navigator.standalone === true;
  }
  function installCopy() {
    const ua = navigator.userAgent || "";
    const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (iOS) {
      return {
        intro: "Safari on iPhone and iPad does not show an install prompt. Add OnlyScrubs from the share menu instead.",
        steps: [
          "Tap the Share button in the toolbar. It is a square with an arrow pointing up.",
          "Scroll the share sheet and tap Add to Home Screen.",
          "Tap Add. OnlyScrubs then opens from the home screen."
        ]
      };
    }
    if (/Android/i.test(ua)) {
      return {
        intro: "If this browser did not ask to install OnlyScrubs, use the menu.",
        steps: [
          "Open the browser menu, usually the three dots.",
          "Tap Install app or Add to Home screen.",
          "Confirm. The icon is added to your home screen."
        ]
      };
    }
    return {
      intro: "If you do not see an install prompt, use the browser menu.",
      steps: [
        "Open the browser menu.",
        "Choose Install OnlyScrubs, or use the install icon in the address bar.",
        "Confirm. The site then opens in its own window."
      ]
    };
  }
  function esc(value) {
    return String(value).replace(/[&<>]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char];
    });
  }
  const installButton = document.querySelector("[data-install]");
  const installSheet = document.querySelector("[data-install-sheet]");
  if (runningStandalone() && installButton) installButton.hidden = true;
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredPrompt = event;
    if (installButton && !runningStandalone()) installButton.hidden = false;
  });
  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    if (installButton) installButton.hidden = true;
    if (installSheet && installSheet.open && installSheet.close) installSheet.close();
  });
  function openInstallSheet() {
    if (!installSheet) return;
    const copy = installCopy();
    const intro = installSheet.querySelector("[data-install-intro]");
    const list = installSheet.querySelector("[data-install-steps]");
    if (intro) intro.textContent = copy.intro;
    if (list) list.innerHTML = copy.steps.map(function (step) { return "<li>" + esc(step) + "</li>"; }).join("");
    if (typeof installSheet.showModal === "function") installSheet.showModal();
    else installSheet.hidden = false;
  }
  installButton?.addEventListener("click", async function () {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (choice && choice.outcome === "accepted") installButton.hidden = true;
        return;
      } catch (error) {
        deferredPrompt = null;
      }
    }
    openInstallSheet();
  });
  // Close with a short exit animation so the sheet never just vanishes.
  function closeSheet(sheet) {
    if (!sheet) return;
    if (!sheet.close) { sheet.hidden = true; return; }
    if (!sheet.open || sheet.classList.contains("is-closing")) return;
    if (reduce) { sheet.close(); return; }
    sheet.classList.add("is-closing");
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      sheet.classList.remove("is-closing");
      sheet.close();
    }
    sheet.addEventListener("animationend", finish, { once: true });
    window.setTimeout(finish, 320);
  }
  installSheet?.querySelector("[data-install-close]")?.addEventListener("click", function () {
    closeSheet(installSheet);
  });
  installSheet?.addEventListener("click", function (event) {
    if (event.target === installSheet) closeSheet(installSheet);
  });
  installSheet?.addEventListener("cancel", function (event) {
    event.preventDefault();
    closeSheet(installSheet);
  });
  document.addEventListener("click", async function (event) {
    const button = event.target.closest("[data-admin-logout]");
    if (!button) return;
    button.disabled = true;
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (!res.ok) throw new Error("Could not log out.");
      location.assign("/");
    } catch (error) {
      button.disabled = false;
      button.textContent = "Could not log out";
    }
  });

  const unsub = document.querySelector("[data-unsubscribe]");
  if (unsub) {
    const token = new URLSearchParams(location.search).get("token");
    if (token && unsub.token) unsub.token.value = token;
    unsub.addEventListener("submit", async function (event) {
      event.preventDefault();
      const message = unsub.querySelector("[data-form-message]");
      message.textContent = "Removing…";
      try {
        const res = await fetch("/api/newsletter/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: unsub.token.value })
        });
        const data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || "Could not unsubscribe.");
        message.textContent = "You are unsubscribed. You will not get further notes.";
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }

  const tearoom = document.querySelector("[data-tearoom-line]");
  if (tearoom) {
    const lines = [
      "Cold coffee is still coffee. This is the science.",
      "The roster is a suggestion. The printer is a nemesis.",
      "Full moon, short staff, and the label printer is out of labels.",
      "3am pages are not a personality test.",
      "Handover is a sport. Pens are the equipment.",
      "Paperwork breeds in the dark. Do not feed it.",
      "If you say the Q word, you are doing the paperwork."
    ];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      let index = 0;
      window.setInterval(function () {
        if (document.hidden) return;
        index = (index + 1) % lines.length;
        tearoom.classList.add("is-swapping");
        window.setTimeout(function () {
          tearoom.textContent = lines[index];
          tearoom.classList.remove("is-swapping");
        }, 220);
      }, 8000);
    }
  }


  function isiOS() {
    const ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function normalizeNavPath(path) {
    if (!path) return "";
    let current = String(path).split("?")[0].split("#")[0].trim();
    if (!current.startsWith("/")) current = "/" + current;
    if (current.length > 1 && current.endsWith("/")) current = current.slice(0, -1);
    if (current === "/index.html" || current === "/index") return "/";
    if (current !== "/" && !/\.[a-z0-9]+$/i.test(current)) current += ".html";
    return current;
  }

  function markCurrentNav() {
    if (!nav) return;
    const path = normalizeNavPath(location.pathname);
    nav.querySelectorAll("a[href]").forEach(function (link) {
      const href = normalizeNavPath(link.getAttribute("href"));
      const on = Boolean(href && (href === path || (href === "/guides.html" && path.startsWith("/guides/"))));
      if (on) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }
  markCurrentNav();

  function lightTap() {
    if (reduce || isiOS()) return;
    if (typeof navigator.vibrate === "function") navigator.vibrate(8);
  }

  if (nav) {
    nav.addEventListener("pointerdown", function (event) {
      const item = event.target.closest("a, .nav-logout");
      if (!item || !nav.contains(item)) return;
      item.classList.add("is-pressed");
      lightTap();
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (type) {
      nav.addEventListener(type, function (event) {
        const item = event.target.closest("a, .nav-logout");
        if (item) item.classList.remove("is-pressed");
      });
    });
  }

  // Swipe up (or a flick) dismisses the floating panel. The handle always
  // participates; the rest of the panel only does when it cannot scroll, so
  // an overflowed list still pans normally.
  if (nav) {
    const dismissPx = 72;
    const dismissVel = 0.55;
    let swipe = null;

    function rubber(dy) {
      if (dy >= 0) return dy / (1 + dy / 110);
      return dy;
    }

    function clearSwipeStyles() {
      nav.style.transition = "";
      nav.style.transform = "";
      nav.style.opacity = "";
      nav.style.willChange = "";
    }

    function endSwipe(event) {
      if (!swipe) return;
      const dy = rubber(event.clientY - swipe.startY);
      const dt = Math.max(event.timeStamp - swipe.lastT, 1);
      const vel = (swipe.lastY - event.clientY) / dt;
      const shouldClose = swipe.tracking && (dy < -dismissPx || vel > dismissVel);
      const live = swipe;
      swipe = null;
      if (live.pointerId != null) {
        try { nav.releasePointerCapture(live.pointerId); } catch (error) {}
      }
      nav.querySelectorAll(".is-pressed").forEach(function (el) { el.classList.remove("is-pressed"); });
      if (shouldClose) {
        const exit = reduce ? 1 : 200;
        nav.style.willChange = "transform, opacity";
        nav.style.transition = "transform " + exit + "ms var(--ease-standard), opacity " + exit + "ms var(--ease-standard)";
        nav.style.transform = "translateY(-30%) scale(0.96)";
        nav.style.opacity = "0";
        window.setTimeout(function () {
          clearSwipeStyles();
          setNav(false);
        }, exit + 16);
      } else if (live.tracking) {
        const back = reduce ? 1 : 320;
        nav.style.transition = "transform " + back + "ms var(--ease-sheet), opacity " + back + "ms var(--ease-sheet)";
        nav.style.transform = "none";
        nav.style.opacity = "1";
        const finish = function () {
          clearSwipeStyles();
          nav.removeEventListener("transitionend", finish);
        };
        nav.addEventListener("transitionend", finish);
        window.setTimeout(finish, back + 32);
      } else {
        clearSwipeStyles();
      }
    }

    nav.addEventListener("pointerdown", function (event) {
      if (!navIsOpen() || navIsDesktop() || event.button) return;
      const onHandle = Boolean(event.target.closest("[data-nav-handle]"));
      const scrollable = nav.scrollHeight > nav.clientHeight + 1;
      if (!onHandle && scrollable && nav.scrollTop > 0) return;
      swipe = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastY: event.clientY,
        lastT: event.timeStamp,
        onHandle: onHandle,
        scrollable: scrollable,
        tracking: false
      };
    });

    nav.addEventListener("pointermove", function (event) {
      if (!swipe || event.pointerId !== swipe.pointerId) return;
      const dx = event.clientX - swipe.startX;
      const dy = event.clientY - swipe.startY;
      swipe.lastY = event.clientY;
      swipe.lastT = event.timeStamp;
      if (!swipe.tracking) {
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
        const vertical = Math.abs(dy) > Math.abs(dx);
        const canDismiss = swipe.onHandle || !swipe.scrollable;
        if (!canDismiss || !vertical) {
          swipe = null;
          return;
        }
        swipe.tracking = true;
        try { nav.setPointerCapture(event.pointerId); } catch (error) {}
        nav.style.willChange = "transform, opacity";
        nav.style.transition = "none";
        nav.querySelectorAll(".is-pressed").forEach(function (el) { el.classList.remove("is-pressed"); });
      }
      if (event.cancelable) event.preventDefault();
      const y = rubber(dy);
      const lifted = Math.max(-y, 0);
      nav.style.transform = "translateY(" + y + "px) scale(" + (1 - Math.min(lifted, 160) / 2000) + ")";
      nav.style.opacity = String(1 - Math.min(lifted, 180) / 280);
    }, { passive: false });

    nav.addEventListener("pointerup", endSwipe);
    nav.addEventListener("pointercancel", endSwipe);
  }

  const header = document.querySelector(".site-header");
  const backBtn = document.querySelector("[data-back-to-top]");
  const footer = document.querySelector(".site-footer");
  let lastScrollY = Math.max(0, window.scrollY);
  let headerAway = false;
  let headerTick = false;
  let footerInView = false;

  function maxScrollY() {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollHeight - doc.clientHeight);
  }

  function clampedScrollY() {
    return Math.min(Math.max(window.scrollY, 0), maxScrollY());
  }

  function setHeaderMoving(on) {
    if (!header) return;
    header.classList.toggle("is-moving", on);
    if (!on) header.style.willChange = "";
    else header.style.willChange = "transform";
  }

  function revealHeader() {
    if (!header || !headerAway) return;
    headerAway = false;
    setHeaderMoving(true);
    header.classList.remove("is-away");
    header.addEventListener("transitionend", function done(event) {
      if (event.propertyName && event.propertyName !== "transform") return;
      setHeaderMoving(false);
      header.removeEventListener("transitionend", done);
    });
  }

  function hideHeader() {
    if (!header || headerAway || navIsOpen()) return;
    if (header.contains(document.activeElement)) return;
    headerAway = true;
    setHeaderMoving(true);
    header.classList.add("is-away");
    header.addEventListener("transitionend", function done(event) {
      if (event.propertyName && event.propertyName !== "transform") return;
      setHeaderMoving(false);
      header.removeEventListener("transitionend", done);
    });
  }

  function updateViewportOffset() {
    const vv = window.visualViewport;
    const extra = vv ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop)) : 0;
    document.documentElement.style.setProperty("--vv-bottom", extra + "px");
  }

  function pageIsLong() {
    return document.documentElement.scrollHeight >= window.innerHeight * 2.5;
  }

  function updateBackToTop(y) {
    if (!backBtn) return;
    const show = pageIsLong() && y >= window.innerHeight * 1.5 && !footerInView;
    const shown = backBtn.classList.contains("is-visible");
    if (show === shown) return;
    backBtn.classList.toggle("is-moving", true);
    backBtn.classList.toggle("is-visible", show);
    backBtn.setAttribute("aria-hidden", show ? "false" : "true");
    if (show) backBtn.removeAttribute("tabindex");
    else backBtn.setAttribute("tabindex", "-1");
    window.setTimeout(function () { backBtn.classList.remove("is-moving"); }, 400);
  }

  function onChromeScroll() {
    const y = clampedScrollY();
    const raw = window.scrollY;
    if (raw < 0 || raw > maxScrollY()) {
      lastScrollY = y;
      headerTick = false;
      return;
    }
    if (y < 80 || navIsOpen() || (header && header.contains(document.activeElement))) {
      revealHeader();
    } else if (y > lastScrollY + 10) {
      hideHeader();
    } else if (lastScrollY - y >= 8) {
      revealHeader();
    }
    lastScrollY = y;
    updateBackToTop(y);
    headerTick = false;
  }

  window.addEventListener("scroll", function () {
    if (headerTick) return;
    headerTick = true;
    window.requestAnimationFrame(onChromeScroll);
  }, { passive: true });

  if (header) {
    header.addEventListener("focusin", revealHeader);
  }

  window.addEventListener("pageswap", function () {
    revealHeader();
  });

  updateViewportOffset();
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateViewportOffset, { passive: true });
    window.visualViewport.addEventListener("scroll", updateViewportOffset, { passive: true });
  }

  if (footer && "IntersectionObserver" in window) {
    const footIo = new IntersectionObserver(function (entries) {
      footerInView = entries.some(function (entry) { return entry.isIntersecting; });
      updateBackToTop(clampedScrollY());
    }, { threshold: 0.08 });
    const newsletter = footer.querySelector("[data-newsletter]") || footer;
    footIo.observe(newsletter);
  }

  if (backBtn) {
    backBtn.addEventListener("pointerdown", function () { backBtn.classList.add("is-pressed"); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (type) {
      backBtn.addEventListener(type, function () { backBtn.classList.remove("is-pressed"); });
    });
    backBtn.addEventListener("click", function () {
      const top = { top: 0, left: 0, behavior: reduce ? "auto" : "smooth" };
      window.scrollTo(top);
      function focusTarget() {
        const heading = document.querySelector("main h1");
        const target = heading || document.querySelector(".skip-link");
        if (!target) return;
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
      if (reduce) {
        focusTarget();
        return;
      }
      let waited = 0;
      const tick = function () {
        waited += 1;
        if (window.scrollY <= 1 || waited > 60) focusTarget();
        else window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    });
  }

  onChromeScroll();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  }
})();
