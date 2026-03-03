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
- Lets you manually add categories/items, delete anything, reset ticks, and export/import CSV
- **Sign in with a magic link** (no password) to save trips to the cloud and access them from any device
- **My Trips screen** — view, load, and delete all your saved trips
- **Save Trip button** — explicitly save any list to the cloud, including CSV imports

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla HTML/CSS/JS, no framework |
| AI | Anthropic Claude (`claude-haiku-4-5-20251001`) |
| Backend | Cloudflare Worker (AI proxy + rate limiting) |
| Middleware | Cloudflare Pages Functions (`functions/api/`) |
| Auth | Magic link via Resend email, sessions in D1 |
| Storage | `localStorage` (always) + Cloudflare D1 (when signed in) |
| Rate limiting | Cloudflare KV (`RATE_LIMIT_KV`) |
| Hosting | Cloudflare Pages |

---

## Architecture

```
Browser → Pages Function (/api/generate) → Worker (Service Binding) → Anthropic API
Browser → Pages Function (/api/auth/*)   → AUTH_KV (tokens) + D1 (users, sessions) + Resend
Browser → Pages Function (/api/trips/*)  → D1 (trips)
```

The **Cloudflare Worker** (`worker.js`) handles all AI calls. It:
- Only accepts requests via the Service Binding (blocks direct browser requests by Origin header)
- Rate-limits to 3 requests per 2 minutes per IP using KV
- Validates prompt size (max 4000 chars) and enforces a 45-second timeout
- Strips markdown fences from Claude's response and returns clean JSON

The **Pages Functions** under `functions/api/` handle auth and trip storage:
- `auth/request-link` — validates email, stores one-time token in KV (15-min TTL), sends magic link via Resend
- `auth/verify` — validates token, upserts user in D1, creates session in D1, sets HttpOnly cookie, redirects home
- `auth/me` — validates session cookie against D1, returns `{email}`
- `auth/logout` — deletes session from D1, expires cookie
- `trips/index` — GET list of trips / POST create trip
- `trips/[id]` — GET / PUT / DELETE a trip by ID

---

## Auth flow

1. User enters email → `POST /api/auth/request-link` → token stored in `AUTH_KV` → magic link emailed via Resend
2. User clicks link → `GET /api/auth/verify?token=...` → token validated + deleted → user upserted in D1 → session created in D1 → HttpOnly cookie set → redirect to `/?_auth=email`
3. Page loads → `_auth` URL param sets `currentUser` immediately (no server round-trip) → URL cleaned with `history.replaceState`
4. All subsequent requests include the session cookie → validated against D1 sessions table

Sessions are stored in D1 (not KV) for strong consistency — the session is immediately readable after the magic link redirect.

---

## Project structure

```
├── index.html                        # Entire frontend (single-page app, 4 screens)
├── worker.js                         # Cloudflare Worker (AI proxy + rate limiting)
├── schema.sql                        # D1 schema — users, trips, sessions tables
├── dummy.data                        # Sample Vietnam trip data for UI testing
├── functions/
│   ├── _shared/
│   │   └── auth.js                   # Shared helpers: getSession(), unauthorized(), json()
│   └── api/
│       ├── generate.js               # Pages Function — forwards to Worker
│       ├── auth/
│       │   ├── request-link.js       # POST — send magic link email
│       │   ├── verify.js             # GET  — validate token, create session
│       │   ├── me.js                 # GET  — return current user or 401
│       │   └── logout.js             # POST — expire session
│       └── trips/
│           ├── index.js              # GET list / POST create
│           └── [id].js               # GET / PUT / DELETE by id
└── .gitignore
```

---

## Deployment

### 1. Create Cloudflare resources

```bash
# Create the D1 database
wrangler d1 create packing-db

# Create the AUTH_KV namespace (for magic link tokens)
wrangler kv:namespace create AUTH_KV
```

### 2. Run the D1 schema

```bash
wrangler d1 execute packing-db --file=schema.sql
```

### 3. Deploy the Worker

```bash
wrangler deploy worker.js --name your-worker-name
wrangler secret put ANTHROPIC_API_KEY
```

Bind `RATE_LIMIT_KV` in your `wrangler.toml` or via the dashboard.

### 4. Configure the Pages project

**Build command:**
```bash
sed -i "s|%%ENV%%|$(echo $CF_PAGES_BRANCH)|g" index.html
```

**Build output directory:** `/` (root)

**Bindings required** (Pages project settings):

| Type | Name | Value |
|---|---|---|
| Service Binding | `PACKING_WORKER` | Your deployed Worker name |
| D1 Database | `DB` | `packing-db` |
| KV Namespace | `AUTH_KV` | The AUTH_KV namespace created above |
| Secret | `RESEND_API_KEY` | Your Resend API key |
| Environment Variable | `APP_URL` | `https://yourdomain.com` |

---

## Local development

The app has no build step. Open `index.html` directly or serve it statically.

To test the full flow locally with Wrangler:

```bash
wrangler pages dev . --binding DB=packing-db --kv AUTH_KV=<namespace-id>
```

Set local secrets in a `.dev.vars` file:
```
RESEND_API_KEY=re_...
APP_URL=http://localhost:8788
```

The `dummy.data` file contains a complete pre-generated Vietnam trip response — useful for UI testing without hitting the API.

---

## D1 schema

```sql
users    (id, email, created_at)
trips    (id, user_id, dest, created_at, updated_at, data)  -- data is JSON
sessions (id, user_id, email, created_at, expires_at)       -- 30-day TTL
```

---

## Item badges

Each AI-generated item can carry one badge:

| Badge | Meaning |
|---|---|
| `key` | Essential item, don't forget it |
| `buy` | Purchase before you travel |
| `local` | Buy at the destination |
| `hire` | Rent locally, don't pack it (weight = 0) |

---

## Rate limits

- 3 AI generation requests per IP per 2 minutes
- Enforced at the Worker layer via Cloudflare KV
- Prompt capped at 4000 characters
