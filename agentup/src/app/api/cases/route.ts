import { db } from '@/lib/db';
import { cases } from '@/lib/db/schema';
import { seedDefaultCases } from '@/lib/db/seed';
import { v4 as uuid } from 'uuid';
import { eq, and } from 'drizzle-orm';

const VALID_CHANNELS = new Set(['chat', 'call', 'both']);
const VALID_DIFFICULTIES = new Set(['Beginner', 'Intermediate', 'Advanced']);
const MAX_TITLE_LENGTH = 200;
const MAX_SCENARIO_LENGTH = 5000;
const MAX_OPENING_LENGTH = 2000;
const MAX_TOPIC_LENGTH = 100;

export async function GET() {
  try {
    // Seed defaults on first access
    await seedDefaultCases();

    // Standard await works for both Postgres and SQLite in Drizzle
    const allCases = await db.select().from(cases).orderBy(cases.createdAt);

    return Response.json(allCases);
  } catch (error) {
    console.error('Cases GET error:', error);
    return Response.json({ error: 'Failed to fetch cases' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ... (Validation logic stays same)

    // Check for duplicate
    const existingResult = await db
      .select({ id: cases.id })
      .from(cases)
      .where(
        and(
          eq(cases.title, body.title.trim()),
          eq(cases.topic, body.topic.trim()),
          eq(cases.difficulty, body.difficulty)
        )
      );

    if (existingResult.length > 0) {
      return Response.json(
        { error: 'A case with this title, topic, and difficulty already exists' },
        { status: 409 }
      );
    }

    const newCase = {
      id: uuid(),
      title: body.title.trim(),
      scenario: body.scenario.trim(),
      openingMessage: body.openingMessage.trim(),
      channel: body.channel,
      topic: body.topic.trim(),
      difficulty: body.difficulty,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    await db.insert(cases).values(newCase);

    return Response.json(newCase, { status: 201 });
  } catch (error) {
    console.error('Cases POST error:', error);
    return Response.json({ error: 'Failed to create case' }, { status: 500 });
  }
}
