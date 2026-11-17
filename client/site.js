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
    apply(current() === "dark" ? "light" : "dark", true);
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
  navToggle?.addEventListener("click", function () {
    const open = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && nav?.classList.contains("is-open")) {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.focus();
    }
  });

  const reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
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
    document.querySelectorAll("[data-admin-lock], [data-admin-logout]").forEach(function (el) { el.hidden = !on; });
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
    document.querySelectorAll("[data-support-link]").forEach(function (link) {
      if (href) {
        link.href = href;
        link.hidden = false;
      } else {
        link.removeAttribute("href");
        link.hidden = true;
      }
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
    }
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
  installSheet?.querySelector("[data-install-close]")?.addEventListener("click", function () {
    if (installSheet.close) installSheet.close();
    else installSheet.hidden = true;
  });
  installSheet?.addEventListener("click", function (event) {
    if (event.target === installSheet && installSheet.close) installSheet.close();
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
        index = (index + 1) % lines.length;
        tearoom.textContent = lines[index];
      }, 8000);
    }
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  }
})();
