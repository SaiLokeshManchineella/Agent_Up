import { db } from './index';
import { cases } from './schema';
import { defaultCases } from '@/data/default-cases';
import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';

export async function seedDefaultCases() {
  // Check if default cases already exist
  const existing = db.select().from(cases).where(eq(cases.isDefault, true)).all();

  if (existing.length > 0) return;

  const now = new Date().toISOString();

  for (const c of defaultCases) {
    db.insert(cases)
      .values({
        id: uuid(),
        title: c.title,
        scenario: c.scenario,
        openingMessage: c.openingMessage,
        channel: c.channel,
        topic: c.topic,
        difficulty: c.difficulty,
        isDefault: true,
        createdAt: now,
      })
      .run();
  }
}
