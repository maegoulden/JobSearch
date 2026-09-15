# JobSearch Tracker

A self-hosted tool that watches career pages for changes and shows you what's new — so you don't have to keep refreshing company job boards by hand.

## How it works

1. You give it a list of career page URLs to watch.
2. On a schedule (default: every 30 minutes) it fetches each page, strips out scripts/styles, and extracts the visible text.
3. It compares that text against the last snapshot it took. If anything changed, it records a line-level diff.
4. The dashboard shows every monitored page's status (OK / Changed / Error) and a feed of recent changes you can click into to see exactly what was added or removed.

There's no external database — state is stored as JSON files under `data/` (created automatically, gitignored).

## Getting started

```bash
npm install
npm start
```

Then open http://localhost:3000.

Add a career page URL through the dashboard form. Optionally give it a CSS selector (e.g. `#job-listings`) to scope checks to just the job-listing container — this avoids false positives from unrelated page changes like rotating banners or footers. If you leave it blank, the whole `<body>` is checked.

### Pre-populating sites

Instead of adding sites one by one through the UI, copy `config/sites.example.json` to `config/sites.seed.json` and edit it with the career pages you want to track:

```json
[
  { "name": "Acme Corp Careers", "url": "https://www.example.com/careers", "selector": "#job-listings" }
]
```

`config/sites.seed.json` is only read once, to seed `data/sites.json` the first time the app starts with no existing data.

## Configuration

Environment variables (all optional):

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Port the web server listens on |
| `CHECK_CRON_SCHEDULE` | `*/30 * * * *` | Cron expression for how often to check all sites |

## API

The dashboard is a thin client over a small JSON API, useful if you want to script against it:

- `GET /api/sites` — list monitored sites and their status
- `POST /api/sites` — add a site `{ name, url, selector }`
- `PUT /api/sites/:id` — update a site
- `DELETE /api/sites/:id` — stop tracking a site
- `POST /api/sites/:id/check` — check one site immediately
- `POST /api/check-all` — check every site immediately
- `GET /api/history?siteId=&limit=` — recent detected changes, most recent first

## Deploying

This is a plain Node/Express app with no build step, so it runs on any host that can run `npm start` continuously (Railway, Render, Fly.io, a VPS with `pm2`/`systemd`, etc.). Make sure the `data/` directory persists across restarts/deploys (e.g. a mounted volume) so your site list and snapshot history aren't lost.

## Notes and future ideas

- Career pages vary a lot in structure, so the diff is a generic text-line comparison rather than a "new job posting" parser. Using a tight CSS selector for the listings container is the main way to cut noise.
- Not implemented yet, but natural next steps: email/Slack/push notifications on change, per-site check intervals, and ignore-pattern rules for lines that change harmlessly (like dates or view counts).
