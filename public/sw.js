/**
 * Iron Keeper Service Worker
 *
 * Caching strategy:
 *   navigate (HTML)  → NetworkFirst  — index.html always fetched fresh
 *   JS/CSS/fonts     → CacheFirst    — safe because Vite hashes filenames
 *   everything else  → NetworkOnly   — Supabase, APIs, etc.
 *
 * Update detection:
 *   On every navigation, if the fresh index.html differs from the cached copy
 *   we notify ALL open clients so they can reload immediately — even ones that
 *   have been running in the background for hours.
 */

const CACHE_NAME = "ik-v3";
const ASSET_RE = /\.(?:js|css|woff2?|ttf|png|jpg|webp|svg|ico)$/;

// ── Install: skip waiting so this SW activates immediately ────────────────────
self.addEventListener("install", () => {
  self.skipWaiting();
});

// ── Activate: wipe old caches AND any cached HTML, claim all tabs ─────────────
// Cached HTML is the #1 cause of "stale PWA" bugs on iOS — a brand-new SW
// must never serve an old index.html from a previous deploy.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
      // NOTE: We intentionally do NOT wipe cached HTML here. The fetch handler
      // does change-detection and replaces stale HTML on the very next
      // navigation, so the cached copy stays available as an offline fallback
      // in the meantime. Wiping it here used to cause an "Offline" flash for
      // returning users immediately after a deploy.
      await self.clients.claim();
    })()
  );
});

// ── Fetch routing ─────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin HTTP requests
  if (!url.protocol.startsWith("http")) return;
  if (url.origin !== self.location.origin) return;

  // Never intercept OAuth, Supabase, or the SW update-check requests
  if (url.pathname.startsWith("/~oauth")) return;

  // ── HTML navigation → NetworkFirst + change detection ──────────────────────
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Note: Safari throws a TypeError if you try to pass { cache: "no-store" }
          // when req.mode === "navigate". Fetching normally will still get the fresh
          // HTML because the browser doesn't heavily cache index.html.
          const networkRes = await fetch(req);
          if (!networkRes.ok) throw new Error("network-error");

          // Read the fresh HTML once; we'll build two Response objects from it
          const freshHtml = await networkRes.text();

          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(req);

          if (cached) {
            const cachedHtml = await cached.text();

            // Compare only the Vite-hashed asset references, not the full HTML.
            // Lovable preview/analytics injects a JWT with a per-request `exp`
            // claim, so raw HTML comparison would flap every navigation and
            // cause infinite "update available" reloads.
            const assetSig = (s) => {
              const m = s.match(/\/assets\/[A-Za-z0-9_-]+\.(?:js|css)/g);
              return m ? m.sort().join("|") : s;
            };

            if (assetSig(freshHtml) !== assetSig(cachedHtml)) {
              // ✅ New version detected — update cache …
              await cache.put(
                req,
                new Response(freshHtml, {
                  status: networkRes.status,
                  statusText: networkRes.statusText,
                  headers: networkRes.headers,
                })
              );

              // … and tell every open client window to reload
              const clients = await self.clients.matchAll({ type: "window" });
              clients.forEach((c) => c.postMessage({ type: "IK_UPDATE_AVAILABLE" }));
            }
          } else {
            // First visit — just cache it
            await cache.put(
              req,
              new Response(freshHtml, {
                status: networkRes.status,
                statusText: networkRes.statusText,
                headers: networkRes.headers,
              })
            );
          }

          // Return the fresh HTML to the browser
          return new Response(freshHtml, {
            status: networkRes.status,
            statusText: networkRes.statusText,
            headers: networkRes.headers,
          });
        } catch {
          // Offline fallback — try cached HTML for this request, then ANY cached
          // HTML (covers the case where the URL changed between deploys), and
          // only as a last resort show the offline message. This prevents the
          // "Offline" screen from flashing during update reloads or transient
          // network blips when we actually have a usable cached shell.
          const cached = await caches.match(req);
          if (cached) return cached;
          try {
            const cache = await caches.open(CACHE_NAME);
            const keys = await cache.keys();
            for (const k of keys) {
              const u = new URL(k.url);
              if (u.pathname === "/" || u.pathname.endsWith(".html")) {
                const fallback = await cache.match(k);
                if (fallback) return fallback;
              }
            }
          } catch {}
          return new Response(
            "<!doctype html><meta charset=utf-8><title>Reconnecting…</title><body style='font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0b0b0c;color:#fafafa'><div style='text-align:center'><p style='opacity:.7'>Reconnecting…</p><script>setTimeout(()=>location.reload(),1500)</script></div></body>",
            { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
      })()
    );
    return;
  }

  // ── Hashed static assets → CacheFirst ────────────────────────────────────
  if (ASSET_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // ── Everything else → NetworkOnly ─────────────────────────────────────────
  // (version.json, manifest.json, API calls, Supabase, etc.)
});

// ── Push notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload = { title: "Iron Keeper", body: "You have a new update", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: { url: payload.url || "/" },
      tag: payload.tag || "ik-default",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});
