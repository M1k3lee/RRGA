# VOTO Deployment: Vercel + Render + Supabase

This stack is the cleanest low-cost way to run the current codebase:

- **Frontend:** either `Vercel` (convenient) or a **second free Render web service** (avoids Vercel limits)
- `Render` free web service for the FastAPI backend
- `Supabase` Postgres for the database

## Recommended architecture

- `apps/web` deploys to **Vercel** *or* **Render** (`voto-web` in `render.yaml`)
- `services/api` deploys to Render
- `DATABASE_URL` points to your Supabase Postgres connection
- `NEXT_PUBLIC_API_BASE_URL` points to your Render API URL

## Important constraint

The current ingestion pipeline stores raw source artifacts on the local filesystem through `OBJECT_STORAGE_ROOT`.

That means:

- this setup works for testing and demos
- canonical records persist in Supabase
- raw artifact files on free Render are **ephemeral**
- after a Render redeploy, those files can disappear unless you re-run ingestion

If you want durable evidence artifact storage, the next upgrade is moving artifact storage to Supabase Storage or S3-compatible object storage.

## 1. Supabase setup

Create a new Supabase project, then copy a Postgres connection string from the dashboard.

For this app, prefer:

- direct connection, if your network path supports it
- otherwise Supabase **session pooler** on port `5432`

Avoid Supabase transaction pooler for this codebase right now because transaction mode does not support prepared statements cleanly.

## 2. Render setup

Create a new Render Blueprint from this repo, or create a web service manually using:

- `Root Directory`: `services/api`
- `Runtime`: `Python`
- `Build Command`: `pip install -e .`
- `Start Command`: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- `Health Check Path`: `/health`
- `Plan`: `Free`

Environment variables to set on Render:

- `DATABASE_URL`
  - your Supabase Postgres URL
- `RRGA_SECRET_KEY`
  - any long random string
- `PUBLIC_BASE_URL`
  - your Render API URL, for example `https://voto-api.onrender.com`
- `CORS_ORIGINS`
  - your Vercel frontend URL, for example `https://voto.vercel.app`
- `RRGA_ENV`
  - `production`
- `RRGA_BOOTSTRAP_ADMIN_EMAIL`
  - optional but useful
- `RRGA_BOOTSTRAP_ADMIN_NAME`
  - optional but useful
- `RRGA_BOOTSTRAP_API_KEY`
  - recommended for admin and watchlist testing
- `ETHERSCAN_API_KEY`
  - optional
- `COINGECKO_API_KEY`
  - optional
- `OBJECT_STORAGE_ROOT`
  - `/tmp/voto-artifacts`

After the first successful deploy:

1. open `https://your-render-url/health`
2. open `https://your-render-url/docs`
3. confirm the API starts cleanly

You do **not** need to run `init-db` on Render for first boot. The current FastAPI app creates tables and bootstraps source metadata on startup.

## 2a. First ingestion

On the free Render web service, the easiest beginner path is to trigger ingestion from the hosted API docs:

1. open `https://your-render-url/docs`
2. find `POST /admin/ingest/{source_slug}`
3. click `Try it out`
4. add header `x-api-key: YOUR_RRGA_BOOTSTRAP_API_KEY`
5. run these values one by one:
   - `esma_mica`
   - `ofac_sdn`
   - `ofac_consolidated`
   - `coingecko`

If you prefer local commands instead, point your local `.env` at the same hosted Supabase `DATABASE_URL` and run:

```bash
python -m app.cli ingest esma_mica
python -m app.cli ingest ofac_sdn
python -m app.cli ingest ofac_consolidated
python -m app.cli ingest coingecko --limit 500
```

## 3. Vercel setup

Import the repo into Vercel as a monorepo project and set:

- `Root Directory`: `apps/web`
- Framework: `Next.js`

Environment variables on Vercel:

- `NEXT_PUBLIC_API_BASE_URL`
  - your Render API URL, for example `https://voto-api.onrender.com`

After deploy:

1. open the Vercel URL
2. test homepage lookup
3. test `/lookup`
4. confirm the frontend can reach `/sources` on the API

## 3b. Free frontend on Render (skip Vercel)

If Vercel shows **Exceeded free resources** (bandwidth, function time, or other caps), host the Next app on Render instead. The repo root `render.yaml` defines a second service, **`voto-web`**, on the **Node** runtime.

After you sync the Blueprint (or create the service manually from the same settings):

- **Root Directory**: `.` (repository root)
- **Build Command**: `npm ci && npm run build:web`
- **Start Command**: `npm --prefix apps/web run start`
- **Health Check Path**: `/`
- **Plan**: `Free`

Set **`NEXT_PUBLIC_API_BASE_URL`** on `voto-web` to your **API** URL (for example `https://voto-api.onrender.com`), **without** a trailing slash. Render injects this during the build so the client bundle points at the API.

Then on the **API** service, set **`CORS_ORIGINS`** to your **frontend** URL (comma-separated if you use both), for example:

`https://voto-web.onrender.com`

Redeploy the API after changing CORS.

**Tradeoffs (same as the API on free Render):** the web service spins down when idle; the first load after sleep can take tens of seconds. You stay within a single provider’s free tier for both tiers.

**If the browser shows “Not Found” (Render’s plain page, not your Next.js UI):** that almost always means the **hostname does not match your service**. Open the **`voto-web` service in the Render dashboard → Overview** and use the **exact** `https://…onrender.com` URL shown there (Render may change the subdomain if the name was already taken, for example `voto-web-xxxx` instead of `voto-web`). Do not guess the URL from the service display name alone.

**If the deploy failed:** confirm **Root Directory** is the **repository root** (`.`) and the build command is still `npm ci && npm run build:web`, matching `render.yaml`. A wrong root (for example only `apps/web`) combined with that build command will fail because `package-lock.json` lives at the repo root.

**Other free hosts:** you can also point a static or Node host (for example [Cloudflare Pages](https://pages.cloudflare.com/) or [Netlify](https://www.netlify.com/pricing/)) at `apps/web` with the same build/start pattern and `NEXT_PUBLIC_API_BASE_URL`; this repo does not generate those configs automatically.

## 4. First boot checklist

Use this order:

1. create Supabase project
2. deploy API to Render
3. verify `/health`
4. run ingestion jobs
5. deploy the frontend (Vercel **or** Render `voto-web`) with `NEXT_PUBLIC_API_BASE_URL` set to the API URL
6. set `CORS_ORIGINS` on the API to the final **frontend** URL (or comma-separated list if you use more than one)
7. redeploy the API after CORS is correct

## 5. What will work well

- homepage and lookup
- entity dossiers
- graph explorer
- watchlists and alerts test endpoint
- source monitor
- API docs

## 6. What is still a free-tier compromise

- free Render spins down after idle time
- first request after idle can be slow
- raw evidence artifacts are not durable on free Render
- ingestion is better run manually unless you move to a paid worker or external scheduler
