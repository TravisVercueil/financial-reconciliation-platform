# Financial reconciliation platform

An operations workspace that matches imported ledger entries against bank transactions and explains unresolved discrepancies.

## Status

Project selected for Travis Vercueil’s portfolio. Initial scope is documented; the full application is not yet built or deployed.

## Demonstration

Import a synthetic batch containing an exact match, a duplicate delivery, a partial payment and an unmatched transaction. Inspect the exceptions and approve a resolution with a recorded reason.

## Proposed implementation

TypeScript matching core initially; PostgreSQL persistence and a React interface in the next slice. AI explanations are an optional, separately evaluated layer.

## Acceptance criteria

- Exact monetary arithmetic; explicit currency and account boundaries.
- Duplicate delivery never creates a second posting; conflicting payloads under the same identity are rejected.
- Ambiguous candidates remain unresolved; no first-match fallback.
- AI cannot post accounting adjustments. Approval records actor, reason and evidence.
- A replay produces the same report; interruptions cannot silently lose imported records.

## Delivery

1. Implement one reproducible vertical slice with synthetic fixtures.
2. Add persistence, a usable review interface and meaningful failure-path tests.
3. Add AI where it improves the workflow, with a non-AI baseline and evaluation results.
4. Deploy an isolated demo and record a short walkthrough.
5. Publish an architecture case study with measured results before replacing the existing portfolio entry.

Original implementation only. No employer code, customer records or internal operational data. Repository visibility starts private; a later public release can be considered when the demo is ready.

## Run the first slice

Requires Node.js 24; no dependency installation is needed.

```sh
npm test
npm run demo
```

The implemented slice is an in-memory, exact one-to-one matching core with duplicate detection and ambiguity handling. It does not yet include CSV ingestion, persistence, authentication, UI, AI or accounting adjustments. Amounts are signed integer minor units; both input sources must already use the same account identity, currency and sign convention. Source IDs must be unique within each input source. The demo deliberately leaves partial and unknown payments unresolved.
