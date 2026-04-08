'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Flame, Calendar, Award, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DashboardStats } from '@/types';

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      icon: Flame,
      label: 'Engagement Streak',
      value: `${stats.currentStreak} day${stats.currentStreak !== 1 ? 's' : ''}`,
      iconColor: 'text-amber-500',
    },
    {
      icon: Calendar,
      label: 'Sessions (7 Days)',
      value: `${stats.sessionsThisWeek} Completed`,
      iconColor: 'text-blue-500',
    },
    {
      icon: Award,
      label: 'Top Competency',
      value: stats.topSkill || 'Calculating...',
      iconColor: 'text-emerald-500',
    },
    {
      icon: TrendingUp,
      label: 'Growth Area',
      value: stats.skillToImprove || 'Analyzing...',
      iconColor: 'text-rose-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="border-border/60 bg-card shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-muted text-foreground`}>
                   <card.icon className="w-4 h-4" strokeWidth={1} />
                </div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{card.label}</span>
              </div>
              <div className="text-xl font-bold tracking-tight text-foreground truncate">{card.value}</div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
