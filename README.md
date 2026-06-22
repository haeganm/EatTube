# EatTube

![EatTube banner](assets/eattube-banner.png)

EatTube is a lightweight Chrome/Edge extension that opens a casino-style picker on YouTube and sends you to a recommended video that is long enough for a meal, but not an all-day soundtrack.

It is intentionally simple: no backend, no account login, no analytics, no API key, and no Chrome permissions.

## What It Does

- Shows an in-page EatTube popup when YouTube opens.
- Picks from YouTube recommendations already loaded in the browser.
- Briefly scrolls under the popup while spinning so YouTube can lazy-load more recommendations.
- Filters for videos from 20 minutes up to, but not including, 1 hour.
- Skips Shorts and obvious watched/progress cards.
- Prefers videos with visible `1M+` view counts, then falls back to any valid 20-60 minute candidate.

## Install For Development

1. Open `chrome://extensions` or `edge://extensions`.
2. Turn on Developer mode.
3. Click `Load unpacked`.
4. Select this project folder.
5. Open `https://www.youtube.com/`.

After changing files, click the reload button on the EatTube extension card.

## Project Notes

EatTube runs entirely as a Manifest V3 content script on YouTube pages. It reads visible page content locally to find candidate videos and stores only temporary per-tab state in `sessionStorage`.

EatTube is not affiliated with YouTube, Google, or Alphabet. It does not provide real-money gambling, betting, prizes, or financial rewards.

## Test

```powershell
node .\content.js
node --check .\content.js
```

Then reload the unpacked extension and test directly on YouTube.

## Privacy And Security

- [Privacy Policy](./PRIVACY.md)
- [Security Policy](./SECURITY.md)

## License

[MIT](./LICENSE)
