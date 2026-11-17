export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function safeUrl(url) {
  const value = String(url || "").trim();
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes('"') && !value.includes(" ")) return value;
  if (/^https?:\/\/[\w./#?=&%+:~-]+$/i.test(value)) return value;
  return "";
}

function inline(text) {
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  const parts = [];
  let last = 0;
  let match;
  while ((match = pattern.exec(text))) {
    parts.push(esc(text.slice(last, match.index)));
    if (match[1] != null) {
      const href = safeUrl(match[2]);
      parts.push(href
        ? `<a href="${esc(href)}"${href.startsWith("http") ? ' rel="noopener noreferrer"' : ""}>${esc(match[1])}</a>`
        : esc(match[1]));
    } else if (match[3] != null) {
      parts.push(`<strong>${esc(match[3])}</strong>`);
    } else {
      parts.push(`<em>${esc(match[4])}</em>`);
    }
    last = match.index + match[0].length;
  }
  parts.push(esc(text.slice(last)));
  return parts.join("");
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function renderMarkdown(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let list = null;
  let para = [];
  const flushPara = () => {
    if (!para.length) return;
    html.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  const closeList = () => {
    if (!list) return;
    html.push(list === "ol" ? "</ol>" : "</ul>");
    list = null;
  };
  for (const line of lines) {
    if (!line.trim()) {
      flushPara();
      closeList();
      continue;
    }
    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      closeList();
      const level = heading[1].length;
      const text = heading[2].trim();
      html.push(`<h${level} id="${slug(text)}">${inline(text)}</h${level}>`);
      continue;
    }
    if (line.trim() === "---") {
      flushPara();
      closeList();
      html.push("<hr>");
      continue;
    }
    if (line.startsWith("> ")) {
      flushPara();
      closeList();
      html.push(`<blockquote class="callout"><p>${inline(line.slice(2).trim())}</p></blockquote>`);
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+\.\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushPara();
      const type = bullet ? "ul" : "ol";
      if (list !== type) {
        closeList();
        html.push(type === "ol" ? "<ol>" : "<ul>");
        list = type;
      }
      html.push(`<li>${inline((bullet || numbered)[1])}</li>`);
      continue;
    }
    closeList();
    para.push(line.trim());
  }
  flushPara();
  closeList();
  return html.join("\n");
}

export function parseGuide(raw, slugName) {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(String(raw).trim());
  const meta = { slug: slugName };
  const body = match ? match[2].trim() : String(raw).trim();
  if (match) {
    for (const line of match[1].split("\n")) {
      const index = line.indexOf(":");
      if (index === -1) continue;
      meta[line.slice(0, index).trim()] = line.slice(index + 1).trim();
    }
  }
  meta.tags = String(meta.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
  meta.html = renderMarkdown(body);
  meta.words = body.split(/\s+/).filter(Boolean).length;
  meta.minutes = Math.max(1, Math.round(meta.words / 220));
  meta.path = `/guides/${slugName}.html`;
  return meta;
}
