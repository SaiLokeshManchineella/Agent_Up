'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Phone, Info, Zap, Target } from 'lucide-react';
import { useTrainingStore } from '@/lib/store/training-store';
import { motion } from 'framer-motion';
import type { Case } from '@/types';

interface CaseIntroProps {
  caseData: Case;
  caseNumber: number;
  totalCases: number;
}

export function CaseIntro({ caseData, caseNumber, totalCases }: CaseIntroProps) {
  const { setPhase, setChosenChannel } = useTrainingStore();

  const handleStart = (channel: 'chat' | 'call') => {
    setChosenChannel(caseNumber - 1, channel);
    setPhase('simulation');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Scenario {caseNumber} of {totalCases}</span>
          <h2 className="text-3xl font-bold tracking-tight">{caseData.title}</h2>
        </div>
        <Badge variant="outline" className="h-8 px-4 rounded-full border-primary/20 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest">
           {caseData.topic}
        </Badge>
      </div>

      <Card className="border-border/60 bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/40 bg-muted/30">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" strokeWidth={1.5} />
            Situation Briefing
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="space-y-8">
            <p className="text-lg text-foreground/80 leading-relaxed font-medium italic border-l-4 border-primary/20 pl-6">
              "{caseData.scenario}"
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Primary Objective</span>
                </div>
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  Navigate the simulation to reach a professional resolution while maintaining empathy.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Dynamic Difficulty</span>
                </div>
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  Complexity: <span className="text-primary">{caseData.difficulty}</span> benchmarking active.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-6 pt-4">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Select Communication Protocol</h3>
        <div className="flex items-center gap-6 w-full max-w-xl">
          {(caseData.channel === 'chat' || caseData.channel === 'both') && (
            <button
              onClick={() => handleStart('chat')}
              className="flex-1 group flex flex-col items-center gap-4 p-8 rounded-2xl bg-white border border-border/60 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/5 text-primary flex items-center justify-center transition-transform group-hover:scale-110">
                <MessageSquare className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <div className="font-bold text-foreground">Digital Chat</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-widest">Text Simulation</div>
              </div>
            </button>
          )}

          {(caseData.channel === 'call' || caseData.channel === 'both') && (
            <button
              onClick={() => handleStart('call')}
              className="flex-1 group flex flex-col items-center gap-4 p-8 rounded-2xl bg-white border border-border/60 shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-110">
                <Phone className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <div className="font-bold text-foreground">Live Call</div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-widest">Voice Simulation</div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
