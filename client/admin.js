(function () {
  const form = document.getElementById("admin-login");
  if (!form) return;
  const tokenInput = document.getElementById("admin-token");
  const kind = document.getElementById("admin-kind");
  const status = document.getElementById("admin-status");
  const message = document.getElementById("admin-message");
  const feed = document.getElementById("admin-feed");
  const stats = document.getElementById("admin-stats");
  const saved = sessionStorage.getItem("onlyscrubs-admin") || "";
  if (saved) tokenInput.value = saved;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  function headers() {
    return { authorization: "Bearer " + tokenInput.value };
  }
  async function read(res) {
    const type = res.headers.get("content-type") || "";
    if (type.includes("text/csv")) return res.text();
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || "Request failed.");
    return data;
  }
  function summary(item) {
    return item.text || item.title || item.message || item.email || item.listingTitle || "";
  }
  function actions(itemKind, itemStatus) {
    if (itemKind === "relay") return '<button class="button compact" data-action="read" type="button">Mark read</button><button class="button danger compact" data-action="delete" type="button">Delete</button>';
    let html = "";
    if (itemStatus === "pending") html += '<button class="button compact" data-action="approve" type="button">Approve</button><button class="button compact" data-action="reject" type="button">Reject</button>';
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
      return '<article class="confession admin-card" data-id="' + esc(item.id) + '"><header><input type="checkbox" data-select value="' + esc(item.id) + '" aria-label="Select item"></header><p>' + esc(summary(item)) + '</p><p class="meta-row">' + esc(item.status || "") + ' · ' + esc(item.createdAt ? new Date(item.createdAt).toLocaleString("en-AU") : "") + (item.score != null ? " · score " + esc(item.score) : "") + (item.reportsCount ? " · reports " + esc(item.reportsCount) : "") + (item.lastReportReason ? " · " + esc(item.lastReportReason) : "") + (privateBits ? " · " + esc(privateBits) : "") + '</p><div class="button-row">' + actions(itemKind, item.status) + '</div></article>';
    }).join("");
  }
  async function loadStats() {
    const data = await read(await fetch("/api/admin/stats", { headers: headers() }));
    stats.innerHTML = Object.entries(data.totals || {}).map(function (entry) {
      return '<article class="metric"><strong>' + esc(entry[1]) + '</strong><span>' + esc(entry[0].replace(/([A-Z])/g, " $1")) + '</span></article>';
    }).join("");
  }
  async function load() {
    sessionStorage.setItem("onlyscrubs-admin", tokenInput.value);
    message.textContent = "Loading…";
    await loadStats();
    const data = await read(await fetch("/api/admin?kind=" + encodeURIComponent(kind.value) + "&status=" + encodeURIComponent(status.value), { headers: headers() }));
    render(data.items || []);
    message.textContent = (data.items || []).length ? "Loaded." : "Nothing here.";
  }
  kind.addEventListener("change", function () {
    if (kind.value === "relay") status.value = "new";
    else if (status.value === "new" || status.value === "read") status.value = "pending";
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    load().catch(function (error) { message.textContent = error.message; });
  });
  document.getElementById("admin-logout")?.addEventListener("click", function () {
    sessionStorage.removeItem("onlyscrubs-admin");
    tokenInput.value = "";
    feed.innerHTML = "";
    stats.innerHTML = "";
    message.textContent = "Signed out on this device.";
  });
  document.getElementById("archive-old")?.addEventListener("click", async function () {
    message.textContent = "Archiving…";
    try {
      const data = await read(await fetch("/api/admin", { method: "PATCH", headers: { ...headers(), "content-type": "application/json" }, body: JSON.stringify({ kind: "confession", action: "archive-old" }) }));
      message.textContent = "Archived " + data.archived + " old posts.";
      await load();
    } catch (error) { message.textContent = error.message; }
  });
  document.getElementById("export-newsletter")?.addEventListener("click", async function () {
    try {
      const res = await fetch("/api/admin/newsletter.csv", { headers: headers() });
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
      message.textContent = "Newsletter CSV downloaded.";
    } catch (error) { message.textContent = error.message; }
  });
  document.getElementById("bulk-apply")?.addEventListener("click", async function () {
    const ids = Array.from(feed.querySelectorAll("[data-select]:checked")).map(function (box) { return box.value; });
    const action = document.getElementById("bulk-action").value;
    if (!ids.length) { message.textContent = "Select at least one item."; return; }
    if ((action === "delete" || action === "reject") && !confirm("Apply " + action + " to " + ids.length + " items?")) return;
    try {
      const data = await read(await fetch("/api/admin/bulk", { method: "POST", headers: { ...headers(), "content-type": "application/json" }, body: JSON.stringify({ kind: kind.value, action: action, ids: ids }) }));
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
      await read(await fetch("/api/admin", { method: "PATCH", headers: { ...headers(), "content-type": "application/json" }, body: JSON.stringify({ kind: kind.value, id: card.dataset.id, action: button.dataset.action }) }));
      await load();
    } catch (error) {
      message.textContent = error.message;
      button.disabled = false;
    }
  });
})();
