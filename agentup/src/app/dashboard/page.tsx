'use client';

import { useEffect, useState } from 'react';
import { ScoreLineChart } from '@/components/dashboard/ScoreLineChart';
import { TopicBreakdown } from '@/components/dashboard/TopicBreakdown';
import { ChannelComparison } from '@/components/dashboard/ChannelComparison';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { SessionHistory } from '@/components/dashboard/SessionHistory';
import { BarChart3, LayoutDashboard, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  DailyScore,
  TopicScore,
  ChannelScore,
  DashboardStats,
  SessionHistoryItem,
} from '@/types';

export default function DashboardPage() {
  const [dailyScores, setDailyScores] = useState<DailyScore[]>([]);
  const [topicScores, setTopicScores] = useState<TopicScore[]>([]);
  const [channelScores, setChannelScores] = useState<ChannelScore[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const [dailyRes, topicRes, channelRes, statsRes, historyRes] =
          await Promise.all([
            fetch('/api/sessions?type=daily-scores'),
            fetch('/api/sessions?type=topic-scores'),
            fetch('/api/sessions?type=channel-scores'),
            fetch('/api/sessions?type=stats'),
            fetch('/api/sessions?type=history'),
          ]);

        setDailyScores(await dailyRes.json());
        setTopicScores(await topicRes.json());
        setChannelScores(await channelRes.json());
        setStats(await statsRes.json());
        setHistory(await historyRes.json());
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="h-10 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 rounded-xl bg-muted animate-pulse" />
          <div className="h-80 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  const hasData = dailyScores.length > 0 || history.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Performance Intel</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Real-time coaching telemetry and progress tracking</p>
        </div>
        {!hasData && (
          <div className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium shadow-sm border border-border">
            No telemetry data recorded yet
          </div>
        )}
      </header>

      {!hasData ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center rounded-2xl bg-muted/50 border border-border transition-all"
        >
          <div className="w-16 h-16 mb-6 rounded-2xl bg-white flex items-center justify-center text-muted-foreground/30 shadow-sm border border-border/60">
            <BarChart3 className="w-8 h-8" strokeWidth={1} />
          </div>
          <h2 className="text-xl font-bold mb-3 tracking-tight">Calibrate Your Mastery</h2>
          <p className="max-w-md text-muted-foreground leading-relaxed mb-10 text-sm font-medium">
            Take part in your first training session to unlock full-stack metrics, skill-gap analysis, and performance overviews.
          </p>
          <a 
            href="/" 
            className="inline-flex items-center justify-center px-8 h-12 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-all shadow-md shadow-primary/10"
          >
            Commence Daily Training
          </a>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="space-y-8">
            {stats && <StatsCards stats={stats} />}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ScoreLineChart data={dailyScores} />
              <TopicBreakdown data={topicScores} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ChannelComparison data={channelScores} />
              <SessionHistory data={history} />
            </div>
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
