'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, MessageSquare, Phone, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SessionHistoryItem } from '@/types';

interface SessionHistoryProps {
  data: SessionHistoryItem[];
}

export function SessionHistory({ data }: SessionHistoryProps) {
  if (data.length === 0) {
    return (
      <Card className="border-border/60 bg-card shadow-sm rounded-xl h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4" strokeWidth={1} />
            Historical Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground text-sm font-medium">
          Training archives will populate here
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card shadow-sm rounded-xl overflow-hidden h-full">
      <CardHeader className="pb-4 border-b border-border/50">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            Execution Timeline
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mastery Records</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {data.slice(0, 5).map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 hover:bg-muted/30 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white border border-border/50 flex items-center justify-center text-muted-foreground/70 shadow-sm group-hover:text-primary transition-colors">
                  {session.channel === 'chat' ? (
                    <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <Phone className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </div>
                <div className="flex flex-col min-w-0 overflow-hidden">
                  <span className="text-sm font-bold tracking-tight text-foreground truncate">{session.caseTitle}</span>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>{session.channel}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 ml-4">
                <div className="text-right">
                  <div className={`text-base font-bold tracking-tighter ${session.totalScore >= 80 ? 'text-emerald-600' : 'text-foreground/80'}`}>
                    {session.totalScore}%
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-all group-hover:translate-x-1" />
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
