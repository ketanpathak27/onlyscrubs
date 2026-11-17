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

  fetch("/api/admin/session").then(function (res) { return res.json(); }).then(function (data) {
    if (!data || !data.signedIn) return;
    document.querySelectorAll("[data-admin-lock]").forEach(function (link) { link.hidden = false; });
  }).catch(function () {});

  loadConfig().then(function (cfg) {
    document.querySelectorAll("[data-support-link]").forEach(function (link) {
      if (cfg.supportUrl) {
        link.href = cfg.supportUrl;
        link.hidden = false;
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
      message.textContent = "Sending…";
      try {
        const res = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: form.email.value,
            website: form.website ? form.website.value : "",
            turnstileToken: window.OnlyScrubs.token(form)
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not subscribe.");
        form.reset();
        message.textContent = "You are on the list. We only use this address for OnlyScrubs updates.";
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

  const installButton = document.querySelector("[data-install]");
  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredPrompt = event;
    if (installButton) installButton.hidden = false;
  });
  installButton?.addEventListener("click", async function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.hidden = true;
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  }
})();
