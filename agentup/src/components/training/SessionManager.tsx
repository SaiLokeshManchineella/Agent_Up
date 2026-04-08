'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrainingStore } from '@/lib/store/training-store';
import { CaseIntro } from './CaseIntro';
import { ChatSimulation } from './ChatSimulation';
import { CallSimulation } from './CallSimulation';
import { ScoreCard } from './ScoreCard';
import { SessionSummary } from './SessionSummary';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Target, Search, Mic, Sparkles } from 'lucide-react';
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
    nextCase,
  } = useTrainingStore();

  const currentCase = cases[currentCaseIndex];

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cases');
      if (!res.ok) throw new Error('Failed to load cases');
      const allCases: Case[] = await res.json();
      if (allCases.length === 0) return;

      const [statsRes, historyRes, topicRes] = await Promise.all([
        fetch('/api/sessions?type=stats'),
        fetch('/api/sessions?type=history'),
        fetch('/api/sessions?type=topic-scores'),
      ]);
      const stats = await statsRes.json();
      const history = await historyRes.json();
      const topicScores = await topicRes.json();

      const recentCaseIds = new Set(
        (history as { caseTitle: string; id: string }[])
          .slice(0, 3)
          .map((h: { caseTitle: string }) => h.caseTitle)
      );
      const weakTopics = (topicScores as { topic: string; avgScore: number }[])
        .sort((a, b) => a.avgScore - b.avgScore)
        .map((t) => t.topic);

      const selected = selectCases(allCases, 3, recentCaseIds, weakTopics);
      startSession(selected);
      setStreak(stats.currentStreak);
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, startSession, setStreak]);

  return (
    <div className="max-w-4xl mx-auto min-h-[calc(100vh-12rem)] flex flex-col justify-center">
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="flex flex-col items-center text-center animate-in fade-in duration-700"
          >
            <div className="w-20 h-20 mb-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 relative">
              <Target className="w-10 h-10" strokeWidth={1.5} />
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-2xl -z-10 animate-pulse" />
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight mb-4">Daily Performance Training</h1>
            <p className="text-base text-muted-foreground mb-12 max-w-lg leading-relaxed font-medium">
              Calibrate your diagnostic and conversational skills with three targeted AI-benchmarked scenarios. 
              Review telemetry after each turn to achieve professional certification.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 w-full max-w-2xl text-left">
              <FeatureCard 
                icon={Search} 
                title="Telemetry" 
                desc="Deep skill-gap tracking" 
                color="text-indigo-600"
              />
              <FeatureCard 
                icon={Mic} 
                title="Multimodal" 
                desc="Chat & Voice simulations" 
                color="text-emerald-600"
              />
              <FeatureCard 
                icon={Sparkles} 
                title="AI Benchmarking" 
                desc="Instant performance score" 
                color="text-amber-600"
              />
            </div>

            <div className="flex flex-col items-center gap-6 w-full max-w-sm">
              <Button
                size="lg"
                onClick={loadSession}
                disabled={isLoading}
                className="w-full h-14 text-base font-bold rounded-xl shadow-lg shadow-primary/10 transition-all hover:scale-[1.01] active:hover:scale-[0.99]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="w-5 h-5" />
                    Initializing Simulation...
                  </span>
                ) : (
                  'Begin Daily Session'
                )}
              </Button>
              
              {streak > 0 && (
                <div className="flex items-center gap-3 text-xs font-bold text-amber-700 bg-amber-50 px-5 py-2 rounded-full border border-amber-100 shadow-sm animate-in zoom-in-0 duration-500">
                  <span className="text-base">🔥</span>
                  <span className="uppercase tracking-widest">{streak} Day Consistency Streak</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {phase === 'intro' && currentCase && (
          <motion.div
            key={`intro-${currentCaseIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            <CaseIntro
              caseData={currentCase}
              caseNumber={currentCaseIndex + 1}
              totalCases={cases.length}
            />
          </motion.div>
        )}

        {phase === 'simulation' && currentCase && (
          <motion.div
            key={`sim-${currentCaseIndex}`}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            className="flex-1"
          >
            {(() => {
              const { chosenChannels } = useTrainingStore.getState();
              const channel = chosenChannels[currentCaseIndex] || 
                             (currentCase.channel === 'both' ? 'chat' : currentCase.channel);
              return channel === 'call' ? 
                <CallSimulation caseData={currentCase} /> : 
                <ChatSimulation caseData={currentCase} />;
            })()}
          </motion.div>
        )}

        {phase === 'scoring' && (
          <motion.div
            key={`scoring-${currentCaseIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center"
          >
            {isLoading ? (
              <div className="text-center">
                <Spinner size="lg" className="mx-auto" />
                <p className="text-sm font-medium text-muted-foreground mt-4 animate-pulse">
                  {currentCaseIndex === cases.length - 1 ? 'Finalizing aggregate telemetry...' : 'Processing diagnostic results...'}
                </p>
              </div>
            ) : scores[currentCaseIndex] && (
              <ScoreCard
                score={scores[currentCaseIndex]}
                onContinue={nextCase}
              />
            )}
          </motion.div>
        )}

        {phase === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1"
          >
            <SessionSummary 
              sessionScore={Math.round(scores.reduce((acc, curr) => acc + curr.totalScore, 0) / scores.length)}
              streak={streak} 
              onFinish={() => window.location.href = '/dashboard'}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color }: { icon: any, title: string, desc: string, color: string }) {
  return (
    <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-sm transition-all hover:border-border group">
      <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-4 ${color} transition-transform group-hover:scale-105`}>
        <Icon className="w-5 h-5" strokeWidth={1.5} />
      </div>
      <div className="text-sm font-bold text-foreground mb-1">{title}</div>
      <div className="text-[11px] text-muted-foreground font-medium leading-relaxed">{desc}</div>
    </div>
  );
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

  const chatOnly = allCases.filter((c) => c.channel === 'chat');
  const chatPick = pickFrom(chatOnly);
  if (chatPick) selected.push(chatPick);

  const callOnly = allCases.filter((c) => c.channel === 'call');
  const callPick = pickFrom(callOnly);
  if (callPick) selected.push(callPick);

  if (selected.length < count) {
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

  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }
  return selected;
}
