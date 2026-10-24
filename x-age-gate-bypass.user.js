// ==UserScript==
// @name         X (Twitter) Server-Side Age-Gate (No VPN)
// @namespace    https://github.com/Main-66/x-age-gate-bypass
// @version      1.0.2
// @description  Bypass server-stripped EU/UK age-restricted posts and sensitive tombstones on X (Twitter) without a VPN or ID verification using the public FxTwitter API.
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
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  const AUTO_UNLOCK_KEY = 'xfx_auto_unlock';
  let autoUnlock = localStorage.getItem(AUTO_UNLOCK_KEY) === 'true';
  let menuId = null;

  const processed = new WeakSet();
  const GATE_REGEX = /age-restricted|verify your age|age verification|adult content|sensitive content|content warning|date of birth|before you view|isn't available|not available in your/i;

  const fetchFxTweet = (tweetId) =>
    new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: `https://api.fxtwitter.com/status/${tweetId}`,
        headers: { Accept: 'application/json' },
        onload: (res) => {
          try {
            const data = JSON.parse(res.responseText);
            if (data?.code === 200 && data?.tweet) {
              resolve(data.tweet);
            } else {
              reject(new Error(data?.message || 'Post unavailable or private'));
            }
          } catch (e) {
            reject(new Error('Failed to parse API response'));
          }
        },
        onerror: () => reject(new Error('Network request to api.fxtwitter.com blocked'))
      });
    });

  const extractTweetId = (node) => {
    const cell = node.closest('[data-testid="cellInnerDiv"]') || node.closest('article') || node;
    const links = cell.querySelectorAll('a[href*="/status/"]');
    for (const a of links) {
      const m = a.href.match(/\/status\/(\d+)/);
      if (m) return m[1];
    }
    const urlMatch = location.pathname.match(/\/status\/(\d+)/);
    return urlMatch ? urlMatch[1] : null;
  };

  const renderMediaList = (container, mediaList) => {
    if (!Array.isArray(mediaList) || mediaList.length === 0) return;

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-top:10px;';

    for (const m of mediaList) {
      if (m.type === 'photo') {
        const link = document.createElement('a');
        link.href = m.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const img = document.createElement('img');
        img.src = m.url;
        img.loading = 'lazy';
        img.style.cssText = 'width:100%;max-height:550px;object-fit:contain;border-radius:10px;background:#000;display:block;';
        link.appendChild(img);
        grid.appendChild(link);
      } else if (m.type === 'video' || m.type === 'gif') {
        const vid = document.createElement('video');
        vid.src = m.url;
        vid.controls = true;
        vid.preload = 'metadata';
        vid.loop = m.type === 'gif';
        vid.style.cssText = 'width:100%;max-height:550px;border-radius:10px;background:#000;display:block;';
        grid.appendChild(vid);
      }
    }

    container.appendChild(grid);
  };

  const buildTweetCard = (tweet, isQuote = false) => {
    const card = document.createElement('div');
    card.style.cssText = isQuote
      ? 'padding:12px;border:1px solid #2f3336;border-radius:10px;background:#000;color:#e7e9ea;margin-top:10px;'
      : 'padding:14px;border:1px solid #1d9bf0;border-radius:12px;background:#16181c;color:#e7e9ea;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;margin:10px 0;';

    const header = document.createElement('div');
    header.style.cssText = 'font-size:13px;color:#71767b;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:8px;';

    const authorSpan = document.createElement('span');
    const authorStrong = document.createElement('strong');
    authorStrong.style.color = '#e7e9ea';
    authorStrong.textContent = `${tweet.author?.name || 'User'} (@${tweet.author?.screen_name || 'unknown'})`;
    authorSpan.textContent = isQuote ? '💬 Quoted: ' : '🔓 ';
    authorSpan.appendChild(authorStrong);

    const extLink = document.createElement('a');
    extLink.href = `https://fixupx.com/${tweet.author?.screen_name || 'i'}/status/${tweet.id}`;
    extLink.target = '_blank';
    extLink.rel = 'noopener noreferrer';
    extLink.style.cssText = 'color:#1d9bf0;text-decoration:none;font-weight:600;white-space:nowrap;';
    extLink.textContent = 'FixupX ↗';

    header.appendChild(authorSpan);
    header.appendChild(extLink);
    card.appendChild(header);

    if (tweet.text) {
      const textEl = document.createElement('div');
      textEl.style.cssText = 'white-space:pre-wrap;font-size:15px;line-height:1.45;color:#e7e9ea;word-break:break-word;';
      textEl.textContent = tweet.text;
      card.appendChild(textEl);
    }

    renderMediaList(card, tweet.media?.all);

    if (tweet.quote && !isQuote) {
      card.appendChild(buildTweetCard(tweet.quote, true));
    }

    return card;
  };

  const unlockTarget = async (placeholderEl, tweetId) => {
    placeholderEl.textContent = '⏳ Fetching unstripped payload from api.fxtwitter.com...';
    placeholderEl.disabled = true;
    try {
      const tweet = await fetchFxTweet(tweetId);
      placeholderEl.replaceWith(buildTweetCard(tweet));
    } catch (err) {
      placeholderEl.disabled = false;
      placeholderEl.textContent = `❌ ${err.message} (Click to retry)`;
    }
  };

  const scanDOM = () => {
    const cells = document.querySelectorAll('[data-testid="cellInnerDiv"], [data-testid="primaryColumn"] section, div[role="alert"]');
    for (const cell of cells) {
      if (processed.has(cell)) continue;
      const text = cell.innerText || '';
      if (!GATE_REGEX.test(text)) continue;

      const tweetId = extractTweetId(cell);
      if (!tweetId) continue;

      processed.add(cell);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = `🔓 Unlock Tweet #${tweetId.slice(-5)} via FxTwitter`;
      btn.style.cssText = 'display:block;margin:10px auto;padding:8px 16px;border-radius:999px;border:1px solid #1d9bf0;background:#1d9bf0;color:#fff;cursor:pointer;font-weight:700;font-size:13px;z-index:9999;';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        unlockTarget(btn, tweetId);
      });

      cell.appendChild(btn);

      if (autoUnlock) {
        unlockTarget(btn, tweetId);
      }
    }
  };

  const registerMenu = () => {
    if (typeof GM_registerMenuCommand === 'undefined') return;

    if (menuId !== null && typeof GM_unregisterMenuCommand !== 'undefined') {
      GM_unregisterMenuCommand(menuId);
    }

    menuId = GM_registerMenuCommand(
      `${autoUnlock ? '✅' : '❌'} Auto-Unlock Tombstones`,
      () => {
        autoUnlock = !autoUnlock;
        localStorage.setItem(AUTO_UNLOCK_KEY, String(autoUnlock));
        registerMenu();
      }
    );
  };

  if (typeof GM_registerMenuCommand !== 'undefined') {
    registerMenu();
    GM_registerMenuCommand('🔓 Force-Unlock Current Post URL', async () => {
      const m = location.pathname.match(/\/status\/(\d+)/);
      if (!m) {
        alert('Navigate to a specific post URL (x.com/user/status/12345...) first.');
        return;
      }
      try {
        const tweet = await fetchFxTweet(m[1]);
        const target = document.querySelector('[data-testid="primaryColumn"]') || document.body;
        target.prepend(buildTweetCard(tweet));
      } catch (err) {
        alert('FxTwitter could not load this post: ' + err.message);
      }
    });
  }

  const obs = new MutationObserver(scanDOM);
  obs.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(scanDOM, 2000);
})();