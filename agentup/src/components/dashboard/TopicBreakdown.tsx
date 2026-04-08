'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';
import type { TopicScore } from '@/types';

interface TopicBreakdownProps {
  data: TopicScore[];
}

export function TopicBreakdown({ data }: TopicBreakdownProps) {
  if (data.length === 0) {
    return (
      <Card className="border-border/60 bg-card shadow-sm rounded-xl h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Competency Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[240px] text-muted-foreground text-sm font-medium">
          No training records for detailed analysis
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    topic: d.topic,
    score: Math.round(d.avgScore),
    count: d.count,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15 }}
    >
      <Card className="border-border/60 bg-card shadow-sm rounded-xl overflow-hidden h-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              Skill Intensity Overview
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Topic Benchmarks</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart 
              data={chartData} 
              layout="vertical" 
              margin={{ left: 5, right: 10, top: 0, bottom: 0 }}
              barGap={8}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis 
                dataKey="topic" 
                type="category" 
                tick={{ fontSize: 10, fill: 'var(--foreground)', fontWeight: 600 }} 
                width={85}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              />
              <Bar 
                dataKey="score" 
                radius={[0, 4, 4, 0]} 
                barSize={14}
                animationDuration={1500}
                fill="var(--primary)"
                className="opacity-90 hover:opacity-100 transition-opacity"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
