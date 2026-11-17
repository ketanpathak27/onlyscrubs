import { engagementScore, inCurrentWeek } from "./week.js";

export const EMAIL_SENDING_REASON =
  "Sending is off. Cloudflare Email Sending to arbitrary recipients requires the Workers Paid plan. On the free plan, the send_email binding can only reach verified destination addresses in the account, not a subscriber list. Export the HTML and the subscriber CSV and send them with any free mail tool. To turn sending on later: move the Worker to Workers Paid, onboard onlyscrubs.org for Email Sending, add a send_email binding, and keep the per-subscriber unsubscribe link. This build does not send mail.";

const SITE = "https://onlyscrubs.org";

export function unsubscribeLink(token) {
  return `${SITE}/unsubscribe.html?token=${encodeURIComponent(token || "")}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

export function newestGuides(guides, limit = 5) {
  return [...(guides || [])]
    .map((guide, index) => ({ ...guide, index }))
    .sort((a, b) => String(b.updated || b.date || "").localeCompare(String(a.updated || a.date || "")) || b.index - a.index)
    .slice(0, limit);
}

export function topConfessions(confessions, now = new Date(), limit = 5) {
  return [...(confessions || [])]
    .filter((item) => item && item.status === "approved" && inCurrentWeek(item.createdAt, now))
    .sort((a, b) => engagementScore(b) - engagementScore(a) || String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
}

function weekLabel(now) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(now);
}

export function buildDigest({ now = new Date(), confessions = [], guides = [], shift = null, unsubscribeUrl = "{{unsubscribe_url}}" } = {}) {
  const top = topConfessions(confessions, now);
  const fresh = newestGuides(guides);
  const subject = `OnlyScrubs notes · week of ${weekLabel(now)}`;
  const confessionBlocks = top.length
    ? top.map((item) => `“${item.text}”\n${SITE}/confessions.html?id=${encodeURIComponent(item.id)}`)
    : ["No confessions were approved this week."];
  const guideBlocks = fresh.length
    ? fresh.map((guide) => `${guide.title}\n${guide.description || ""}\n${SITE}${guide.path}`)
    : ["No guides are listed yet."];
  const shiftBlock = shift?.text
    ? `Shift of the week\n“${shift.text}”\n${SITE}/confessions.html?id=${encodeURIComponent(shift.id)}`
    : "No shift of the week is pinned.";
  const sender = [
    "OnlyScrubs",
    "An independent Australian project for nurses, midwives, students and healthcare workers.",
    "OnlyScrubs is not affiliated with AHPRA, the NMBA, any union, health service or employer.",
    "hello@onlyscrubs.org",
    SITE,
    "You received this because you asked for occasional notes.",
    `Unsubscribe: ${unsubscribeUrl}`
  ];
  const text = [
    subject,
    "",
    "General information and moderated community notes. Not clinical advice.",
    "",
    shiftBlock,
    "",
    "Top confessions this week",
    ...confessionBlocks,
    "",
    "Newest guides",
    ...guideBlocks,
    "",
    ...sender
  ].join("\n");

  const confessionHtml = top.length
    ? top.map((item) => `<li><p>“${escapeHtml(item.text)}”</p><p><a href="${SITE}/confessions.html?id=${encodeURIComponent(item.id)}">Read on OnlyScrubs</a></p></li>`).join("")
    : "<li>No confessions were approved this week.</li>";
  const guideHtml = fresh.length
    ? fresh.map((guide) => `<li><a href="${SITE}${escapeHtml(guide.path)}">${escapeHtml(guide.title)}</a><p>${escapeHtml(guide.description || "")}</p></li>`).join("")
    : "<li>No guides are listed yet.</li>";
  const shiftHtml = shift?.text
    ? `<h2>Shift of the week</h2><blockquote><p>“${escapeHtml(shift.text)}”</p></blockquote><p><a href="${SITE}/confessions.html?id=${encodeURIComponent(shift.id)}">Open the confession</a></p>`
    : "<h2>Shift of the week</h2><p>No shift of the week is pinned.</p>";
  const html = `<!doctype html>
<html lang="en-AU">
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family:Georgia,serif;color:#142428;line-height:1.5">
  <p style="letter-spacing:.08em;text-transform:uppercase;font-size:12px">OnlyScrubs</p>
  <h1>${escapeHtml(subject)}</h1>
  <p>General information and moderated community notes. Not clinical advice.</p>
  ${shiftHtml}
  <h2>Top confessions this week</h2>
  <ul>${confessionHtml}</ul>
  <h2>Newest guides</h2>
  <ul>${guideHtml}</ul>
  <hr>
  <p><strong>OnlyScrubs</strong><br>An independent Australian project for nurses, midwives, students and healthcare workers.<br>
  OnlyScrubs is not affiliated with AHPRA, the NMBA, any union, health service or employer.<br>
  <a href="mailto:hello@onlyscrubs.org">hello@onlyscrubs.org</a><br>
  <a href="${SITE}">${SITE}</a></p>
  <p>You received this because you asked for occasional notes.</p>
  <p><a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p>
</body>
</html>`;
  return { subject, html, text, top, guides: fresh, shift: shift || null, unsubscribeUrl };
}
