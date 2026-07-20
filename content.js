(function () {
  "use strict";

  const MIN_SECONDS = 20 * 60;
  const MAX_SECONDS = 60 * 60;
  const PREFERRED_VIEWS = 1000000;
  const TARGET_CANDIDATES = 6;
  const MAX_SCROLL_PASSES = 4;
  const OVERLAY_ID = "eattube-roulette";
  const SEEN_KEY = "__eatTubeShown";
  const LOGO_PATH = "assets/eattube-logo.png";
  const CARD_SELECTOR = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-rich-grid-media",
    "yt-lockup-view-model",
    "ytd-video-lockup-view-model"
  ].join(",");
  const DURATION_SELECTOR = [
    "ytd-thumbnail-overlay-time-status-renderer",
    "ytd-thumbnail-overlay-time-status-renderer #text",
    ".badge-shape-wiz__text",
    "[class*='time-status']",
    "[aria-label*='minute' i]",
    "[aria-label*='hour' i]"
  ].join(",");

  function parseDuration(text) {
    const source = String(text || "");
    const colon = source.match(/\b(?:\d+:)?\d{1,2}:\d{2}\b/);
    if (colon) {
      const parts = colon[0].split(":").map(Number);
      if (!parts.some(Number.isNaN)) return parts.reduce((total, part) => total * 60 + part, 0);
    }

    const hours = Number((source.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i) || [0, 0])[1]);
    const minutes = Number((source.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b/i) || [0, 0])[1]);
    const seconds = Number((source.match(/(\d+(?:\.\d+)?)\s*(?:seconds?|secs?)\b/i) || [0, 0])[1]);
    return hours || minutes || seconds ? Math.round(hours * 3600 + minutes * 60 + seconds) : 0;
  }

  function parseViews(text) {
    const match = String(text || "")
      .replace(/,/g, "")
      .match(/(\d+(?:\.\d+)?)\s*([KMB])?\s+views/i);
    if (!match) return 0;

    const value = Number(match[1]);
    const suffix = (match[2] || "").toUpperCase();
    const multiplier = suffix === "B" ? 1000000000 : suffix === "M" ? 1000000 : suffix === "K" ? 1000 : 1;
    return Math.round(value * multiplier);
  }

  function getWatchUrl(href) {
    try {
      const base = typeof location === "undefined" ? "https://www.youtube.com/" : location.href;
      const url = new URL(href, base);
      if (!url.hostname.endsWith("youtube.com") || url.pathname !== "/watch") return null;

      const id = url.searchParams.get("v");
      if (!id) return null;

      url.search = `?v=${encodeURIComponent(id)}`;
      return { id, href: url.href };
    } catch {
      return null;
    }
  }

  function isWatchUrl(href) {
    return Boolean(getWatchUrl(href));
  }

  function assetUrl(path) {
    return typeof chrome !== "undefined" && chrome.runtime?.getURL ? chrome.runtime.getURL(path) : "";
  }

  function isWatched(card) {
    const text = card.textContent || "";
    return /watched|resume watching/i.test(text) ||
      Boolean(card.querySelector("ytd-thumbnail-overlay-resume-playback-renderer, #progress, [aria-label*='watched' i]"));
  }

  function getCard(link) {
    const card = link.closest(CARD_SELECTOR);
    if (card) return card;

    let node = link.parentElement;
    for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
      if (parseDuration(node.textContent) || node.querySelector(DURATION_SELECTOR)) return node;
    }
    return link;
  }

  function getDuration(card, link) {
    const nodes = [link, ...card.querySelectorAll(DURATION_SELECTOR), card];

    for (const node of nodes) {
      const duration = parseDuration(`${node.getAttribute?.("aria-label") || ""} ${node.textContent || ""}`);
      if (duration) return duration;
    }

    return 0;
  }

  function getTitle(card, link) {
    const titleNode = card.querySelector("#video-title, a#video-title, h3 a, yt-formatted-string#video-title");
    const raw = titleNode?.title || titleNode?.textContent || link.title || link.getAttribute("aria-label") || "Mystery meal video";
    return raw.replace(/\s+by\s+.+$/i, "").trim() || "Mystery meal video";
  }

  function thumbnailUrlForId(id) {
    return id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : "";
  }

  function isUsableThumbnail(src) {
    return /^https?:\/\//i.test(src || "") && !/\/(default|empty)\./i.test(src);
  }

  function getThumbnail(card, id) {
    const img = card.querySelector("img");
    const src = img?.currentSrc || img?.src || img?.getAttribute("data-thumb") || img?.getAttribute("data-src") || "";
    return isUsableThumbnail(src) ? src : thumbnailUrlForId(id);
  }

  function getVideoCards(root) {
    const seen = new Set();

    return Array.from(root.querySelectorAll("a[href*='/watch?v=']")).flatMap((link) => {
      const watch = getWatchUrl(link.href || link.getAttribute("href"));
      if (!watch || seen.has(watch.id) || link.href.includes("/shorts/")) return [];

      const card = getCard(link);
      if (isWatched(card)) return [];

      const duration = getDuration(card, link);
      if (duration < MIN_SECONDS || duration >= MAX_SECONDS) return [];

      seen.add(watch.id);
      return [{
        id: watch.id,
        url: watch.href,
        title: getTitle(card, link),
        duration,
        views: parseViews(card.textContent),
        thumbnail: getThumbnail(card, watch.id)
      }];
    });
  }

  function chooseVideo(videos) {
    const preferred = videos.filter((video) => video.views >= PREFERRED_VIEWS);
    const pool = preferred.length ? preferred : videos;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function collectCandidates(status) {
    const originalY = window.scrollY;
    let videos = getVideoCards(document);

    for (let pass = 0; videos.length < TARGET_CANDIDATES && pass < MAX_SCROLL_PASSES; pass += 1) {
      status.textContent = `Finding meal videos${".".repeat((pass % 3) + 1)}`;
      window.scrollBy(0, Math.max(window.innerHeight * 0.85, 600));
      await sleep(450);
      videos = getVideoCards(document);
    }

    window.scrollTo(0, originalY);
    return videos;
  }

  function closeOverlay() {
    document.getElementById(OVERLAY_ID)?.remove();
    document.removeEventListener("keydown", onEscape);
  }

  function onEscape(event) {
    if (event.key === "Escape") closeOverlay();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function renderCandidates(reel, videos, offset) {
    const sample = videos.length ? videos : [{ title: "Ready when you are", thumbnail: "" }];

    reel.innerHTML = Array.from({ length: Math.min(3, sample.length) }, (_, index) => {
      const video = sample[(offset + index) % sample.length];
      const image = video.thumbnail ? `<img src="${escapeHtml(video.thumbnail)}" alt="">` : `<div class="ytmr-empty-thumb"></div>`;
      return `<div class="ytmr-reel-item">${image}<span>${escapeHtml(video.title)}</span></div>`;
    }).join("");
  }

  function wireLogo(overlay) {
    const logo = overlay.querySelector(".ytmr-logo");
    const src = assetUrl(LOGO_PATH);
    if (!src) {
      logo.remove();
      return;
    }

    logo.addEventListener("load", () => { logo.hidden = false; }, { once: true });
    logo.addEventListener("error", () => { logo.remove(); }, { once: true });
    logo.src = src;
  }

  function showOverlay() {
    if (sessionStorage.getItem(SEEN_KEY) || document.getElementById(OVERLAY_ID)) return;
    sessionStorage.setItem(SEEN_KEY, "1");

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div class="ytmr-machine" role="dialog" aria-modal="true" aria-labelledby="ytmr-title">
        <button class="ytmr-x" type="button" aria-label="Close">x</button>
        <img class="ytmr-logo" alt="" hidden>
        <div class="ytmr-sign">EatTube</div>
        <h1 id="ytmr-title">Spin for a 20-60 minute video to eat with</h1>
        <div class="ytmr-reel" aria-live="polite"></div>
        <div class="ytmr-actions">
          <button class="ytmr-spin" type="button">Yes, random video</button>
          <button class="ytmr-decline" type="button">No thanks</button>
        </div>
        <p class="ytmr-status">Picked from recommendations on this YouTube page.</p>
      </div>
    `;

    document.documentElement.append(overlay);
    document.addEventListener("keydown", onEscape);
    wireLogo(overlay);

    const reel = overlay.querySelector(".ytmr-reel");
    const spin = overlay.querySelector(".ytmr-spin");
    const status = overlay.querySelector(".ytmr-status");

    renderCandidates(reel, getVideoCards(document), 0);

    overlay.querySelector(".ytmr-x").addEventListener("click", closeOverlay);
    overlay.querySelector(".ytmr-decline").addEventListener("click", closeOverlay);
    spin.addEventListener("click", async () => {
      spin.disabled = true;
      overlay.classList.add("ytmr-spinning");

      const videos = await collectCandidates(status);
      if (!videos.length) {
        overlay.classList.remove("ytmr-spinning");
        spin.disabled = false;
        status.textContent = "No 20-60 minute recommendations found yet. Scroll YouTube a bit and try again.";
        renderCandidates(reel, [], 0);
        return;
      }

      status.textContent = "Spinning...";

      let tick = 0;
      const timer = setInterval(() => renderCandidates(reel, videos, tick++), 90);

      setTimeout(() => {
        clearInterval(timer);
        const video = chooseVideo(videos);
        renderCandidates(reel, [video], 0);
        status.textContent = "Winner. Loading now...";
        setTimeout(() => {
          location.href = video.url;
        }, 550);
      }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 250 : 1700);
    });
  }

  function waitForVideos() {
    if (!location.hostname.endsWith("youtube.com")) return;

    const started = Date.now();
    const timer = setInterval(() => {
      if (document.querySelector("a[href*='/watch?v=']") || Date.now() - started > 3500) {
        clearInterval(timer);
        showOverlay();
      }
    }, 250);
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function selfTest() {
    assert(parseDuration("25:47") === 1547, "duration minutes");
    assert(parseDuration("1:02:03") === 3723, "duration hours");
    assert(parseDuration("25 minutes, 47 seconds") === 1547, "aria duration minutes");
    assert(parseDuration("1 hour, 2 minutes, 3 seconds") === 3723, "aria duration hours");
    assert(MIN_SECONDS === 1200 && MAX_SECONDS === 3600, "meal-length bounds");
    assert(parseViews("1.2M views") === 1200000, "million views");
    assert(parseViews("999K views") === 999000, "thousand views");
    assert(getWatchUrl("https://www.youtube.com/watch?v=abc&t=1s").href === "https://www.youtube.com/watch?v=abc", "canonical watch url");
    assert(isWatchUrl("https://www.youtube.com/watch?v=abc"), "watch url");
    assert(!isWatchUrl("https://www.youtube.com/shorts/abc"), "shorts url");
    assert(thumbnailUrlForId("abc") === "https://i.ytimg.com/vi/abc/hqdefault.jpg", "thumbnail fallback");
    assert(chooseVideo([{ title: "low", views: 5 }, { title: "high", views: PREFERRED_VIEWS }]).title === "high", "prefers 1M+ views");

    const fakeReel = { innerHTML: "" };
    renderCandidates(fakeReel, [{ title: "a", thumbnail: "" }, { title: "b", thumbnail: "" }], 0);
    assert((fakeReel.innerHTML.match(/ytmr-reel-item/g) || []).length === 2, "reel never repeats a video");
  }

  if (typeof module !== "undefined" && module.exports) {
    selfTest();
    module.exports = { parseDuration, parseViews, getWatchUrl, isWatchUrl, thumbnailUrlForId, chooseVideo };
    return;
  }

  waitForVideos();
})();
