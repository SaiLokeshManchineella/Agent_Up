# Database Layer — SQLite + Drizzle ORM

## Files

| File | Purpose |
|------|---------|
| `schema.ts` | Drizzle table definitions (cases, sessions, session_cases) |
| `index.ts` | DB connection, schema creation, migration system, transaction support |
| `seed.ts` | Seeds 5 default training cases on first access |

## Schema

Three tables with proper normalization:

- **cases**: training scenarios (default + custom)
- **sessions**: one per training session (date, total score, cases completed)
- **session_cases**: per-case results within a session (scores, feedback, conversation log)

### Foreign Keys
- `session_cases.session_id` → `sessions.id` (ON DELETE CASCADE)
- `session_cases.case_id` → `cases.id` (ON DELETE RESTRICT)

### Indexes
- `idx_session_cases_session_id` — fast session lookup
- `idx_session_cases_case_id` — fast case-to-results lookup
- `idx_session_cases_completed` — chronological ordering
- `idx_sessions_date` — date-range queries for dashboard

## Migration System

Schema versioning via `_schema_version` table:

```typescript
const SCHEMA_VERSION = 2;
```

On startup, `getDb()` checks the current schema version and applies any pending migrations. This is simpler than full Drizzle Kit migrations but sufficient for the MVP.

## Connection Model

- **Lazy singleton**: DB is created on first access, reused for all subsequent calls
- **WAL mode**: enables concurrent reads during writes
- **Busy timeout**: 5000ms (prevents "database is locked" errors)
- **Foreign keys**: enforced via PRAGMA

## Transaction Support

```typescript
import { getRawDb } from '@/lib/db';

const rawDb = getRawDb();
const insertAll = rawDb.transaction(() => {
  // All inserts succeed or all fail
  db.insert(sessions).values({...}).run();
  db.insert(sessionCases).values({...}).run();
});
insertAll();
```

The sessions POST route uses this to save session + all case results atomically.

## Default Cases

`seed.ts` creates 5 built-in cases on first access:
1. Unexpected Charge on Statement (Billing, Beginner, Chat)
2. Internet Outage — Furious Customer (De-escalation, Advanced, Call)
3. Cancel My Subscription (Retention, Intermediate, Both)
4. Can't Set Up New Router (Technical, Beginner, Chat)
5. Demand to Speak to Manager (De-escalation, Advanced, Call)
