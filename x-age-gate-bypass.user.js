// ==UserScript==
// @name         X (Twitter) Server-Side Age-Gate Bypass (No VPN)
// @namespace    https://github.com/Main-66/x-age-gate-bypass
// @version      2.0.3
// @description  Bypass server-stripped EU/UK age-restricted posts and sensitive tombstones on X (Twitter) without a VPN or ID verification using the public FxTwitter API. Default: unlock button below the tweet. Auto-unlock: replaces the tombstone in place.
// @author       Main-66
// @license      MIT
// @homepageURL  https://github.com/Main-66/x-age-gate-bypass
// @supportURL   https://github.com/Main-66/x-age-gate-bypass/issues
// @downloadURL  https://github.com/Main-66/x-age-gate-bypass/raw/main/x-age-gate-bypass.user.js
// @updateURL    https://github.com/Main-66/x-age-gate-bypass/raw/main/x-age-gate-bypass.user.js
// @match        https://x.com/*
// @match        https://twitter.com/*
// @icon         https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png
// @connect      api.fxtwitter.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-idle
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  const AUTO_UNLOCK_KEY = 'xfx_auto_unlock';
  let autoUnlock = GM_getValue(AUTO_UNLOCK_KEY, false);
  let menuId = null;

  const GATE_REGEX = /age-restricted|verify your age|age verification|adult content|sensitive content|content warning|date of birth|before you view|isn't available|not available in your/i;
  const TWEET_URL_REGEX = /\/status\/(\d+)/;
  const ACTION_LABEL_REGEX = /^(reply|like|repost|retweet|bookmark|share|quote|more|view post|copy link)/i;

  // cell -> { tweetId, el (button or card), tombstone (or null) }
  const cellState = new WeakMap();
  const fetchCache = new Map();

  const log = (...a) => console.log('[X-AgeGate]', ...a);

  // ---------- Fetch ----------
  const fetchFxTweetRaw = (tweetId) =>
    new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: `https://api.fxtwitter.com/status/${tweetId}`,
        headers: { Accept: 'application/json' },
        timeout: 15000,
        onload: (res) => {
          try {
            const data = JSON.parse(res.responseText);
            if (data?.code === 200 && data?.tweet) resolve(data.tweet);
            else reject(new Error(data?.message || 'Post unavailable or private'));
          } catch {
            reject(new Error('Failed to parse API response'));
          }
        },
        onerror: () =>
          reject(new Error('Network request blocked — check @connect and Tampermonkey "Site Access"')),
        ontimeout: () => reject(new Error('Request timed out')),
      });
    });

  const fetchFxTweet = (tweetId) => {
    if (fetchCache.has(tweetId)) return fetchCache.get(tweetId);
    const p = fetchFxTweetRaw(tweetId).finally(() => {
      setTimeout(() => fetchCache.delete(tweetId), 60_000);
    });
    fetchCache.set(tweetId, p);
    return p;
  };

  // ---------- Extract tweet ID ----------
  const extractTweetId = (node) => {
    const cell =
      node.closest('[data-testid="cellInnerDiv"]') ||
      node.closest('article') ||
      node;

    for (const a of cell.querySelectorAll('a[href*="/status/"]')) {
      const m = (a.getAttribute('href') || '').match(TWEET_URL_REGEX);
      if (m) return m[1];
    }
    const urlMatch = location.pathname.match(TWEET_URL_REGEX);
    return urlMatch ? urlMatch[1] : null;
  };

  // ---------- Structural detector (never hide these) ----------
  const hasStructural = (el) => {
    for (const b of el.querySelectorAll('button[aria-label], [role="button"][aria-label]')) {
      if (ACTION_LABEL_REGEX.test(b.getAttribute('aria-label') || '')) return true;
    }
    if (el.querySelector('[data-testid="User-Name"]')) return true;
    if (el.querySelector('[data-testid^="UserAvatar-Container"]')) return true;
    return false;
  };

  const findTombstoneContainer = (cell) => {
    const candidates = [];
    for (const el of cell.querySelectorAll('*')) {
      if (GATE_REGEX.test(el.textContent || '')) candidates.push(el);
    }
    if (candidates.length === 0) return null;

    const deepest = candidates[candidates.length - 1];
    const boundary = cell.closest('article') || cell;
    let el = deepest;

    while (el.parentElement && el.parentElement !== boundary && el.parentElement !== cell) {
      const parent = el.parentElement;
      if (parent === boundary || parent === cell) break;
      if (hasStructural(parent) && !hasStructural(el)) break;
      el = parent;
    }

    if (el === boundary || el === cell) return null;
    return el;
  };

  // ---------- Rendering ----------
  const renderMediaList = (container, mediaList) => {
    if (!Array.isArray(mediaList) || mediaList.length === 0) return;
    const grid = document.createElement('div');
    grid.style.cssText =
      'display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-top:10px;';

    for (const m of mediaList) {
      if (m.type === 'photo') {
        const link = document.createElement('a');
        link.href = m.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const img = document.createElement('img');
        img.src = m.url;
        img.loading = 'lazy';
        img.style.cssText =
          'width:100%;max-height:550px;object-fit:contain;border-radius:10px;background:#000;display:block;';
        link.appendChild(img);
        grid.appendChild(link);
      } else if (m.type === 'video' || m.type === 'gif') {
        const vid = document.createElement('video');
        vid.src = m.url;
        vid.controls = true;
        vid.preload = 'metadata';
        vid.loop = m.type === 'gif';
        vid.style.cssText =
          'width:100%;max-height:550px;border-radius:10px;background:#000;display:block;';
        grid.appendChild(vid);
      }
    }
    if (grid.children.length) container.appendChild(grid);
  };

  const buildTweetCard = (tweet, isQuote = false) => {
    const card = document.createElement('div');
    card.dataset.xAgegate = '1';
    card.dataset.tweetId = String(tweet.id);
    card.style.cssText = isQuote
      ? 'padding:12px;border:1px solid #2f3336;border-radius:10px;background:#000;color:#e7e9ea;margin-top:10px;'
      : 'padding:14px;border:1px solid #1d9bf0;border-radius:12px;background:#16181c;color:#e7e9ea;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;margin:10px 0;';

    const header = document.createElement('div');
    header.style.cssText = 'font-size:13px;color:#71767b;margin-bottom:8px;';

    const authorStrong = document.createElement('strong');
    authorStrong.style.color = '#e7e9ea';
    authorStrong.textContent = `${tweet.author?.name || 'User'} (@${tweet.author?.screen_name || 'unknown'})`;

    header.textContent = isQuote ? '💬 Quoted: ' : '🔓 ';
    header.appendChild(authorStrong);
    card.appendChild(header);

    if (tweet.text) {
      const textEl = document.createElement('div');
      textEl.style.cssText =
        'white-space:pre-wrap;font-size:15px;line-height:1.45;color:#e7e9ea;word-break:break-word;';
      textEl.textContent = tweet.text;
      card.appendChild(textEl);
    }

    renderMediaList(card, tweet.media?.all);
    if (tweet.quote && !isQuote) card.appendChild(buildTweetCard(tweet.quote, true));

    return card;
  };

  // ---------- Unlock ----------
  const unlockTarget = async (btn, tweetId, cell) => {
    if (!btn.isConnected || btn.disabled) return;
    btn.disabled = true;
    btn.textContent = '⏳ Fetching from api.fxtwitter.com…';
    try {
      const tweet = await fetchFxTweet(tweetId);
      const card = buildTweetCard(tweet);
      btn.replaceWith(card);
      const state = cellState.get(cell);
      if (state) state.el = card;
    } catch (err) {
      btn.disabled = false;
      btn.textContent = `❌ ${err.message} — Click to retry`;
    }
  };

  const createUnlockButton = (tweetId, cell) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.xAgegate = '1';
    btn.dataset.tweetId = tweetId;
    btn.textContent = `🔓 Unlock Tweet`;
    btn.style.cssText =
      'display:block;margin:10px auto;padding:8px 16px;border-radius:999px;border:1px solid #1d9bf0;background:#1d9bf0;color:#fff;cursor:pointer;font-weight:700;font-size:13px;z-index:9999;max-width:100%;';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      unlockTarget(btn, tweetId, cell);
    });
    return btn;
  };

  // ---------- Injection (mode-dependent) ----------
  const injectUnlock = (cell, tweetId) => {
    const btn = createUnlockButton(tweetId, cell);

    if (autoUnlock) {
      // AUTO MODE: replace tombstone in place
      const tombstone = findTombstoneContainer(cell);
      if (tombstone && tombstone.parentElement) {
        tombstone.parentElement.insertBefore(btn, tombstone);
        tombstone.style.display = 'none';
      } else {
        cell.appendChild(btn);
      }
      cellState.set(cell, { tweetId, el: btn, tombstone: tombstone || null });
      setTimeout(() => unlockTarget(btn, tweetId, cell), 150);
    } else {
      // DEFAULT MODE: button below the tweet (bottom of cell)
      cell.appendChild(btn);
      cellState.set(cell, { tweetId, el: btn, tombstone: null });
    }
  };

  // ---------- Scanner ----------
  const scanDOM = () => {
    if (document.visibilityState === 'hidden') return;

    const cells = document.querySelectorAll(
      '[data-testid="cellInnerDiv"], [data-testid="primaryColumn"] article, [role="alert"]'
    );

    for (const cell of cells) {
      const inner = cell.closest('[data-testid="cellInnerDiv"]');
      if (inner && inner !== cell) continue;

      const state = cellState.get(cell);
      if (state) {
        if (cell.contains(state.el)) {
          // Still our content — ensure tombstone stays hidden (React re-render guard)
          if (state.tombstone && cell.contains(state.tombstone) && state.tombstone.style.display !== 'none') {
            state.tombstone.style.display = 'none';
          }
          continue;
        }
        // Cell was recycled — clear stale state
        cellState.delete(cell);
      }

      if (!GATE_REGEX.test(cell.textContent || '')) continue;
      const tweetId = extractTweetId(cell);
      if (!tweetId) continue;

      injectUnlock(cell, tweetId);
    }
  };

  // ---------- Menu ----------
  const refreshMenu = () => {
    if (typeof GM_registerMenuCommand === 'undefined') return;
    if (menuId !== null && typeof GM_unregisterMenuCommand !== 'undefined') {
      try { GM_unregisterMenuCommand(menuId); } catch {}
    }
    const modeLabel = autoUnlock ? 'in-place replacement' : 'button below';
    menuId = GM_registerMenuCommand(
      `${autoUnlock ? '✅' : '❌'} Auto-Unlock Tombstones`,
      () => {
        autoUnlock = !autoUnlock;
        GM_setValue(AUTO_UNLOCK_KEY, autoUnlock);
        refreshMenu();
        log('autoUnlock =', autoUnlock, '→ placement:', autoUnlock ? 'in-place' : 'below');
        log('Note: existing posts keep their current placement. New posts use the new mode.');
      }
    );
  };

  const setupMenu = () => {
    if (typeof GM_registerMenuCommand === 'undefined') return;
    refreshMenu();
    GM_registerMenuCommand('🔓 Force-Unlock Current Post URL', async () => {
      const m = location.pathname.match(TWEET_URL_REGEX);
      if (!m) {
        alert('Navigate to a specific post URL (x.com/user/status/12345…) first.');
        return;
      }
      try {
        const tweet = await fetchFxTweet(m[1]);
        const target =
          document.querySelector('[data-testid="primaryColumn"]') || document.body;
        target.prepend(buildTweetCard(tweet));
      } catch (err) {
        alert('FxTwitter could not load this post: ' + err.message);
      }
    });
    GM_registerMenuCommand('🔍 Scan Now', scanDOM);
  };

  // ---------- SPA navigation ----------
  let lastUrl = location.href;
  const onNav = () => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    log('Navigation →', lastUrl);
    setTimeout(scanDOM, 400);
    setTimeout(scanDOM, 1200);
  };

  const hookHistory = () => {
    for (const name of ['pushState', 'replaceState']) {
      const orig = history[name];
      history[name] = function (...args) {
        const ret = orig.apply(this, args);
        onNav();
        return ret;
      };
    }
    window.addEventListener('popstate', onNav);
  };

  // ---------- Init ----------
  const init = () => {
    log('Initializing — mode:', autoUnlock ? 'in-place' : 'below');
    hookHistory();
    setupMenu();

    let timer = null;
    const debouncedScan = () => {
      if (timer) return;
      timer = setTimeout(() => { timer = null; scanDOM(); }, 250);
    };

    new MutationObserver(debouncedScan).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') scanDOM();
    });

    setInterval(scanDOM, 3000);
    scanDOM();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();