# EatTube

![EatTube icon](assets/icon-128.png)

EatTube is a free Chrome/Edge extension that opens a casino-style picker on YouTube and sends you to a recommended video that is 20 to 60 minutes long.

EatTube is not affiliated with YouTube, Google, or Alphabet. It is a local browser extension and does not provide real-money gambling, prizes, or betting.

## Features

- Picks from YouTube recommendations already loaded in the browser.
- Briefly scrolls under the popup while spinning so YouTube can lazy-load more recommendations.
- Filters for videos from 20 minutes up to, but not including, 1 hour.
- Skips Shorts and obvious watched/progress cards.
- Prefers videos with visible `1M+` view counts, then falls back to any valid 20-60 minute candidate.
- Uses no backend, API key, analytics, tracking, or Chrome permissions.

## Privacy

EatTube does not collect, sell, share, or transmit personal data. It reads visible YouTube page content locally to choose a video and uses `sessionStorage` only for temporary per-tab state.

See [PRIVACY.md](./PRIVACY.md).

## Install For Development

1. Open `chrome://extensions` or `edge://extensions`.
2. Turn on Developer mode.
3. Click `Load unpacked`.
4. Select this project folder.
5. Open `https://www.youtube.com/`.

After changing files, click the reload button on the EatTube extension card.

## Test

```powershell
node .\content.js
node --check .\content.js
```

Then reload the unpacked extension and test directly on YouTube.

## License

[MIT](./LICENSE)
