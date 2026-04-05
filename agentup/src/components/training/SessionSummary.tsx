'use client';

import { useEffect, useState } from 'react';
import { useTrainingStore } from '@/lib/store/training-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ScoreResult } from '@/types';

export function SessionSummary() {
  const { scores, cases, conversations, streak, reset, setStreak, chosenChannels } =
    useTrainingStore();
  const [saved, setSaved] = useState(false);

  const avgScore = Math.round(
    scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length
  );

  // Save session on mount
  useEffect(() => {
    if (saved) return;

    const saveSession = async () => {
      const sessionCases = scores.map((score, i) => {
        const c = cases[i];
        const channel = chosenChannels[i] ||
          (c.channel === 'both' ? 'chat' : c.channel);

        return {
          caseId: c.id,
          channel,
          score: score.totalScore,
          empathyScore: score.empathy.score,
          accuracyScore: score.accuracy.score,
          resolutionScore: score.resolution.score,
          professionalismScore: score.professionalism.score,
          feedback: `${score.strength} ${score.improvement}`,
          strength: score.strength,
          improvement: score.improvement,
          conversationLog: conversations[i] || [],
          turnCount: (conversations[i] || []).filter(
            (m) => m.role === 'agent'
          ).length,
          avgLatencyMs: null,
        };
      });

      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            totalScore: avgScore,
            casesCompleted: scores.length,
            sessionCases,
          }),
        });

        if (res.ok) {
          // POST returns the updated streak — no separate fetch needed
          const { currentStreak } = await res.json();
          if (typeof currentStreak === 'number') {
            setStreak(currentStreak);
          }
        }
        setSaved(true);
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    };

    saveSession();
  }, [saved, scores, cases, conversations, avgScore, setStreak]);

  return (
    <div className="flex flex-col items-center py-10 max-w-xl mx-auto">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="text-5xl mb-4">
            {avgScore >= 80 ? '🏆' : avgScore >= 60 ? '👍' : '💪'}
          </div>
          <CardTitle className="text-2xl">Session Complete!</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Overall score */}
          <div className="text-center">
            <div className="text-6xl font-bold text-blue-600">{avgScore}</div>
            <div className="text-gray-500 mt-1">Session Average</div>
          </div>

          {/* Streak */}
          <div className="flex justify-center gap-8 py-4 border-y">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">
                🔥 {streak}
              </div>
              <div className="text-xs text-gray-500 mt-1">Day Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {scores.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">Cases Done</div>
            </div>
          </div>

          {/* Per-case breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-500">Case Scores</h3>
            {scores.map((score, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
              >
                <div>
                  <div className="text-sm font-medium">{cases[i]?.title}</div>
                  <div className="text-xs text-gray-500">
                    {cases[i]?.topic} · {cases[i]?.difficulty}
                  </div>
                </div>
                <div
                  className={`text-lg font-bold ${
                    score.totalScore >= 80
                      ? 'text-green-600'
                      : score.totalScore >= 60
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {score.totalScore}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={reset}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
