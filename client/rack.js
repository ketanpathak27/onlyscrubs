(function () {
  const list = document.getElementById("listing-feed");
  const form = document.getElementById("listing-form");
  if (!list) return;
  const status = document.getElementById("listing-status");
  let all = [];

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  async function read(res) {
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || "Request failed.");
    return data;
  }
  function value(id) { return (document.getElementById(id)?.value || "").toLowerCase(); }
  function render() {
    const type = value("filter-type");
    const state = value("filter-state");
    const condition = value("filter-condition");
    const query = value("filter-query");
    const items = all.filter(function (item) {
      const blob = [item.title, item.description, item.colour, item.size, item.brand, item.suburb].join(" ").toLowerCase();
      return (!type || item.type === type) && (!state || item.state === state) && (!condition || item.condition === condition) && (!query || blob.includes(query));
    });
    if (!all.length) {
      list.innerHTML = '<div class="empty"><h2>The rack is clear.</h2><p>No approved listings yet. If you have clean scrubs to pass on, or you need a size for placement, send a listing. It stays private until it is moderated.</p><a class="button primary" href="#list-form">List scrubs</a></div>';
      status.textContent = "No listings yet.";
      return;
    }
    if (!items.length) {
      list.innerHTML = '<div class="empty"><h2>No listings match those filters.</h2><p>Clear a filter or check another state.</p></div>';
      status.textContent = "No matching listings.";
      return;
    }
    list.innerHTML = items.map(function (item) {
      return '<article class="listing" data-id="' + esc(item.id) + '"><div class="meta-row"><span class="pill">' + esc(item.type) + '</span><span>' + esc(item.condition) + '</span><span>' + esc(item.suburb) + ', ' + esc(item.state) + '</span></div><h3>' + esc(item.title) + '</h3><p>' + esc(item.description).replace(/\n/g, "<br>") + '</p><p class="meta-row">Size ' + esc(item.size) + (item.brand ? ' · ' + esc(item.brand) : '') + ' · ' + esc(item.colour) + '</p><div class="post-actions"><button class="button secondary compact" type="button" data-contact>Send a message</button><button class="button compact" type="button" data-report>Report</button></div><div data-contact-slot></div></article>';
    }).join("");
    status.textContent = "Showing " + items.length + " listing" + (items.length === 1 ? "." : "s.");
  }

  async function load() {
    try {
      const data = await read(await fetch("/api/listings"));
      all = data.listings || [];
      render();
    } catch (error) {
      list.innerHTML = '<div class="empty"><h2>Could not load listings.</h2><p>' + esc(error.message) + '</p></div>';
    }
  }

  ["filter-type", "filter-state", "filter-condition", "filter-query"].forEach(function (id) {
    document.getElementById(id)?.addEventListener("input", render);
    document.getElementById(id)?.addEventListener("change", render);
  });

  list.addEventListener("click", async function (event) {
    const report = event.target.closest("[data-report]");
    if (report) {
      const card = report.closest("[data-id]");
      if (card.querySelector("[data-report-form]")) return;
      const box = document.createElement("form");
      box.className = "form";
      box.dataset.reportForm = "1";
      box.innerHTML = '<label>What should moderation look at?<input name="reason" maxlength="220" required></label><button class="button compact" type="submit">Send report</button><p class="form-message"></p>';
      card.appendChild(box);
      return;
    }
    const button = event.target.closest("[data-contact]");
    if (!button) return;
    const card = button.closest("[data-id]");
    const slot = card.querySelector("[data-contact-slot]");
    if (slot.childElementCount) return;
    slot.innerHTML = '<form class="form" data-relay><p>Your email is sent to moderation, not published on the listing.</p><label>Your name<input name="name" required maxlength="60"></label><label>Your email<input name="email" type="email" required></label><label>Message<textarea name="message" required minlength="12" maxlength="800" placeholder="Size you need, pickup suburb, and whether you can collect this week."></textarea></label><label class="check"><input name="confirm" type="checkbox" required><span>This message does not name a workplace, patient or clinical matter.</span></label><p class="disclosure">By posting you agree to the <a href="/terms.html">Terms</a>.</p><input class="honeypot" name="website" tabindex="-1" autocomplete="off"><div data-turnstile></div><button class="button primary" type="submit">Send via OnlyScrubs</button><p class="form-message"></p></form>';
    const cfg = await window.OnlyScrubs.config();
    const widget = slot.querySelector("[data-turnstile]");
    if (widget && cfg.turnstileSiteKey && window.turnstile) window.turnstile.render(widget, { sitekey: cfg.turnstileSiteKey });
  });

  list.addEventListener("submit", async function (event) {
    const reportForm = event.target.closest("[data-report-form]");
    if (reportForm) {
      event.preventDefault();
      const card = reportForm.closest("[data-id]");
      const message = reportForm.querySelector(".form-message");
      message.textContent = "Sending…";
      try {
        await read(await fetch("/api/report", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: card.dataset.id, kind: "listing", reason: reportForm.reason.value })
        }));
        card.innerHTML = "<p>Reported. This listing is hidden while moderation reviews it.</p>";
      } catch (error) {
        message.textContent = error.message;
      }
      return;
    }
    const relay = event.target.closest("[data-relay]");
    if (!relay) return;
    event.preventDefault();
    const card = relay.closest("[data-id]");
    const message = relay.querySelector(".form-message");
    message.textContent = "Sending…";
    try {
      await read(await fetch("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId: card.dataset.id,
          name: relay.name.value,
          email: relay.email.value,
          message: relay.message.value,
          confirm: relay.confirm.checked,
          website: relay.website.value,
          turnstileToken: window.OnlyScrubs.token(relay)
        })
      }));
      relay.reset();
      message.textContent = "Sent to moderation. If it is suitable, it can be passed on. Your address is not published.";
    } catch (error) {
      message.textContent = error.message;
    }
  });

  form?.addEventListener("submit", async function (event) {
    event.preventDefault();
    const message = document.getElementById("listing-message");
    message.textContent = "Submitting…";
    const payload = {
      type: form.type.value,
      title: form.title.value,
      description: form.description.value,
      size: form.size.value,
      brand: form.brand.value,
      colour: form.colour.value,
      suburb: form.suburb.value,
      state: form.state.value,
      condition: form.condition.value,
      contactName: form.contactName.value,
      contactEmail: form.contactEmail.value,
      confirm: form.confirm.checked,
      website: form.website.value,
      turnstileToken: window.OnlyScrubs.token(form)
    };
    try {
      await read(await fetch("/api/listings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }));
      form.reset();
      message.textContent = "Listing submitted. It appears after moderation, without your email.";
    } catch (error) {
      message.textContent = error.message;
    }
  });

  load();
})();
