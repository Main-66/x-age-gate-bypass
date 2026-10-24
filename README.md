# 🔓 X (Twitter) Server-Side Age-Gate & Tombstone Bypass

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.2-brightgreen.svg)](https://github.com/Main-66/x-age-gate-bypass/raw/main/x-age-gate-bypass.user.js)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-orange.svg)](#privacy--security)

A lightweight, dependency-free userscript that bypasses **server-stripped EU/UK age-restricted posts** and sensitive media tombstones on X (Twitter) **without a VPN or ID upload**.

### 👉 [**Click Here to Install (`x-age-gate-bypass.user.js`)**](https://github.com/Main-66/x-age-gate-bypass/raw/main/x-age-gate-bypass.user.js)
*(Requires [Violentmonkey](https://violentmonkey.github.io/) or Tampermonkey)*

---

## Why Standard Age-Bypass Scripts Fail in the EU & UK

Most X age-bypass userscripts work by hooking `window.fetch` or `XMLHttpRequest` to unwrap client-side GraphQL visibility containers (`TweetWithVisibilityResults`).

However, under **EU Digital Services Act (DSA)** and **UK Online Safety Act** enforcement, X applies **server-side payload stripping**. When X detects an EU/UK IP address on an unverified account, its backend deletes the `tweet` object, text, and media URLs from the GraphQL JSON response before sending it to your browser, returning an empty `TweetTombstone` banner instead. No client-side GraphQL hook can recover data that X's server refused to send.

**How this script solves it:** When it detects a restricted tombstone banner on your timeline or post page, it queries the public, non-EU **FxTwitter API** (`api.fxtwitter.com`) using the Tweet ID and renders the stripped text, photos, videos, GIFs, and quoted posts directly inside your X feed.

---

## Features

* **True Server-Side Bypass (No VPN Required):** Recovers posts stripped at the server level in EU/UK/regulated regions without submitting a selfie or government ID.
* **Click-to-Unlock or Auto-Unlock:** Injects a `🔓 Unlock Tweet via FxTwitter` button inside restricted tombstone banners, or can be toggled to **Auto-Unlock** automatically via your userscript manager menu.
* **Force-Unlock Menu Command:** Includes a `🔓 Force-Unlock Current Post URL` command in the extension popup menu as a manual fallback if X updates its DOM structure.
* **Full Media & Quote Support:** Renders multi-photo grids, native HTML5 video/GIF players, post text, and nested quoted tweets in native X dark-mode styling.

---

## Privacy & Security

* **Zero External Dependencies:** No `@require` or third-party scripts.
* **Zero Credential Access:** Never reads `document.cookie`, `auth_token`, `ct0`, or your X session data.
* **XSS-Hardened DOM Construction:** Uses strict `document.createElement` and `textContent` assignments with zero `innerHTML` calls.
* **Scoped Network Access:** Strictly limited via `@connect api.fxtwitter.com` to fetch public post metadata by ID when triggered.

---

## Firefox / LibreWolf Setup (Violentmonkey)

If you use **Violentmonkey** on a Gecko-based browser (**Firefox, LibreWolf, Floorp, Zen**), X's strict Content Security Policy (CSP) can block userscripts under default settings. Enable the following:

1. Open **Violentmonkey Dashboard -> Settings -> Advanced**.
2. Under `Injection mode: auto`, check:
   * `☑ Synchronous <page> mode`
   * `☑ Alternative <page> mode`
   * `☑ Bypass CSP in Firefox`
3. Hard-refresh X (`Ctrl + Shift + R`).

---

## License

Published under the [MIT License](LICENSE).