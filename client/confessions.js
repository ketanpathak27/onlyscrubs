(function () {
  const feed = document.getElementById("confession-feed");
  const form = document.getElementById("confession-form");
  if (!feed) return;
  const status = document.getElementById("feed-status");
  const search = document.getElementById("feed-search");
  const initialQuery = new URLSearchParams(location.search).get("q") || "";
  if (search && initialQuery) search.value = initialQuery;
  let all = [];
  let activeTag = "";

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
  function pop(button) {
    button.classList.remove("is-pop");
    void button.offsetWidth;
    button.classList.add("is-pop");
  }
  function selectedTags() {
    return Array.from(form.querySelectorAll('input[name="tag"]:checked')).map(function (input) { return input.value; });
  }
  function render() {
    const query = (search?.value || "").toLowerCase();
    const sort = document.getElementById("feed-sort")?.value || "new";
    let items = all.filter(function (item) {
      const tags = item.tags || [];
      const matchesQuery = !query || item.text.toLowerCase().includes(query) || tags.some(function (tag) { return tag.includes(query); });
      const matchesTag = !activeTag || tags.includes(activeTag);
      return matchesQuery && matchesTag;
    });
    if (sort === "top") {
      items.sort(function (a, b) {
        return (b.score || 0) + (b.hugs || 0) + (b.sames || 0) - ((a.score || 0) + (a.hugs || 0) + (a.sames || 0));
      });
    } else {
      items.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    }
    const focusId = new URLSearchParams(location.search).get("id");
    if (focusId) items = items.filter(function (item) { return item.id === focusId; });
    document.querySelectorAll("[data-feed-tag]").forEach(function (button) {
      const on = (button.dataset.feedTag || "") === activeTag;
      button.classList.toggle("is-active", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (!items.length) {
      feed.innerHTML = '<div class="empty"><h2>Nothing in this filter.</h2><p>Try another tag, or be the first to send something harmless.</p></div>';
      status.textContent = "No matching confessions.";
      return;
    }
    feed.innerHTML = items.map(function (item) {
      const shareUrl = location.origin + "/confessions.html?id=" + encodeURIComponent(item.id);
      const when = new Date(item.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
      const example = item.example ? '<span class="pill">Example</span>' : "";
      return '<article class="confession" data-id="' + esc(item.id) + '" data-example="' + (item.example ? "1" : "0") + '">' +
        '<div class="meta-row"><span>' + esc(when) + '</span>' + example + '<span>' + esc(item.commentsCount || 0) + ' comments</span></div>' +
        '<p>“' + esc(item.text) + '”</p>' +
        '<div class="tag-row">' + (item.tags || []).map(function (tag) {
          return '<button class="tag-pill" type="button" data-feed-tag="' + esc(tag) + '">#' + esc(tag) + '</button>';
        }).join("") + '</div>' +
        '<div class="post-actions">' +
        '<button class="button compact secondary" type="button" data-rate ' + (item.example ? "disabled" : "") + '>Rate <strong>' + esc(item.score || 0) + '</strong></button>' +
        '<button class="button compact secondary" type="button" data-react="same" ' + (item.example ? "disabled" : "") + '>Same <strong>' + esc(item.sames || 0) + '</strong></button>' +
        '<button class="button compact secondary" type="button" data-react="hug" ' + (item.example ? "disabled" : "") + '>Hug <strong>' + esc(item.hugs || 0) + '</strong></button>' +
        '<button class="button compact secondary" type="button" data-share data-share-url="' + esc(shareUrl) + '" data-share-title="OnlyScrubs confession">Share</button>' +
        '<button class="button compact" type="button" data-report ' + (item.example ? "disabled" : "") + '>Report</button>' +
        '<button class="button compact" type="button" data-comments-toggle>Comments</button>' +
        '</div>' +
        '<div hidden data-thread></div>' +
        '</article>';
    }).join("");
    status.textContent = "Showing " + items.length + (items.length === 1 ? " confession." : " confessions.");
  }

  async function load() {
    try {
      const data = await read(await fetch("/api/confessions"));
      all = data.confessions || [];
      render();
    } catch (error) {
      feed.innerHTML = '<div class="empty"><h2>Could not load the feed.</h2><p>' + esc(error.message) + '</p></div>';
      status.textContent = "Could not load confessions.";
    }
  }

  search?.addEventListener("input", render);
  document.getElementById("feed-sort")?.addEventListener("change", render);
  document.getElementById("feed-tags")?.addEventListener("click", function (event) {
    const button = event.target.closest("[data-feed-tag]");
    if (!button || button.closest("article")) return;
    activeTag = button.dataset.feedTag || "";
    render();
  });

  feed.addEventListener("click", async function (event) {
    const tag = event.target.closest("article [data-feed-tag]");
    if (tag) {
      activeTag = tag.dataset.feedTag || "";
      render();
      return;
    }
    const card = event.target.closest("[data-id]");
    if (!card) return;
    const id = card.dataset.id;
    const example = card.dataset.example === "1";
    const rate = event.target.closest("[data-rate]");
    const react = event.target.closest("[data-react]");
    const report = event.target.closest("[data-report]");
    const comments = event.target.closest("[data-comments-toggle]");
    if (example && (rate || react || report)) return;
    if (rate) {
      rate.disabled = true;
      try {
        const data = await read(await fetch("/api/rate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: id }) }));
        rate.innerHTML = (data.alreadyRated ? "Rated" : "Rated") + " <strong>" + esc(data.score) + "</strong>";
        pop(rate);
        const found = all.find(function (item) { return item.id === id; });
        if (found) found.score = data.score;
      } catch (error) {
        rate.textContent = error.message;
        rate.disabled = false;
      }
    }
    if (react) {
      const kind = react.dataset.react;
      react.disabled = true;
      try {
        const data = await read(await fetch("/api/react", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: id, reaction: kind }) }));
        const count = kind === "hug" ? data.hugs : data.sames;
        react.innerHTML = (kind === "hug" ? "Hug" : "Same") + " <strong>" + esc(count) + "</strong>";
        pop(react);
        const found = all.find(function (item) { return item.id === id; });
        if (found) {
          found.hugs = data.hugs;
          found.sames = data.sames;
        }
      } catch (error) {
        react.textContent = error.message;
        react.disabled = false;
      }
    }
    if (report && !card.querySelector("[data-report-form]")) {
      const box = document.createElement("form");
      box.className = "form";
      box.dataset.reportForm = "1";
          box.innerHTML = '<label>What should moderation look at?<input name="reason" maxlength="220" required></label><button class="button compact" type="submit">Send report</button><p class="form-message"></p>';
      card.appendChild(box);
      box.addEventListener("submit", async function (submitEvent) {
        submitEvent.preventDefault();
        const message = box.querySelector(".form-message");
        try {
          await read(await fetch("/api/report", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: id, reason: box.reason.value })
          }));
          message.textContent = "Reported. It is hidden while moderation reviews it.";
          box.reason.disabled = true;
        } catch (error) {
          message.textContent = error.message;
        }
      });
    }
    if (comments) {
      const thread = card.querySelector("[data-thread]");
      const open = thread.hidden;
      thread.hidden = !open;
      comments.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && !thread.dataset.loaded) {
        thread.innerHTML = '<p class="meta-row">Loading comments…</p>';
        try {
          const data = await read(await fetch("/api/comments?confessionId=" + encodeURIComponent(id)));
          const list = (data.comments || []).map(function (comment) {
            return '<div class="comment"><p>' + esc(comment.text) + '</p><span class="meta-row">' + esc(new Date(comment.createdAt).toLocaleDateString("en-AU")) + '</span></div>';
          }).join("") || '<p class="meta-row">No comments yet.</p>';
          thread.innerHTML = list + (example ? "" : '<form class="form" data-comment-form><label>Comment<textarea minlength="8" maxlength="500" required placeholder="Kind, harmless, and not about a real shift you could be identified from."></textarea></label><p class="disclosure">By posting you agree to the <a href="/terms.html">Terms</a>.</p><div data-turnstile></div><button class="button secondary" type="submit">Submit comment</button><p class="form-message"></p></form>');
          thread.dataset.loaded = "1";
          const widget = thread.querySelector("[data-turnstile]");
          const cfg = await window.OnlyScrubs.config();
          if (widget && cfg.turnstileSiteKey && window.turnstile) window.turnstile.render(widget, { sitekey: cfg.turnstileSiteKey });
        } catch (error) {
          thread.innerHTML = '<p>' + esc(error.message) + '</p>';
        }
      }
    }
  });

  feed.addEventListener("submit", async function (event) {
    const commentForm = event.target.closest("[data-comment-form]");
    if (!commentForm) return;
    event.preventDefault();
    const card = commentForm.closest("[data-id]");
    const message = commentForm.querySelector(".form-message");
    message.textContent = "Submitting…";
    try {
      await read(await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          confessionId: card.dataset.id,
          text: commentForm.querySelector("textarea").value,
          turnstileToken: window.OnlyScrubs.token(commentForm)
        })
      }));
      commentForm.reset();
      message.textContent = "Comment submitted for moderation.";
    } catch (error) {
      message.textContent = error.message;
    }
  });

  form?.addEventListener("submit", async function (event) {
    event.preventDefault();
    const message = document.getElementById("confession-message");
    message.textContent = "Submitting…";
    try {
      await read(await fetch("/api/confessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: document.getElementById("confession-text").value,
          confirm: document.getElementById("confession-confirm").checked,
          website: form.website.value,
          tags: selectedTags(),
          turnstileToken: window.OnlyScrubs.token(form)
        })
      }));
      form.reset();
      message.textContent = "Submitted. It will appear after moderation.";
    } catch (error) {
      message.textContent = error.message;
    }
  });

  load();
})();
