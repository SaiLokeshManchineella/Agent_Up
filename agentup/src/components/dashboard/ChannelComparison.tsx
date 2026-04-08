'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Phone, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import React from 'react';
import type { ChannelScore } from '@/types';

interface ChannelComparisonProps {
  data: ChannelScore[];
}

export function ChannelComparison({ data }: ChannelComparisonProps) {
  if (data.length === 0) {
    return (
      <Card className="border-border/60 bg-card shadow-sm rounded-xl h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4" strokeWidth={1} />
            Channel Intel
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[240px] text-muted-foreground text-sm font-medium">
          Unlock dual-channel analytics after initial sessions
        </CardContent>
      </Card>
    );
  }

  const chatScore = data.find((d) => d.channel === 'chat');
  const callScore = data.find((d) => d.channel === 'call');

  return (
    <Card className="border-border/60 bg-card shadow-sm rounded-xl overflow-hidden h-full">
      <CardHeader className="pb-4 border-b border-border/50">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            Multimodal Benchmarks
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cross-Channel Sync</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex gap-4">
          <ChannelCard
            icon={MessageSquare}
            label="Chat Performance"
            score={chatScore ? Math.round(chatScore.avgScore) : null}
            count={chatScore?.count || 0}
            delay={0.2}
          />
          <ChannelCard
            icon={Phone}
            label="Voice Performance"
            score={callScore ? Math.round(callScore.avgScore) : null}
            count={callScore?.count || 0}
            delay={0.3}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ChannelCard({
  icon: Icon,
  label,
  score,
  count,
  delay
}: {
  icon: React.ElementType;
  label: string;
  score: number | null;
  count: number;
  delay: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex-1 rounded-xl bg-muted/40 border border-border/60 p-5 text-center transition-colors"
    >
      <div className="w-10 h-10 mx-auto mb-4 rounded-lg bg-white border border-border/50 flex items-center justify-center text-foreground/70 shadow-sm">
        <Icon className="w-5 h-5" strokeWidth={1.5} />
      </div>
      
      <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-1">{label}</div>
      <div className={`text-3xl font-bold tracking-tight mb-2 flex items-baseline justify-center gap-0.5`}>
        {score !== null ? (
          <>
            <span>{score}</span>
            <span className="text-sm font-medium text-muted-foreground/60">%</span>
          </>
        ) : (
          <span className="text-muted-foreground/20 font-medium">--</span>
        )}
      </div>
      
      <div className="text-[10px] font-bold text-muted-foreground/60 bg-white/50 border border-border/30 rounded-md py-1 px-3 w-max mx-auto shadow-sm">
        {count} Sessions Recorded
      </div>
    </motion.div>
  );
}
