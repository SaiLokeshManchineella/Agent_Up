import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';

// Schema version — increment when schema changes
// This enables safe migrations without a full migration tool
const SCHEMA_VERSION = 2;

const dbPath = path.join(process.cwd(), 'agentup.db');

let _db: BetterSQLite3Database<typeof schema> | null = null;
let _sqlite: Database.Database | null = null;

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!_db) {
    const sqlite = new Database(dbPath);
    _sqlite = sqlite;

    // Performance and safety pragmas
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('busy_timeout = 5000');
    sqlite.pragma('foreign_keys = ON');

    // Schema creation with version tracking
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS _schema_version (
        version INTEGER NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        scenario TEXT NOT NULL,
        opening_message TEXT NOT NULL,
        channel TEXT NOT NULL,
        topic TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        total_score INTEGER NOT NULL,
        cases_completed INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session_cases (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
        channel TEXT NOT NULL,
        score INTEGER NOT NULL,
        empathy_score INTEGER NOT NULL,
        accuracy_score INTEGER NOT NULL,
        resolution_score INTEGER NOT NULL,
        professionalism_score INTEGER NOT NULL,
        feedback TEXT NOT NULL,
        strength TEXT NOT NULL,
        improvement TEXT NOT NULL,
        conversation_log TEXT NOT NULL,
        turn_count INTEGER NOT NULL,
        avg_latency_ms INTEGER,
        prompt_version TEXT DEFAULT 'v1.0',
        completed_at TEXT NOT NULL
      );

      -- Indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_session_cases_session_id ON session_cases(session_id);
      CREATE INDEX IF NOT EXISTS idx_session_cases_case_id ON session_cases(case_id);
      CREATE INDEX IF NOT EXISTS idx_session_cases_completed ON session_cases(completed_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
    `);

    // Track schema version
    const currentVersion = sqlite
      .prepare('SELECT MAX(version) as v FROM _schema_version')
      .get() as { v: number | null } | undefined;

    if (!currentVersion?.v || currentVersion.v < SCHEMA_VERSION) {
      // Apply migrations for this version
      applyMigrations(sqlite, currentVersion?.v || 0);
    }

    _db = drizzle(sqlite, { schema });
  }

  return _db;
}

function applyMigrations(sqlite: Database.Database, fromVersion: number): void {
  if (fromVersion < 2) {
    // v2: Add prompt_version column and indexes (safe — uses IF NOT EXISTS)
    try {
      sqlite.exec(`ALTER TABLE session_cases ADD COLUMN prompt_version TEXT DEFAULT 'v1.0'`);
    } catch {
      // Column already exists — safe to ignore
    }
  }

  sqlite
    .prepare('INSERT INTO _schema_version (version, applied_at) VALUES (?, ?)')
    .run(SCHEMA_VERSION, new Date().toISOString());
}

// Expose raw SQLite for transaction support
export function getRawDb(): Database.Database {
  if (!_sqlite) getDb(); // Ensure initialized
  return _sqlite!;
}

// Proxy that lazily initializes - use `db` everywhere
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop) {
    const realDb = getDb();
    const value = (realDb as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(realDb);
    }
    return value;
  },
});
