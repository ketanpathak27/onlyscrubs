<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Moderation | OnlyScrubs</title>
    <meta name="robots" content="noindex">
    <link rel="stylesheet" href="/styles.css?v=4">
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/"><span class="brand-mark">OS</span><span>OnlyScrubs</span></a>
      <nav><a href="/confessions.html">Confessions</a><a href="/submission-rules.html">Rules</a></nav>
    </header>
    <main class="page-content">
      <p class="eyebrow">Private-ish admin</p>
      <h1>Moderation</h1>
      <p>This page uses your Cloudflare <strong>ADMIN_TOKEN</strong>. Keep the token private. Approve only harmless, non-identifying confessions.</p>

      <form class="confession-form" id="admin-login">
        <label for="admin-token">Admin token</label>
        <input id="admin-token" type="password" autocomplete="current-password" required>
        <button class="button primary" type="submit">Load pending posts</button>
        <p class="form-message" id="admin-message" role="status"></p>
      </form>

      <div class="confession-feed" id="admin-feed"></div>
    </main>
    <script src="/admin.js?v=4" defer></script>
  </body>
</html>
