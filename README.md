# The Casual Nomad

An AI-powered packing list generator for travellers. Describe your trip, and Claude AI builds a tailored, categorised packing list — with per-item weights, destination-specific tips, and smart badges for what to buy before you go, hire locally, or prioritise.

Site is [live right here](https://thecasualnomad.xyz), give it a try.

---

## What it does

- Accepts trip details: destination, bag/kit, weight limit, dates, duration, activities, and notes
- Sends a structured prompt to Claude AI and returns a categorised packing list in JSON
- Tracks packed items and current weight against your limit (colour-coded status)
- Shows a "Trip Intelligence" panel with destination overview, climate, activities, and cost estimates
- Persists everything to `localStorage` — works offline after the initial generation
- Lets you manually add categories/items, delete anything, reset ticks, and export to CSV

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla HTML/CSS/JS, no framework |
| AI | Anthropic Claude (`claude-haiku-4-5-20251001`) |
| Backend | Cloudflare Worker (API proxy + rate limiting) |
| Middleware | Cloudflare Pages Function (`functions/api/generate.js`) |
| Rate limiting | Cloudflare KV |
| Hosting | Cloudflare Pages |

---

## Architecture

```
Browser → Pages Function (/api/generate) → Worker (via Service Binding) → Anthropic API
```

The **Cloudflare Worker** (`worker.js`) handles all AI calls. It:
- Only accepts requests via the Service Binding (blocks direct browser requests by Origin header)
- Rate-limits to 3 requests per 2 minutes per IP using KV
- Validates prompt size (max 4000 chars) and enforces a 45-second timeout
- Strips markdown fences from Claude's response and returns clean JSON

The **Pages Function** (`functions/api/generate.js`) acts as a thin proxy — it receives POST requests from the frontend and forwards them to the Worker via the `PACKING_WORKER` binding.

---

## Project structure

```
├── index.html               # Entire frontend (single page app)
├── worker.js                # Cloudflare Worker (AI proxy + rate limiting)
├── functions/
│   └── api/
│       └── generate.js      # Pages Function (forwards to Worker)
├── dummy.data               # Sample Vietnam trip data for testing
└── .gitignore
```

---

## Deployment

### Cloudflare Pages

**Build command:**
```bash
sed -i "s|%%ENV%%|$(echo $CF_PAGES_BRANCH)|g" index.html
```

This injects the current branch name into `index.html` at build time (used to flag non-production environments).

**Build output directory:** `/` (root)

### Bindings required

In your **Pages project** settings:

| Type | Name | Value |
|---|---|---|
| Service Binding | `PACKING_WORKER` | Your deployed Worker name |

In your **Worker** settings:

| Type | Name | Value |
|---|---|---|
| Secret | `ANTHROPIC_API_KEY` | Your Anthropic API key |
| KV Namespace | `RATE_LIMIT_KV` | A KV namespace for rate limiting |

### Deploying the Worker

```bash
wrangler deploy worker.js --name your-worker-name
```

Set secrets:
```bash
wrangler secret put ANTHROPIC_API_KEY
```

Bind the KV namespace in your `wrangler.toml` or via the dashboard.

---

## Local development

The app has no build step. Open `index.html` directly or serve it statically.

To test the full AI flow locally, you'll need to run the Worker with Wrangler and update the fetch target in `functions/api/generate.js` accordingly.

The `dummy.data` file contains a complete pre-generated Vietnam trip response — useful for UI testing without hitting the API.

---

## Item badges

Each AI-generated item can carry one badge:

| Badge | Meaning |
|---|---|
| `key` | Essential item, don't forget it |
| `buy` | Purchase before you travel |
| `local` | Buy at the destination |
| `hire` | Rent locally, don't pack it |

---

## Rate limits

- 3 AI generation requests per IP per 2 minutes
- Enforced at the Worker layer via Cloudflare KV
- Prompt capped at 4000 characters
