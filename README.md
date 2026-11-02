# 🔓 X (Twitter) Server-Side Age-Gate & Tombstone Bypass

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.0.3-brightgreen.svg)](https://github.com/Main-66/x-age-gate-bypass/raw/main/x-age-gate-bypass.user.js)
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
* **Two Unlock Modes** (toggle from your userscript manager menu):
  * **Default — button below the post:** Injects a `🔓 Unlock Tweet` button at the bottom of the restricted post (below the reply / repost / like / bookmark / share bar). Clicking it fetches and renders the unlocked content in place of the button.
  * **Auto-Unlock — in-place replacement:** Hides the tombstone message, inserts the unlock button where the restricted block was, then auto-fetches and replaces it with the rendered content.
* **Preserves Native Actions:** In both modes, the original post's author header and the reply / repost / like / bookmark / share / menu buttons are never hidden or replaced.
* **Force-Unlock Menu Command:** Adds a `🔓 Force-Unlock Current Post URL` command to the userscript manager menu as a manual fallback if X updates its DOM structure.
* **Full Media & Quote Support:** Renders multi-photo grids, native HTML5 video/GIF players, post text, and nested quoted tweets in native X dark-mode styling.
* **SPA-Aware Scanning:** Re-scans on X's internal navigation (`pushState` / `popstate`), on DOM mutations, and on a 3-second safety interval, so tombstones are detected wherever you scroll.

---

## Privacy & Security

* **Zero External Dependencies:** No `@require` or third-party scripts.
* **Zero Credential Access:** Never reads `document.cookie`, `auth_token`, `ct0`, or your X session data.
* **XSS-Hardened DOM Construction:** Uses strict `document.createElement` and `textContent` assignments with zero `innerHTML` calls.
* **Scoped Network Access:** Strictly limited via `@connect api.fxtwitter.com` to fetch public post metadata by ID when triggered.

---

## Violentmonkey Setup

If you use **Violentmonkey** on a Gecko-based browser (**Firefox, LibreWolf, Floorp, Zen**), X's strict Content Security Policy (CSP) can block userscripts under default settings. If tombstones aren't detected or the unlock button never appears:

1. Open **Violentmonkey Dashboard -> Settings -> Advanced**.
2. Under `Injection mode: auto`, check:
   * `☑ Synchronous <page> mode`
   * `☑ Alternative <page> mode`
   * `☑ Bypass CSP in Firefox`
3. Hard-refresh X (`Ctrl + Shift + R`).

---

## Tampermonkey Setup (Chrome, Edge, Brave, etc.)

If you have Tampermonkey installed but the unlock button never appears, or nothing happens when you click it, make sure the **"Allow User Scripts"** toggle is enabled.

This is required for userscript injection on modern Chrome-based browsers. The extension can show as enabled while this separate permission is turned off.

1. Right-click the **Tampermonkey** icon in your browser toolbar and select **"Manage Extension"**.
   *(Alternatively, go to `chrome://extensions/` and click **Details** on Tampermonkey.)*
2. Find the **"Allow User Scripts"** toggle and turn it **ON**.
3. Reload the X tab and try again.

---

## License

Published under the [MIT License](LICENSE).