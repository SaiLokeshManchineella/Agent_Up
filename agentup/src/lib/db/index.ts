import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';

export const SCHEMA_VERSION = 2;
export const isPostgres = !!process.env.POSTGRES_URL;

let _db: any = null;
let _initPromise: Promise<void> | null = null;

export async function ensureDbReady() {
  getDb(); // Ensure _db is created
  if (_initPromise) await _initPromise;
}

export function getDb() {
  if (_db) return _db;

  if (isPostgres) {
    // Vercel Postgres Driver
    _db = drizzlePg(sql, { schema: schema.pgSchema });
    console.log('📦 Database: Connected to Vercel Postgres');
    
    // Postgres table initialization (handled via internal 'sql' execution)
    _initPromise = initializePostgres();
  } else {
    // Local SQLite Driver
    const dbPath = path.join(process.cwd(), 'agentup.db');
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    setupSqliteTables(sqlite);
    _db = drizzleSqlite(sqlite, { schema: schema.sqliteSchema });
    console.log('📁 Database: Connected to Local SQLite (agentup.db)');
  }

  return _db;
}

export async function initializePostgres() {
  if (!isPostgres) return;
  try {
    // Simple table creation for Postgres
    await sql.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        scenario TEXT NOT NULL,
        opening_message TEXT NOT NULL,
        channel TEXT NOT NULL,
        topic TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
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
        case_id TEXT NOT NULL REFERENCES cases(id),
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
        prompt_version TEXT DEFAULT 'v2.0',
        completed_at TEXT NOT NULL
      );
    `);
  } catch (err) {
    console.error('❌ Postgres initialization failed:', err);
  }
}

function setupSqliteTables(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER, applied_at TEXT);
    CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, scenario TEXT NOT NULL,
        opening_message TEXT NOT NULL, channel TEXT NOT NULL, topic TEXT NOT NULL,
        difficulty TEXT NOT NULL, is_default INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY, date TEXT NOT NULL, total_score INTEGER NOT NULL,
        cases_completed INTEGER NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS session_cases (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        case_id TEXT NOT NULL REFERENCES cases(id), channel TEXT NOT NULL,
        score INTEGER NOT NULL, empathy_score INTEGER NOT NULL, accuracy_score INTEGER NOT NULL,
        resolution_score INTEGER NOT NULL, professionalism_score INTEGER NOT NULL,
        feedback TEXT NOT NULL, strength TEXT NOT NULL, improvement TEXT NOT NULL,
        conversation_log TEXT NOT NULL, turn_count INTEGER NOT NULL,
        avg_latency_ms INTEGER, prompt_version TEXT DEFAULT 'v2.0', completed_at TEXT NOT NULL
    );
  `);
}

export const db = new Proxy({} as any, {
  get(_target, prop) {
    const realDb = getDb();
    const value = realDb[prop];
    return typeof value === 'function' ? value.bind(realDb) : value;
  },
});

// Dialect-agnostic schema exports
export const { 
  cases, 
  sessions, 
  sessionCases 
} = isPostgres ? schema.pgSchema : schema.sqliteSchema;

