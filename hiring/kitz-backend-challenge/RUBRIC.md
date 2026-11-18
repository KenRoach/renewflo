# KitZ Backend Challenge — Grader Pack (PRIVATE)

Do **not** share this file, `grader/`, or this repo with candidates. Candidates only receive `BRIEF.md`.

## Process

| Step | Who | Time |
|------|-----|------|
| 1. Send BRIEF.md (draft → Kenneth approves → send) | Kenneth | 5 min |
| 2. Candidate builds in their own repo | Candidate | ≤ 4 h, 5-day window |
| 3. Run automated grader on a fresh DB | Claude / reviewer | 10 min |
| 4. Read code + NOTES.md, fill manual score | Reviewer | 20 min |
| 5. 45-min live call (review + live extension) | Kenneth + reviewer | 45 min |
| 6. Decision, logged in KitZ memory | Kenneth | 5 min |

### Running the automated grader

```bash
git clone <candidate repo> && cd <repo> && docker compose up -d   # per their README
BASE_URL=http://localhost:3000 node /path/to/grader/grade.mjs
```

Always run it against a **fresh database**. Exit code `2` = automatic fail.
Self-check: `node grader/reference-server.mjs` then run the grader against it; it should score 89/89.

## Scoring (100)

| Area | Points | Source |
|------|--------|--------|
| Automated contract tests (grade.mjs) | 60 | `grade.mjs`, scaled from 89 |
| Their own tests: cover idempotency, concurrency, isolation, not just the happy path | 10 | Manual |
| Code structure: clear layers, types, no `any`, DB-level guarantees | 10 | Manual |
| NOTES.md: scaling to 1,000 clinics × 300 msgs/day at ≤ $0.15/txn, honest trade-offs, AI-use disclosure | 10 | Manual |
| Live extension (below) | 10 | Live call |

**Pass ≥ 70.** Automatic fail (regardless of score):
- Tenant isolation broken (grader exits 2).
- Billing count wrong (a retry charged twice).
- Can't explain their own code on the call.

### What "good" looks like (manual review cues)

- **Idempotency in the DB**, e.g. `UNIQUE (clinic_id, message_id)` + `INSERT … ON CONFLICT DO NOTHING`, not an in-memory Set.
- **Double-booking prevented in the DB**, e.g. a unique index on `(clinic_id, starts_at) WHERE status='booked'`, or an exclusion constraint, or `SELECT … FOR UPDATE` in a transaction. App-level "check then insert" without a lock = race condition → deduct.
- **Billing tied to the booking** in the same transaction (or derived from bookings) so a crash can't charge without booking or book without charging.
- **Tenant scoping** enforced in one place (repository layer, middleware, or Postgres RLS), not repeated ad hoc in each handler.
- **Time zone** handled explicitly (America/Panama, UTC-5); timestamps stored in UTC.
- **LLM (optional)** behind an interface with a deterministic fallback, and tests that don't need an API key.
- NOTES.md mentions queues/async processing for webhooks, retries, observability, and a cost estimate with real numbers.

### Red flags

- No tests, or only happy-path tests.
- Secrets hardcoded beyond the given test values; no `.env.example`.
- One giant file; `any` everywhere.
- Commit history = one "initial commit" dump (ask about it on the call; not an auto-fail).
- NOTES.md written in generic AI prose with no specific numbers.

## Live call (45 min)

1. **Walkthrough (10 min):** "Explain how a duplicate messageId arriving in parallel is handled, down to the SQL."
2. **Live extension (20 min):** add cancellation.
   > A message "cancelar mi cita" from the same phone cancels that patient's next booked appointment, frees the slot,
   > responds `"cancelled"`, and the cancelled booking **stops counting as a transaction** if cancelled more than 24h before.
   Watch: do they write a test first? Do they handle "no appointment to cancel"? Do they think about the billing edge?
3. **Scale (10 min):** "WhatsApp worker goes down for 2 hours and then replays 50,000 messages in 1 minute. What happens?"
4. **Their questions (5 min).**

Live extension scoring: 10 = working + tested + billing edge handled; 6 = works, no test; 3 = right approach, unfinished; 0 = stuck.

## Decision log

After the call, record outcome in KitZ memory (slug `hiring-backend-<candidate>-<date>`): score breakdown, decision, and next step.
