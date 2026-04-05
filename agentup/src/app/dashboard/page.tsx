'use client';

import { useEffect, useState } from 'react';
import { ScoreLineChart } from '@/components/dashboard/ScoreLineChart';
import { TopicBreakdown } from '@/components/dashboard/TopicBreakdown';
import { ChannelComparison } from '@/components/dashboard/ChannelComparison';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { SessionHistory } from '@/components/dashboard/SessionHistory';
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-gray-100 animate-pulse" />
      </div>
    );
  }

  const hasData = dailyScores.length > 0 || history.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>

      {!hasData ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-semibold mb-2">No data yet</h2>
          <p>Complete a training session to see your performance stats.</p>
        </div>
      ) : (
        <>
          {stats && <StatsCards stats={stats} />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScoreLineChart data={dailyScores} />
            <TopicBreakdown data={topicScores} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChannelComparison data={channelScores} />
            <SessionHistory data={history} />
          </div>
        </>
      )}
    </div>
  );
}
