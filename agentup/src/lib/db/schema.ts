import { sqliteTable, text as sqliteText, integer as sqliteInteger } from 'drizzle-orm/sqlite-core';
import { pgTable, text as pgText, integer as pgInteger, boolean as pgBoolean } from 'drizzle-orm/pg-core';

// --- SQLite Schema (Local) ---

export const cases = sqliteTable('cases', {
  id: sqliteText('id').primaryKey(),
  title: sqliteText('title').notNull(),
  scenario: sqliteText('scenario').notNull(),
  openingMessage: sqliteText('opening_message').notNull(),
  channel: sqliteText('channel').notNull(),
  topic: sqliteText('topic').notNull(),
  difficulty: sqliteText('difficulty').notNull(),
  isDefault: sqliteInteger('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: sqliteText('created_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: sqliteText('id').primaryKey(),
  date: sqliteText('date').notNull(),
  totalScore: sqliteInteger('total_score').notNull(),
  casesCompleted: sqliteInteger('cases_completed').notNull(),
  createdAt: sqliteText('created_at').notNull(),
});

export const sessionCases = sqliteTable('session_cases', {
  id: sqliteText('id').primaryKey(),
  sessionId: sqliteText('session_id').notNull().references(() => sessions.id),
  caseId: sqliteText('case_id').notNull().references(() => cases.id),
  channel: sqliteText('channel').notNull(),
  score: sqliteInteger('score').notNull(),
  empathyScore: sqliteInteger('empathy_score').notNull(),
  accuracyScore: sqliteInteger('accuracy_score').notNull(),
  resolutionScore: sqliteInteger('resolution_score').notNull(),
  professionalismScore: sqliteInteger('professionalism_score').notNull(),
  feedback: sqliteText('feedback').notNull(),
  strength: sqliteText('strength').notNull(),
  improvement: sqliteText('improvement').notNull(),
  conversationLog: sqliteText('conversation_log').notNull(),
  turnCount: sqliteInteger('turn_count').notNull(),
  avgLatencyMs: sqliteInteger('avg_latency_ms'),
  promptVersion: sqliteText('prompt_version').default('v2.0'),
  completedAt: sqliteText('completed_at').notNull(),
});

// --- Postgres Schema (Vercel) ---

export const pgCases = pgTable('cases', {
  id: pgText('id').primaryKey(),
  title: pgText('title').notNull(),
  scenario: pgText('scenario').notNull(),
  openingMessage: pgText('opening_message').notNull(),
  channel: pgText('channel').notNull(),
  topic: pgText('topic').notNull(),
  difficulty: pgText('difficulty').notNull(),
  isDefault: pgBoolean('is_default').notNull().default(false),
  createdAt: pgText('created_at').notNull(),
});

export const pgSessions = pgTable('sessions', {
  id: pgText('id').primaryKey(),
  date: pgText('date').notNull(),
  totalScore: pgInteger('total_score').notNull(),
  casesCompleted: pgInteger('cases_completed').notNull(),
  createdAt: pgText('created_at').notNull(),
});

export const pgSessionCases = pgTable('session_cases', {
  id: pgText('id').primaryKey(),
  sessionId: pgText('session_id').notNull().references(() => pgSessions.id),
  caseId: pgText('case_id').notNull().references(() => pgCases.id),
  channel: pgText('channel').notNull(),
  score: pgInteger('score').notNull(),
  empathyScore: pgInteger('empathy_score').notNull(),
  accuracyScore: pgInteger('accuracy_score').notNull(),
  resolutionScore: pgInteger('resolution_score').notNull(),
  professionalismScore: pgInteger('professionalism_score').notNull(),
  feedback: pgText('feedback').notNull(),
  strength: pgText('strength').notNull(),
  improvement: pgText('improvement').notNull(),
  conversationLog: pgText('conversation_log').notNull(),
  turnCount: pgInteger('turn_count').notNull(),
  avgLatencyMs: pgInteger('avg_latency_ms'),
  promptVersion: pgText('prompt_version').default('v2.0'),
  completedAt: pgText('completed_at').notNull(),
});

// Helper for index.ts to get the correct schema set
export const sqliteSchema = { cases, sessions, sessionCases };
export const pgSchema = { cases: pgCases, sessions: pgSessions, sessionCases: pgSessionCases };

