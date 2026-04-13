# Regulatory Register Graph API

Production-oriented MVP for a graph-native crypto regulatory intelligence platform built around real public data only.

## Product architecture

- `apps/web`: Next.js 16, TypeScript, Tailwind 4, Framer Motion, custom canvas graph rendering.
- `services/api`: FastAPI, SQLAlchemy, Alembic scaffold, REST endpoints, ingestion jobs, provenance storage.
- `PostgreSQL`: canonical operational store for entities, records, relationships, snapshots, alerts, audit data.
- `Redis`: reserved for queue/cache expansion and alert dispatch state.
- `Object storage`: local artifact volume by default (`OBJECT_STORAGE_ROOT`), ready to swap for S3-compatible storage.

### Runtime flow

1. Source adapters fetch upstream artifacts.
2. Each artifact is hashed, persisted, and logged in `source_artifacts`.
3. Parsers map rows/entries into canonical tables.
4. Relationships and evidence links are written alongside records.
5. Snapshots and change events are emitted for temporal replay and diffing.
6. REST endpoints expose search, dossier, graph, timeline, evidence, and watchlist flows.
7. The frontend renders only evidence-backed data and hides unsupported modules when sources are absent.

## Schema design

Core tables in `services/api/app/db/models.py`:

- `sources`, `source_artifacts`, `ingestion_runs`
- `entities`, `aliases`, `jurisdictions`, `entity_jurisdictions`
- `domains`, `contracts`, `wallets`, `whitepapers`
- `register_records`, `sanctions_records`, `warning_notices`
- `relationships`, `relationship_evidence`
- `snapshots`, `change_events`
- `users`, `api_keys`, `watchlists`, `alert_rules`, `alert_events`, `audit_logs`

### Relationship model

- Edges are generic and node-type aware.
- Facts remain attached to source-backed records.
- Inferred links are possible through `is_inferred`, `confidence`, `match_reasons_json`, and `matched_fields_json`, but they never overwrite official facts.

### Temporal model

- `snapshots` store normalized payload hashes by source scope.
- `change_events` capture first-seen and changed states.
- `/diff`, `/entity/:id/timeline`, and the dossier timeline read from these tables.

## Source integration plan

### Implemented MVP adapters

- `ESMA MiCA interim register`
  - Pulls the current CSV set directly from ESMA.
  - Stores file hash, artifact metadata, publication date when available, and parsed records.
  - Maps CASPs, ART issuers, EMT issuers, whitepapers, and non-compliant entities.

- `OFAC Sanctions List Service`
  - Pulls official `sdn.xml` and `consolidated.xml`.
  - Tracks publish date from the dataset payload.
  - Extracts aliases, program codes, sanctions entries, and digital currency wallet identifiers where present.

- `CoinGecko`
  - Pulls `coins/list?include_platform=true` into brand and contract mappings.
  - Supports optional detail hydration for homepage, whitepaper, categories, and market metadata.

- `Etherscan V2`
  - On-demand contract hydration via `getsourcecode`.
  - Stores verification state, compiler metadata, proxy metadata, and links contracts back to entity brands.

### Optional next adapters

- FCA warnings and promotions evidence
- OpenSanctions enrichment
- polite website metadata fetcher for official project homepages

## File and folder structure

```text
.
├── apps
│   └── web
│       ├── src/app
│       ├── src/components
│       ├── src/lib
│       └── src/types
├── services
│   └── api
│       ├── alembic
│       └── app
│           ├── api/routes
│           ├── core
│           ├── db
│           ├── ingest/sources
│           ├── matching
│           ├── schemas
│           ├── services
│           └── tests
├── docker-compose.yml
├── package.json
└── .env.example
```

## Backend implementation

- FastAPI app startup:
  - initializes tables
  - bootstraps source catalog
  - optionally provisions a bootstrap admin/API key from env vars
- REST endpoints:
  - `GET /search`
  - `GET /entity/:id`
  - `GET /entity/:id/graph`
  - `GET /entity/:id/timeline`
  - `GET /entity/:id/evidence`
  - `GET /contract/:chain/:address`
  - `GET /domain/:hostname`
  - `GET /wallet/:chain/:address`
  - `GET /jurisdiction/:code`
  - `GET /sources`
  - `GET /diff?from=...&to=...`
  - `POST /watchlists`
  - `POST /alerts/test`
  - `GET /alerts`
  - `GET /watchlists`
  - `GET /health`
  - `GET /metrics`

