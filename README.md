# EatTube

EatTube is a free Chrome/Edge extension that opens a casino-style picker on YouTube and sends you to a recommended video that is 20 to 60 minutes long.

EatTube is not affiliated with YouTube, Google, or Alphabet. It is a cosmetic local browser extension and does not provide real-money gambling, prizes, or betting.

## Privacy

EatTube has no backend, analytics, tracking, account login, or API key. It reads the YouTube page already loaded in your browser to find candidate videos, then stores only temporary per-tab state in `sessionStorage`.

See [PRIVACY.md](./PRIVACY.md).

## Install For Development

1. Open `chrome://extensions` or `edge://extensions`.
2. Turn on Developer mode.
3. Click `Load unpacked`.
4. Select this project folder.
5. Open `https://www.youtube.com/`.

After changing files, click the reload button on the EatTube extension card.

## How It Picks

- Reads YouTube recommendations already loaded on the page.
- Briefly scrolls under the popup when spinning so YouTube can lazy-load more recommendations.
- Requires a visible duration from 20 minutes up to, but not including, 1 hour.
- Skips Shorts and obvious watched/progress cards.
- Prefers videos with visible view counts of `1M+`.
- Falls back to any valid 20-60 minute video if no `1M+` candidate exists.

## Test

```powershell
node .\content.js
node --check .\content.js
```

Then reload the unpacked extension and test directly on YouTube.
