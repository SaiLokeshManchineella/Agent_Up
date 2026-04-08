'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, TrendingUp, Calendar, ChevronRight, LayoutDashboard, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface SessionSummaryProps {
  sessionScore: number;
  streak: number;
  onFinish: () => void;
}

export function SessionSummary({ sessionScore, streak, onFinish }: SessionSummaryProps) {
  const isHigh = sessionScore >= 80;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-12 py-10 animate-in fade-in zoom-in-95 duration-700">
      <div className="relative text-center">
        <div className="w-24 h-24 mx-auto rounded-3xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 mb-8 relative">
          <Award className="w-12 h-12" strokeWidth={1} />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-primary/20 rounded-3xl blur-3xl -z-10"
          />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Training Cycle Complete</h1>
        <p className="text-lg text-muted-foreground font-medium max-w-lg mx-auto leading-relaxed">
          Your daily performance metrics have been consolidated. Review your final mastery scores below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-border/60 bg-white shadow-xl rounded-3xl p-10 flex flex-col items-center text-center group">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">Aggregate Score</span>
          <div className="text-8xl font-black tracking-tighter text-primary mb-2 transition-transform group-hover:scale-105">
            {sessionScore}
          </div>
          <div className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-2">Weighted Performance Index</div>
        </Card>

        <Card className="border-border/60 bg-white shadow-xl rounded-3xl p-10 flex flex-col items-center text-center group">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">Operational Streak</span>
          <div className="flex items-baseline gap-2 text-primary mb-2 transition-transform group-hover:scale-105">
            <span className="text-8xl font-black tracking-tighter">{streak}</span>
            <span className="text-2xl font-bold text-muted-foreground/40">DAYS</span>
          </div>
          <div className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-2">Consecutive Mastery Cycles</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <SummaryStat icon={Calendar} label="Date Recorded" value={new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} />
        <SummaryStat icon={TrendingUp} label="Efficiency Gain" value="+12.4% Progress" />
        <SummaryStat icon={Award} label="Status" value={isHigh ? "Elite Qualified" : "Baseline Certified"} />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 justify-center pt-8">
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="h-14 px-10 text-base font-bold rounded-xl border-border/80 hover:bg-muted transition-all"
        >
          <RefreshCcw className="w-5 h-5 mr-3" strokeWidth={1.5} />
          Recalibrate Simulation
        </Button>
        <Button
          onClick={onFinish}
          className="h-14 px-12 text-base font-bold rounded-xl shadow-xl shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98] group"
        >
          <LayoutDashboard className="w-5 h-5 mr-3" strokeWidth={1.5} />
          Finalize & View Dashboard
          <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="p-6 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
      <div className="space-y-1">
        <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{label}</div>
        <div className="text-sm font-bold text-foreground">{value}</div>
      </div>
      <div className="w-10 h-10 rounded-xl bg-white border border-border/40 flex items-center justify-center text-muted-foreground/40">
        <Icon className="w-5 h-5" strokeWidth={1.2} />
      </div>
    </div>
  );
}
