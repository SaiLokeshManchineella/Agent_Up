'use client';

import { useCallback } from 'react';
import { useTrainingStore } from '@/lib/store/training-store';
import { CaseIntro } from './CaseIntro';
import { ChatSimulation } from './ChatSimulation';
import { CallSimulation } from './CallSimulation';
import { ScoreCard } from './ScoreCard';
import { SessionSummary } from './SessionSummary';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { Case } from '@/types';

export function SessionManager() {
  const {
    phase,
    cases,
    currentCaseIndex,
    scores,
    streak,
    startSession,
    setPhase,
    setStreak,
    isLoading,
    setLoading,
  } = useTrainingStore();

  const currentCase = cases[currentCaseIndex];

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all cases
      const res = await fetch('/api/cases');
      if (!res.ok) throw new Error('Failed to load cases');
      const allCases: Case[] = await res.json();

      if (allCases.length === 0) return;

      // Fetch stats for smart selection + streak
      const [statsRes, historyRes, topicRes] = await Promise.all([
        fetch('/api/sessions?type=stats'),
        fetch('/api/sessions?type=history'),
        fetch('/api/sessions?type=topic-scores'),
      ]);
      const stats = await statsRes.json();
      const history = await historyRes.json();
      const topicScores = await topicRes.json();

      // Smart selection: avoid recent cases, prefer weak topics
      const recentCaseIds = new Set(
        (history as { caseTitle: string; id: string }[])
          .slice(0, 3)
          .map((h: { caseTitle: string }) => h.caseTitle)
      );
      const weakTopics = (topicScores as { topic: string; avgScore: number }[])
        .sort(
          (a: { avgScore: number }, b: { avgScore: number }) =>
            a.avgScore - b.avgScore
        )
        .map((t: { topic: string }) => t.topic);

      const selected = selectCases(allCases, 3, recentCaseIds, weakTopics);
      startSession(selected);
      setStreak(stats.currentStreak);
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, startSession, setStreak]);

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="mb-6 text-6xl">🎯</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Daily Training
          </h1>
          <p className="text-gray-600 mb-8">
            Practice handling 3 realistic customer scenarios. Get instant AI
            feedback and improve your skills.
          </p>
          <Button
            size="lg"
            onClick={loadSession}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner />
                Preparing session...
              </span>
            ) : (
              'Start Training Session'
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'intro' && currentCase) {
    return (
      <CaseIntro
        caseData={currentCase}
        caseNumber={currentCaseIndex + 1}
        totalCases={cases.length}
      />
    );
  }

  if (phase === 'simulation' && currentCase) {
    const { chosenChannels } = useTrainingStore.getState();
    const channel =
      chosenChannels[currentCaseIndex] ||
      (currentCase.channel === 'both' ? 'chat' : currentCase.channel);

    if (channel === 'call') {
      return <CallSimulation caseData={currentCase} />;
    }
    return <ChatSimulation caseData={currentCase} />;
  }

  if (phase === 'scoring') {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner size="lg" />
          <p className="text-gray-500 mt-4">Scoring your performance...</p>
        </div>
      );
    }
    if (scores[currentCaseIndex]) {
      return (
        <ScoreCard
          score={scores[currentCaseIndex]}
          caseData={currentCase}
          caseNumber={currentCaseIndex + 1}
          totalCases={cases.length}
        />
      );
    }
  }

  if (phase === 'summary') {
    return <SessionSummary />;
  }

  return null;
}

function selectCases(
  allCases: Case[],
  count: number,
  recentTitles: Set<string> = new Set(),
  weakTopics: string[] = []
): Case[] {
  if (allCases.length <= count) return allCases;

  const used = new Set<string>();

  const pickFrom = (pool: Case[]): Case | null => {
    const fresh = pool.filter(
      (c) => !recentTitles.has(c.title) && !used.has(c.id)
    );
    const target =
      fresh.length > 0 ? fresh : pool.filter((c) => !used.has(c.id));
    if (target.length === 0) return null;
    const pick = target[Math.floor(Math.random() * target.length)];
    used.add(pick.id);
    return pick;
  };

  const selected: Case[] = [];

  // STRICT RULE: 1 chat-only + 1 call-only + 1 both (or fill from any channel)
  // This guarantees the user experiences chat AND voice every session

  // Slot 1: Must be a chat-only case
  const chatOnly = allCases.filter((c) => c.channel === 'chat');
  const chatPick = pickFrom(chatOnly);
  if (chatPick) selected.push(chatPick);

  // Slot 2: Must be a call-only case
  const callOnly = allCases.filter((c) => c.channel === 'call');
  const callPick = pickFrom(callOnly);
  if (callPick) selected.push(callPick);

  // Slot 3: Prefer a "both" case, otherwise any remaining
  const bothCases = allCases.filter((c) => c.channel === 'both');
  const bothPick = pickFrom(bothCases);
  if (bothPick && selected.length < count) {
    selected.push(bothPick);
  }

  // Fill any remaining slots (if we don't have enough of each type)
  if (selected.length < count) {
    // Prefer weak topics
    const remaining = allCases.filter((c) => !used.has(c.id));
    const sorted = remaining.sort((a, b) => {
      const aWeak = weakTopics.indexOf(a.topic);
      const bWeak = weakTopics.indexOf(b.topic);
      const aScore = aWeak >= 0 ? aWeak : 999;
      const bScore = bWeak >= 0 ? bWeak : 999;
      return aScore - bScore;
    });

    for (const c of sorted) {
      if (selected.length >= count) break;
      selected.push(c);
      used.add(c.id);
    }
  }

  // Shuffle while preserving the channel diversity invariant
  // Fisher-Yates shuffle — deterministic, unbiased
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }
  return selected;
}