### Matching logic

- deterministic normalization for names, URLs, and addresses
- fuzzy scoring via RapidFuzz
- alias-aware ranking
- exact domain/address routing for domains, contracts, and wallets

## Frontend implementation

- cinematic landing page with live authority-layer source constellation
- graph-first explorer with:
  - command-style search
  - custom canvas graph
  - zoom, pan, hover emphasis, node selection, shift-drag lasso
  - type filters
  - dossier deep-linking
- dossier page with:
  - provenance-backed profile data
  - evidence vault list
  - mini graph
  - linked surface area
  - temporal rail
- source monitor for artifact freshness and ingestion visibility
- alerts center with authenticated watchlist creation
- docs portal that renders live OpenAPI paths and live response samples only

## Graph visualization implementation

- custom canvas renderer built on `d3-force`
- restrained glow palette by node type
- concentric topology rings and evidence-line styling
- hover labels, selected halos, filtered node types, and lasso multi-select

## Ingestion jobs

CLI entrypoint: `python -m app.cli`

Examples:

```bash
python -m app.cli init-db
python -m app.cli ingest esma_mica
python -m app.cli ingest ofac_sdn
python -m app.cli ingest ofac_consolidated
python -m app.cli ingest coingecko --limit 500
python -m app.cli hydrate-contract ethereum 0xdAC17F958D2ee523a2206206994597C13D831ec7
```

Admin HTTP trigger:

```http
POST /admin/ingest/esma_mica
POST /admin/ingest/ofac_sdn
POST /admin/ingest/ofac_consolidated
POST /admin/ingest/coingecko?limit=500
```

## Deployment setup

`docker-compose.yml` provisions:

- `postgres`
- `redis`
- `api`
- `web`

Object artifacts are mounted into a persistent volume for raw evidence retention.

## Local setup instructions

### 1. Configure environment

Copy `.env.example` into `.env` and set at minimum:

- `DATABASE_URL`
- `REDIS_URL`
- `RRGA_SECRET_KEY`
- `ETHERSCAN_API_KEY` if contract hydration is needed
- `RRGA_BOOTSTRAP_ADMIN_EMAIL`
- `RRGA_BOOTSTRAP_API_KEY`

### 2. Install dependencies

Backend:

```bash
python -m pip install -e services/api[dev]
```

Frontend:

```bash
cd apps/web
npm install
```

Optional root helper:

```bash
npm install
```

### 3. Initialize the database

```bash
python -m app.cli init-db
```

### 4. Run locally

Backend:

```bash
python -m uvicorn app.main:app --reload --app-dir services/api
```

Frontend:

```bash
cd apps/web
npm run dev
```

Or from the repo root after installing root dev deps:

```bash
npm run dev
```

### 5. Ingest real data

```bash
python -m app.cli ingest esma_mica
python -m app.cli ingest ofac_sdn
python -m app.cli ingest ofac_consolidated
python -m app.cli ingest coingecko --limit 500
```

The frontend intentionally stays sparse until at least one real ingestion run succeeds.

## Quality and testing

Current automated coverage includes:

- matcher normalization and scoring
- ESMA helper behavior
- OFAC XML helper behavior

Run:

```bash
python -m pytest services/api/app/tests
```

## Staged roadmap

### Stage 1

- current MVP sources
- graph explorer
- entity dossiers
- evidence vault list
- source monitor
- watchlist creation

### Stage 2

- FCA warnings ingestion
- OpenSanctions enrichment
- automated alert triggering from change events
- historical source replay UI
- CSV/PDF evidence export bundle

### Stage 3

- website metadata fetcher with robots-aware crawl policy
- enterprise auth and RBAC flows
- queue-backed worker orchestration
- pgvector or OpenSearch-powered search expansion
- Neo4j read model for larger graph traversal workloads

## Important operating rules

- No fake data is seeded for production use.
- The UI hides or labels unavailable modules instead of fabricating content.
- Enrichment sources never override official regulator or sanctions records.
