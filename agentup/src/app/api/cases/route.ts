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

    const allCases = db.select().from(cases).orderBy(cases.createdAt).all();

    return Response.json(allCases);
  } catch (error) {
    console.error('Cases GET error:', error);
    return Response.json({ error: 'Failed to fetch cases' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Required field validation
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }
    if (
      !body.scenario ||
      typeof body.scenario !== 'string' ||
      !body.scenario.trim()
    ) {
      return Response.json({ error: 'Scenario is required' }, { status: 400 });
    }
    if (
      !body.openingMessage ||
      typeof body.openingMessage !== 'string' ||
      !body.openingMessage.trim()
    ) {
      return Response.json(
        { error: 'Opening message is required' },
        { status: 400 }
      );
    }
    if (!body.topic || typeof body.topic !== 'string' || !body.topic.trim()) {
      return Response.json({ error: 'Topic is required' }, { status: 400 });
    }

    // Length validation
    if (body.title.length > MAX_TITLE_LENGTH) {
      return Response.json(
        { error: `Title too long (max ${MAX_TITLE_LENGTH} chars)` },
        { status: 400 }
      );
    }
    if (body.scenario.length > MAX_SCENARIO_LENGTH) {
      return Response.json(
        { error: `Scenario too long (max ${MAX_SCENARIO_LENGTH} chars)` },
        { status: 400 }
      );
    }
    if (body.openingMessage.length > MAX_OPENING_LENGTH) {
      return Response.json(
        { error: `Opening message too long (max ${MAX_OPENING_LENGTH} chars)` },
        { status: 400 }
      );
    }
    if (body.topic.length > MAX_TOPIC_LENGTH) {
      return Response.json(
        { error: `Topic too long (max ${MAX_TOPIC_LENGTH} chars)` },
        { status: 400 }
      );
    }

    // Enum validation
    if (!VALID_CHANNELS.has(body.channel)) {
      return Response.json(
        { error: 'Channel must be chat, call, or both' },
        { status: 400 }
      );
    }
    if (!VALID_DIFFICULTIES.has(body.difficulty)) {
      return Response.json(
        { error: 'Difficulty must be Beginner, Intermediate, or Advanced' },
        { status: 400 }
      );
    }

    // Check for duplicate (same title + topic + difficulty)
    const existing = db
      .select({ id: cases.id })
      .from(cases)
      .where(
        and(
          eq(cases.title, body.title.trim()),
          eq(cases.topic, body.topic.trim()),
          eq(cases.difficulty, body.difficulty)
        )
      )
      .get();

    if (existing) {
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

    db.insert(cases).values(newCase).run();

    return Response.json(newCase, { status: 201 });
  } catch (error) {
    console.error('Cases POST error:', error);
    return Response.json({ error: 'Failed to create case' }, { status: 500 });
  }
}
