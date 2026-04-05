import { db, getRawDb } from '@/lib/db';
import { sessions, sessionCases, cases } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';
import { eq, desc, sql, gte } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    if (type === 'history') {
      // Last 10 sessions with case details
      const results = db
        .select({
          id: sessionCases.id,
          sessionId: sessionCases.sessionId,
          date: sessions.date,
          totalScore: sessionCases.score,
          caseTitle: cases.title,
          caseTopic: cases.topic,
          channel: sessionCases.channel,
        })
        .from(sessionCases)
        .innerJoin(sessions, eq(sessionCases.sessionId, sessions.id))
        .innerJoin(cases, eq(sessionCases.caseId, cases.id))
        .orderBy(desc(sessionCases.completedAt))
        .limit(10)
        .all();

      return Response.json(results);
    }

    if (type === 'daily-scores') {
      // Daily average scores for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

      const results = db
        .select({
          date: sessions.date,
          avgScore: sql<number>`avg(${sessions.totalScore})`.as('avg_score'),
        })
        .from(sessions)
        .where(gte(sessions.date, dateStr))
        .groupBy(sessions.date)
        .orderBy(sessions.date)
        .all();

      return Response.json(results);
    }

    if (type === 'topic-scores') {
      const results = db
        .select({
          topic: cases.topic,
          avgScore: sql<number>`avg(${sessionCases.score})`.as('avg_score'),
          count: sql<number>`count(*)`.as('count'),
        })
        .from(sessionCases)
        .innerJoin(cases, eq(sessionCases.caseId, cases.id))
        .groupBy(cases.topic)
        .all();

      return Response.json(results);
    }

    if (type === 'channel-scores') {
      const results = db
        .select({
          channel: sessionCases.channel,
          avgScore: sql<number>`avg(${sessionCases.score})`.as('avg_score'),
          count: sql<number>`count(*)`.as('count'),
        })
        .from(sessionCases)
        .groupBy(sessionCases.channel)
        .all();

      return Response.json(results);
    }

    if (type === 'stats') {
      // Current streak
      const allSessions = db
        .select({ date: sessions.date })
        .from(sessions)
        .orderBy(desc(sessions.date))
        .all();

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sessionDates = new Set(allSessions.map((s) => s.date));
      const checkDate = new Date(today);

      // Check if there's a session today or yesterday to start the streak
      const todayStr = checkDate.toISOString().split('T')[0];
      const yesterdayDate = new Date(checkDate);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

      if (!sessionDates.has(todayStr) && !sessionDates.has(yesterdayStr)) {
        streak = 0;
      } else {
        // Start from today or yesterday, count backwards
        if (!sessionDates.has(todayStr)) {
          checkDate.setDate(checkDate.getDate() - 1);
        }
        while (sessionDates.has(checkDate.toISOString().split('T')[0])) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }

      // Sessions this week (Mon-Sun)
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
      const mondayStr = monday.toISOString().split('T')[0];

      const sessionsThisWeek = db
        .select({ count: sql<number>`count(*)`.as('count') })
        .from(sessions)
        .where(gte(sessions.date, mondayStr))
        .get();

      // Top skill and skill to improve
      const topicScores = db
        .select({
          topic: cases.topic,
          avgScore: sql<number>`avg(${sessionCases.score})`.as('avg_score'),
        })
        .from(sessionCases)
        .innerJoin(cases, eq(sessionCases.caseId, cases.id))
        .groupBy(cases.topic)
        .all();

      let topSkill: string | null = null;
      let skillToImprove: string | null = null;

      if (topicScores.length > 0) {
        const sorted = [...topicScores].sort(
          (a, b) => b.avgScore - a.avgScore
        );
        topSkill = sorted[0].topic;
        skillToImprove = sorted[sorted.length - 1].topic;
      }

      return Response.json({
        currentStreak: streak,
        sessionsThisWeek: sessionsThisWeek?.count || 0,
        topSkill,
        skillToImprove,
      });
    }

    // Default: return all sessions
    const allSessions = db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt))
      .all();

    return Response.json(allSessions);
  } catch (error) {
    console.error('Sessions GET error:', error);
    return Response.json(
      { error: 'Failed to fetch session data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Input validation
    if (typeof body.totalScore !== 'number' || body.totalScore < 0 || body.totalScore > 100) {
      return Response.json({ error: 'Invalid totalScore (0-100)' }, { status: 400 });
    }
    if (typeof body.casesCompleted !== 'number' || body.casesCompleted < 1 || body.casesCompleted > 10) {
      return Response.json({ error: 'Invalid casesCompleted' }, { status: 400 });
    }
    if (!Array.isArray(body.sessionCases) || body.sessionCases.length === 0) {
      return Response.json({ error: 'sessionCases must be a non-empty array' }, { status: 400 });
    }

    // Validate each session case
    for (const sc of body.sessionCases) {
      if (!sc.caseId || typeof sc.caseId !== 'string') {
        return Response.json({ error: 'Invalid caseId in sessionCases' }, { status: 400 });
      }
      if (!['chat', 'call'].includes(sc.channel)) {
        return Response.json({ error: 'Invalid channel in sessionCases' }, { status: 400 });
      }
      if (typeof sc.score !== 'number' || sc.score < 0 || sc.score > 100) {
        return Response.json({ error: 'Invalid score in sessionCases' }, { status: 400 });
      }
    }

    const sessionId = uuid();
    const now = new Date();
    const rawDb = getRawDb();

    // Use a transaction — all inserts succeed or none do
    const insertSession = rawDb.transaction(() => {
      // Create session
      db.insert(sessions)
        .values({
          id: sessionId,
          date: now.toISOString().split('T')[0],
          totalScore: body.totalScore,
          casesCompleted: body.casesCompleted,
          createdAt: now.toISOString(),
        })
        .run();

      // Create session cases
      for (const sc of body.sessionCases) {
        db.insert(sessionCases)
          .values({
            id: uuid(),
            sessionId,
            caseId: sc.caseId,
            channel: sc.channel,
            score: Math.max(0, Math.min(100, sc.score)),
            empathyScore: Math.max(0, Math.min(25, sc.empathyScore || 0)),
            accuracyScore: Math.max(0, Math.min(25, sc.accuracyScore || 0)),
            resolutionScore: Math.max(0, Math.min(25, sc.resolutionScore || 0)),
            professionalismScore: Math.max(0, Math.min(25, sc.professionalismScore || 0)),
            feedback: typeof sc.feedback === 'string' ? sc.feedback.slice(0, 5000) : '',
            strength: typeof sc.strength === 'string' ? sc.strength.slice(0, 2000) : '',
            improvement: typeof sc.improvement === 'string' ? sc.improvement.slice(0, 2000) : '',
            conversationLog: JSON.stringify(sc.conversationLog || []),
            turnCount: Math.max(0, Math.min(20, sc.turnCount || 0)),
            avgLatencyMs: sc.avgLatencyMs || null,
            completedAt: now.toISOString(),
          })
          .run();
      }
    });

    insertSession();

    // Return the new streak so client doesn't need a separate fetch
    const allSessions = db
      .select({ date: sessions.date })
      .from(sessions)
      .orderBy(desc(sessions.date))
      .all();

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDates = new Set(allSessions.map((s) => s.date));
    const checkDate = new Date(today);
    const todayStr = checkDate.toISOString().split('T')[0];

    if (sessionDates.has(todayStr)) {
      while (sessionDates.has(checkDate.toISOString().split('T')[0])) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    return Response.json({ id: sessionId, currentStreak: streak }, { status: 201 });
  } catch (error) {
    console.error('Sessions POST error:', error);
    return Response.json(
      { error: 'Failed to save session' },
      { status: 500 }
    );
  }
}
