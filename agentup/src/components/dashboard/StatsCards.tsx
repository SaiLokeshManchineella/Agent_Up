'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { DashboardStats } from '@/types';

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      icon: '🔥',
      label: 'Current Streak',
      value: `${stats.currentStreak} day${stats.currentStreak !== 1 ? 's' : ''}`,
      color: 'text-orange-600',
    },
    {
      icon: '📅',
      label: 'Sessions This Week',
      value: stats.sessionsThisWeek.toString(),
      color: 'text-blue-600',
    },
    {
      icon: '⭐',
      label: 'Top Skill',
      value: stats.topSkill || 'N/A',
      color: 'text-green-600',
    },
    {
      icon: '📈',
      label: 'Skill to Improve',
      value: stats.skillToImprove || 'N/A',
      color: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
