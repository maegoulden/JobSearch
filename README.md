# JobSearch Tracker

A self-hosted tool that watches career pages for changes and shows you what's new — so you don't have to keep refreshing company job boards by hand.

## How it works

1. You give it a list of career page URLs to watch.
2. On a schedule (default: every 30 minutes) it fetches each page, strips out scripts/styles, and extracts the visible text.
3. It compares that text against the last snapshot it took. If anything changed, it records a line-level diff.
4. The dashboard shows every monitored page's status (OK / Changed / Error) and a feed of recent changes you can click into to see exactly what was added or removed.
5. If you've configured email (see below), you also get an email the moment a change is detected — no need to keep the dashboard open.

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
| `SMTP_HOST` | — | SMTP server hostname, e.g. `smtp.gmail.com` or `smtp-mail.outlook.com` |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_SECURE` | `false` | Set to `true` for implicit TLS (typically port 465) |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password / app password |
| `EMAIL_FROM` | `SMTP_USER` | "From" address on notification emails |
| `EMAIL_TO` | — | Where to send change notifications |

### Email notifications

Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_TO` and you'll get an email every time a tracked page changes, with a summary and the diff. Leave them unset and the app works exactly the same, just dashboard-only — the UI shows a banner reminding you notifications aren't configured.

Most providers require an **app password** rather than your normal login password:

- **Gmail**: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587` — create an [app password](https://myaccount.google.com/apppasswords) (requires 2-Step Verification enabled).
- **Outlook / Hotmail**: `SMTP_HOST=smtp-mail.outlook.com`, `SMTP_PORT=587` — create an [app password](https://account.live.com/proofs/AppPassword) if your account has 2-step verification on.
- Any other provider's SMTP + an app password works the same way.

If deploying via the Render blueprint below, it'll prompt you for these values during setup.

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

### One-click deploy to Render

This repo includes a `render.yaml` blueprint, so you can deploy it without touching a terminal:

1. Click **[Deploy to Render](https://render.com/deploy?repo=https://github.com/maegoulden/JobSearch)** and sign in with your GitHub account when prompted.
2. Render reads `render.yaml` and provisions the web service automatically — just confirm and click **Apply**.
3. Once the build finishes (a couple of minutes), Render gives you a public URL for the dashboard.

Caveat: on Render's **free** plan the service spins down after 15 minutes of inactivity and the filesystem is not guaranteed to persist across restarts/redeploys, so your tracked sites and change history can reset from time to time. For reliable long-term tracking, upgrade to a paid instance with a persistent disk, or self-host on your own machine/VPS instead.

## Notes and future ideas

- Career pages vary a lot in structure, so the diff is a generic text-line comparison rather than a "new job posting" parser. Using a tight CSS selector for the listings container is the main way to cut noise.
- Not implemented yet, but natural next steps: Slack/push notifications, per-site check intervals, and ignore-pattern rules for lines that change harmlessly (like dates or view counts).
