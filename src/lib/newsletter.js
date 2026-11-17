/** Newsletter consent, unsubscribe tokens, and the only outbound email template. */

import { siteConfig } from "../config.js";
import { validEmail } from "./moderation.js";
import { decodeTokenPart, encodeTokenPart, signMessage, verifyMessage } from "./session.js";

export const SENDER_NAME = "OnlyScrubs";
export const SENDER_EMAIL = "hello@onlyscrubs.org";
export const CONSENT_TEXT =
  "I agree to receive occasional emails from OnlyScrubs (hello@onlyscrubs.org). I can unsubscribe at any time.";

const PURPOSE = "newsletter-unsub:v1:";

export function consentGiven(value) {
  return value === true || value === "yes" || value === "on";
}

export async function unsubscribeToken(secret, email) {
  const normalised = String(email || "").trim().toLowerCase();
  const payload = encodeTokenPart(normalised);
  const signature = await signMessage(secret, PURPOSE + normalised);
  return `${payload}.${signature}`;
}

export async function emailFromUnsubscribeToken(secret, token) {
  const value = String(token || "");
  const dot = value.indexOf(".");
  if (!secret || dot <= 0 || dot !== value.lastIndexOf(".")) return "";
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  let email = "";
  try {
    email = decodeTokenPart(payload).trim().toLowerCase();
  } catch {
    return "";
  }
  if (!validEmail(email)) return "";
  if (!(await verifyMessage(secret, PURPOSE + email, signature))) return "";
  return email;
}

export function unsubscribeUrl(token, siteUrl = siteConfig.siteUrl) {
  return `${siteUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

/**
 * The only newsletter email. Sender identification and a one-click unsubscribe
 * link are part of the message, not an optional footer.
 */
export function renderNewsletterEmail({ subject, bodyText, unsubscribeUrl: unsub }) {
  const url = String(unsub || "");
  const copy = String(bodyText || "").trim();
  const mailSubject = subject || "Notes from OnlyScrubs";
  const text = [
    copy,
    "",
    `${SENDER_NAME}`,
    SENDER_EMAIL,
    siteConfig.siteUrl,
    "",
    "You received this because you asked OnlyScrubs to email you.",
    `Unsubscribe: ${url}`
  ].join("\n");
  const html = `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <title>${esc(mailSubject)}</title>
</head>
<body>
  <p>${esc(copy).replace(/\n/g, "<br>")}</p>
  <p><strong>${SENDER_NAME}</strong><br>
  <a href="mailto:${SENDER_EMAIL}">${SENDER_EMAIL}</a><br>
  <a href="${esc(siteConfig.siteUrl)}">onlyscrubs.org</a></p>
  <p>You received this because you asked OnlyScrubs to email you. Sender: ${SENDER_NAME}, ${SENDER_EMAIL}.</p>
  <p><a href="${esc(url)}">Unsubscribe</a></p>
</body>
</html>`;
  return {
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    replyTo: SENDER_EMAIL,
    subject: mailSubject,
    text,
    html,
    headers: {
      "List-Unsubscribe": `<${url}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
    }
  };
}
