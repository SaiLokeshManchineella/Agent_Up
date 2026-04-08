'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import type { DailyScore } from '@/types';

interface ScoreLineChartProps {
  data: DailyScore[];
}

export function ScoreLineChart({ data }: ScoreLineChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border-border/60 bg-card shadow-sm rounded-xl h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Performance Progression
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[240px] text-muted-foreground text-sm font-medium">
          Insufficient data for trend visualization
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    score: Math.round(d.avgScore),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="border-border/60 bg-card shadow-sm rounded-xl overflow-hidden h-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span>Historical Mastery (30D)</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Aggregate Telemetry</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 600 }} 
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 600 }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)',
                  fontSize: '11px',
                  fontWeight: 700
                }}
                labelStyle={{ fontWeight: 800, fontSize: '11px', marginBottom: '4px' }}
                itemStyle={{ fontSize: '11px', color: 'var(--primary)' }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="var(--primary)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorScore)"
                animationDuration={1500}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--primary)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
