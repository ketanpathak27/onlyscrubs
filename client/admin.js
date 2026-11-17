(function () {
  const gate = document.getElementById("admin-gate");
  const app = document.getElementById("admin-app");
  const signIn = document.getElementById("admin-signin");
  if (!gate || !signIn) return;
  const password = document.getElementById("admin-password");
  const signInMessage = document.getElementById("admin-signin-message");
  const kind = document.getElementById("admin-kind");
  const status = document.getElementById("admin-status");
  const message = document.getElementById("admin-message");
  const feed = document.getElementById("admin-feed");
  const stats = document.getElementById("admin-stats");
  const headlines = document.getElementById("admin-headlines");
  const tools = document.getElementById("admin-tools");

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  function showGate(text) {
    app.hidden = true;
    gate.hidden = false;
    if (text) signInMessage.textContent = text;
    document.querySelectorAll("[data-admin-lock], [data-admin-logout]").forEach(function (link) { link.hidden = true; });
  }
  function showApp() {
    gate.hidden = true;
    app.hidden = false;
    document.querySelectorAll("[data-admin-lock], [data-admin-logout]").forEach(function (link) { link.hidden = false; });
  }
  async function read(res) {
    const type = res.headers.get("content-type") || "";
    if (type.includes("text/csv")) return res.text();
    const data = await res.json().catch(function () { return {}; });
    if (res.status === 401) {
      showGate("Sign in again.");
      throw new Error(data.error || "Sign in again.");
    }
    if (!res.ok) throw new Error(data.error || "Request failed.");
    return data;
  }
  function summary(item) {
    return item.text || item.title || item.message || item.email || item.listingTitle || "";
  }
  function actions(itemKind, item) {
    const itemStatus = item.status || "";
    if (itemKind === "relay") return '<button class="button compact" data-action="read" type="button">Mark read</button><button class="button danger compact" data-action="delete" type="button">Delete</button>';
    let html = "";
    if (itemStatus === "pending") html += '<button class="button compact" data-action="approve" type="button">Approve</button><button class="button compact" data-action="reject" type="button">Reject</button>';
    if (item.hiddenAt) html += '<button class="button compact" data-action="approve" type="button">Show again</button>';
    if (itemKind === "confession" && itemStatus === "approved" && !item.hiddenAt) html += '<button class="button secondary compact" data-action="pin-shift" type="button">Pin as shift of the week</button>';
    if (itemKind === "confession" && itemStatus === "approved") html += '<button class="button secondary compact" data-action="archive" type="button">Archive</button>';
    if (itemKind === "confession" && itemStatus === "archived") html += '<button class="button compact" data-action="restore" type="button">Restore</button>';
    html += '<button class="button danger compact" data-action="delete" type="button">Delete</button>';
    return html;
  }
  function render(items) {
    const itemKind = kind.value;
    if (!items.length) {
      feed.innerHTML = '<div class="empty"><p>Nothing in this queue.</p></div>';
      return;
    }
    feed.innerHTML = '<label class="check"><input id="select-all" type="checkbox"><span>Select all</span></label>' + items.map(function (item) {
      const privateBits = [item.contactEmail, item.email, item.toEmail].filter(Boolean).join(" · ");
      const flag = item.flagReason ? '<p class="flag-note"><strong>Flagged for review.</strong> ' + esc(item.flagReason) + "</p>" : "";
      return '<article class="confession admin-card" data-id="' + esc(item.id) + '"><header><input type="checkbox" data-select value="' + esc(item.id) + '" aria-label="Select item"></header>' + flag + '<p>' + esc(summary(item)) + '</p><p class="meta-row">' + esc(item.status || "") + " · " + esc(item.createdAt ? new Date(item.createdAt).toLocaleString("en-AU") : "") + (item.score != null ? " · score " + esc(item.score) : "") + " · reports " + esc(item.reportsCount || 0) + (item.lastReportCategory ? " · " + esc(item.lastReportCategory) : "") + (item.hiddenAt ? " · hidden from public" : "") + (item.lastReportReason ? " · " + esc(item.lastReportReason) : "") + (privateBits ? " · " + esc(privateBits) : "") + '</p><div class="button-row">' + actions(itemKind, item) + "</div></article>";
    }).join("");
  }
  function metric(value, label) {
    return '<article class="metric"><strong>' + esc(value) + "</strong><span>" + esc(label) + "</span></article>";
  }
  async function loadStats() {
    const data = await read(await fetch("/api/admin/stats"));
    const totals = data.totals || {};
    headlines.innerHTML = [
      metric(totals.pendingItems ?? 0, "Pending"),
      metric(totals.approvedToday ?? 0, "Approved today"),
      metric(totals.reports ?? 0, "Reports"),
      metric(totals.newsletter ?? 0, "Newsletter signups")
    ].join("");
    stats.innerHTML = Object.entries(totals).map(function (entry) {
      return metric(entry[1], entry[0].replace(/([A-Z])/g, " $1"));
    }).join("");
  }
  async function load() {
    message.textContent = "Loading…";
    await loadStats();
    const data = await read(await fetch("/api/admin?kind=" + encodeURIComponent(kind.value) + "&status=" + encodeURIComponent(status.value)));
    render(data.items || []);
    message.textContent = (data.items || []).length ? "Loaded." : "Nothing here.";
  }

  signIn.addEventListener("submit", async function (event) {
    event.preventDefault();
    signInMessage.textContent = "Checking…";
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: password.value })
      });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || "Could not sign in.");
      password.value = "";
      signInMessage.textContent = "";
      showApp();
      await load();
    } catch (error) {
      signInMessage.textContent = error.message;
    }
  });

  tools.addEventListener("submit", function (event) {
    event.preventDefault();
    load().catch(function (error) { message.textContent = error.message; });
  });
  kind.addEventListener("change", function () {
    if (kind.value === "relay") status.value = "new";
    else if (status.value === "new" || status.value === "read") status.value = "pending";
  });
  document.getElementById("show-reported")?.addEventListener("click", function () {
    status.value = "reported";
    if (kind.value === "relay") kind.value = "confession";
    load().catch(function (error) { message.textContent = error.message; });
  });
  document.getElementById("show-flagged")?.addEventListener("click", function () {
    status.value = "flagged";
    if (kind.value === "relay") kind.value = "confession";
    load().catch(function (error) { message.textContent = error.message; });
  });
  document.getElementById("unpin-shift")?.addEventListener("click", async function () {
    try {
      await read(await fetch("/api/admin", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "unpin-shift" }) }));
      message.textContent = "Shift of the week unpinned.";
      await load();
    } catch (error) { message.textContent = error.message; }
  });
  async function downloadAdmin(path, filename) {
    const res = await fetch(path);
    if (!res.ok) {
      const data = await res.json().catch(function () { return {}; });
      throw new Error(data.error || "Export failed.");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
  document.getElementById("preview-digest")?.addEventListener("click", async function () {
    try {
      const data = await read(await fetch("/api/admin/digest"));
      document.getElementById("digest-sending").textContent = data.sendingReason || "";
      document.getElementById("digest-subject").textContent = data.subject || "";
      document.getElementById("digest-text").textContent = data.text || "";
      document.getElementById("digest-preview").hidden = false;
      message.textContent = "Digest preview. " + (data.subscriberCount || 0) + " subscribers. Nothing was sent.";
    } catch (error) { message.textContent = error.message; }
  });
  document.getElementById("export-digest")?.addEventListener("click", async function () {
    try {
      await downloadAdmin("/api/admin/digest.html", "onlyscrubs-digest.html");
      message.textContent = "Digest HTML downloaded. Replace {{unsubscribe_url}} with each subscriber's link from the CSV.";
    } catch (error) { message.textContent = error.message; }
  });
  document.getElementById("submit-indexnow")?.addEventListener("click", async function () {
    message.textContent = "Submitting pages to IndexNow…";
    try {
      const data = await read(await fetch("/api/admin/indexnow", { method: "POST" }));
      message.textContent = "Submitted " + data.count + " pages to IndexNow.";
    } catch (error) { message.textContent = error.message; }
  });
  document.getElementById("archive-old")?.addEventListener("click", async function () {
    message.textContent = "Archiving…";
    try {
      const data = await read(await fetch("/api/admin", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "confession", action: "archive-old" }) }));
      message.textContent = "Archived " + data.archived + " old posts.";
      await load();
    } catch (error) { message.textContent = error.message; }
  });
  document.getElementById("export-newsletter")?.addEventListener("click", async function () {
    try {
      const res = await fetch("/api/admin/newsletter.csv");
      if (!res.ok) {
        const data = await res.json().catch(function () { return {}; });
        throw new Error(data.error || "Export failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "onlyscrubs-newsletter.csv";
      link.click();
      URL.revokeObjectURL(url);
      message.textContent = "Subscriber CSV downloaded, with an unsubscribe link for each address.";
    } catch (error) { message.textContent = error.message; }
  });
  document.getElementById("bulk-apply")?.addEventListener("click", async function () {
    const ids = Array.from(feed.querySelectorAll("[data-select]:checked")).map(function (box) { return box.value; });
    const action = document.getElementById("bulk-action").value;
    if (!ids.length) { message.textContent = "Select at least one item."; return; }
    if ((action === "delete" || action === "reject") && !confirm("Apply " + action + " to " + ids.length + " items?")) return;
    try {
      const data = await read(await fetch("/api/admin/bulk", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: kind.value, action: action, ids: ids }) }));
      const failed = (data.results || []).filter(function (item) { return !item.ok; }).length;
      message.textContent = failed ? "Finished with " + failed + " problems." : "Bulk action done.";
      await load();
    } catch (error) { message.textContent = error.message; }
  });
  feed.addEventListener("change", function (event) {
    if (event.target.id !== "select-all") return;
    feed.querySelectorAll("[data-select]").forEach(function (box) { box.checked = event.target.checked; });
  });
  feed.addEventListener("click", async function (event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const card = button.closest("[data-id]");
    if (button.dataset.action === "delete" && !confirm("Delete this item?")) return;
    button.disabled = true;
    try {
      await read(await fetch("/api/admin", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: kind.value, id: card.dataset.id, action: button.dataset.action }) }));
      await load();
    } catch (error) {
      message.textContent = error.message;
      button.disabled = false;
    }
  });

  fetch("/api/admin/session").then(function (res) { return res.json(); }).then(function (data) {
    if (data && data.signedIn) {
      showApp();
      return load();
    }
  }).catch(function () {});
})();
