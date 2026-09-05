# Recon — financial reconciliation workspace

A full-stack portfolio application by Travis Vercueil. Import ledger and bank CSVs, identify exact one-to-one matches, investigate exceptions, and record review reasons. All sample information is synthetic. This application does **not** move money or post accounting adjustments.

The interface uses a navy/blue financial workspace with compact tabular typography and white/slate surfaces.

## Why this project

Recon makes correctness visible: financial values use Java `BigDecimal` and database `DECIMAL`, every match stays within an account and currency, ambiguous candidates remain open, and a conflicting duplicate rejects its entire import. An operator review records a reason without pretending the discrepancy has financially disappeared.

## Two demo modes

**Public sandbox:** the deployed frontend uses predefined synthetic cases and saves reviews only in your browser. It supports sample loading/replay, filtering, inspection and review history. Custom CSV uploads require the Java backend. Matching evidence is deterministic, not AI-generated.

**Full local application:** Java 21 / Spring Boot 3.5, JDBC, React 19 / TypeScript / Vite. H2 file persistence is the zero-setup default; Docker Compose provides PostgreSQL 17 with the same schema and application code.

## Quick start

Requirements: Java 21, Node 22+ and npm. Maven is downloaded by the checked-in Maven wrapper on first use.

```sh
npm ci
# Terminal 1
cd backend
./mvnw spring-boot:run
# Terminal 2, repository root
npm run dev
```

Open http://127.0.0.1:5101. Backend listens on loopback port 8101. Local data persists in `backend/data/` and is not committed.

### PostgreSQL and Docker

```sh
docker compose up --build -d
npm ci
npm run dev
```

Stop a running local Java backend first so port 8101 is free. Compose exposes both services only on localhost. PostgreSQL persists in the named `recon-data` volume. `docker compose down` preserves it; `docker compose down -v` deliberately removes demo data. Credentials in Compose are local demonstration credentials only.

### Browser-only sandbox

```sh
VITE_DEMO_MODE=true npm run dev
# Static deploy build:
VITE_DEMO_MODE=true npm run build
```

Vercel: repository root, build `npm run build`, output `dist`, environment `VITE_DEMO_MODE=true`. No backend URL or API key is required. `.env.example` documents the separation. Restart Vite after changing the mode.

## Three-minute walkthrough

1. Select **Load sample data**. Twelve entries appear: six matched entries (three pairs), three ambiguous entries and three unmatched entries.
2. Open **Open**, inspect `B-902`. Its amount is ZAR 8,000 against a ledger expectation of ZAR 8,400. No tolerance or guessed match hides the difference.
3. Record a reason such as “Verified partial payment; follow up on the remaining ZAR 400.” The exception becomes reviewed and the reason appears in history. No adjustment or matching record is created.
4. Inspect `INV-2405`. Two ledger candidates prevent automatic matching to the single bank entry.
5. Replay the sample data: existing identical IDs are skipped. Reload the page to verify reviews persist.
6. In the full local app, upload `fixtures/ledger.csv` again, then change an existing ID's amount and upload it. The conflicting batch is rejected atomically.

## CSV contract

```csv
id,account,currency,amount,reference
L-1001,OPERATING-ZAR,ZAR,12500.00,INV-2401
```

Headers must have exactly that order. Maximum 1,000 rows and 200 KB per import. Supported currencies are ZAR, USD, EUR and GBP, all restricted to two decimal places. Both sources must already use the same account names, reference convention and amount signs. IDs are unique within a source, across imports. Whitespace is trimmed; identity matching is case-sensitive. Quoted CSV fields are supported.

A match requires identical account, currency, decimal amount and reference, plus exactly one candidate on **each** side. Unmatched and ambiguous entries require investigation. Reviewed means acknowledged with a reason, not reconciled. If later data supplies a unique counterpart, matching takes precedence while the historical review remains available.

## Architecture and trade-offs

```text
React workspace → /api (Vite dev proxy) → Spring Boot → JDBC → H2 / PostgreSQL
Public sandbox → predefined cases + browser storage (no API)
```

One service, two tables, one matching implementation. Spring transactions and primary keys make imports/resolutions atomic; racing duplicate writes can return HTTP 409 and must be retried. Reports recompute from persisted entries rather than storing a second derived truth. This small demo uses a straightforward quadratic matching pass suitable for fixture-scale datasets; bulk production workloads would need indexed/grouped matching and pagination. The import limit is per request, not a global retention limit.

Schema creation is idempotent SQL rather than an unused migration framework. Add versioned migrations when the schema first needs to evolve. No AI explanation layer is included because the exact matching evidence is already useful and auditable. No microservices, message broker or authentication scaffolding is included for this loopback-only single-operator demo.

## Verification

```sh
npm ci
npm run build
cd backend
./mvnw -B -ntp test
```

Twelve integration tests exercise decimal/sign correctness, account/currency boundaries, identical/conflicting replays, batch atomicity, ambiguity, partial payments, persisted review semantics, invalid input, quoted CSV matched-entry review prevention, and concurrent replay/review requests. Tests use an isolated H2 database. A real HTTP smoke against Docker PostgreSQL verifies imports, matching, duplicate/conflicting replay, decimal serialization and persisted reviews. Run `python3 scripts/smoke.py` after starting Compose; it uses the twelve synthetic fixture entries and is safe to replay. Restart the API container and rerun it to verify persistence. PostgreSQL smoke coverage is distinct from the H2 integration suite.

## API

- `GET /api/health`, `GET /api/report`, `GET /api/history`
- `POST /api/imports/ledger` or `/api/imports/bank` with `Content-Type: text/csv`
- `POST /api/resolutions` with JSON `{ "source": "bank", "id": "B-902", "reason": "Verified partial payment; follow up on balance." }`

See [SECURITY.md](SECURITY.md) for deployment limitations and [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow. Original implementation; no employer code or customer records. MIT licensed.
