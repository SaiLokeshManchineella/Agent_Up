import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const cases = sqliteTable('cases', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  scenario: text('scenario').notNull(),
  openingMessage: text('opening_message').notNull(),
  channel: text('channel').notNull(), // 'chat' | 'call' | 'both'
  topic: text('topic').notNull(),
  difficulty: text('difficulty').notNull(), // 'Beginner' | 'Intermediate' | 'Advanced'
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  date: text('date').notNull(), // YYYY-MM-DD
  totalScore: integer('total_score').notNull(),
  casesCompleted: integer('cases_completed').notNull(),
  createdAt: text('created_at').notNull(),
});

export const sessionCases = sqliteTable('session_cases', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  caseId: text('case_id').notNull().references(() => cases.id),
  channel: text('channel').notNull(), // 'chat' | 'call'
  score: integer('score').notNull(),
  empathyScore: integer('empathy_score').notNull(),
  accuracyScore: integer('accuracy_score').notNull(),
  resolutionScore: integer('resolution_score').notNull(),
  professionalismScore: integer('professionalism_score').notNull(),
  feedback: text('feedback').notNull(),
  strength: text('strength').notNull(),
  improvement: text('improvement').notNull(),
  conversationLog: text('conversation_log').notNull(), // JSON
  turnCount: integer('turn_count').notNull(),
  avgLatencyMs: integer('avg_latency_ms'),
  completedAt: text('completed_at').notNull(),
});
