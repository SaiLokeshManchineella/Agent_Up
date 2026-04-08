import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, ChevronRight, Activity, Target, Sparkles, Brain, Gauge, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrainingStore } from '@/lib/store/training-store';
import type { ScoreResult } from '@/types';

interface ScoreCardProps {
  score: ScoreResult;
  onContinue: () => void;
}

export function ScoreCard({ score, onContinue }: ScoreCardProps) {
  const { wasTerminated } = useTrainingStore();
  const isHigh = score.totalScore >= 80;
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

  if (wasTerminated) {
    return (
      <div className="max-w-2xl mx-auto w-full py-20 px-4 text-center space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center mx-auto text-rose-600 shadow-xl shadow-rose-900/5">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-black tracking-tight">Simulation Terminated</h1>
          <p className="text-muted-foreground font-medium leading-relaxed max-w-sm mx-auto">
            This training session was ended before reaching the required 5-turn baseline. 
            Behavioral analysis requires a full conversation set to generate mastery scores.
          </p>
        </div>
        <div className="pt-4">
          <Button
            size="lg"
            onClick={onContinue}
            className="h-14 px-12 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Acknowledge & Return
          </Button>
        </div>
      </div>
    );
  }

  const toggleExpand = (idx: number) => {
    setExpandedIndices(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  // Use the raw 0-25 per-dimension scores as marks for the UI
  const dimensions = [
    { label: 'Empathy', value: score.empathy.score, note: score.empathy.note },
    { label: 'Accuracy', value: score.accuracy.score, note: score.accuracy.note },
    { label: 'Resolution', value: score.resolution.score, note: score.resolution.note },
    { label: 'Professionalism', value: score.professionalism.score, note: score.professionalism.note },
  ];

  const strengths = score.strength ? score.strength.split(/[.!?]+ /).filter(s => s.trim().length > 0) : [];
  const weaknesses = score.improvement ? score.improvement.split(/[.!?]+ /).filter(s => s.trim().length > 0) : [];
  
  return (
    <div className="max-w-5xl mx-auto w-full space-y-12 py-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Header with Gauge Style */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-4">
          <Brain className="w-3.5 h-3.5" />
          Neural Assessment Logic Complete
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Scenario Mastery Analysis</h1>
        <p className="text-muted-foreground font-medium max-w-xl mx-auto leading-relaxed">
          Our behavioral models have cross-referenced your interaction against enterprise mastery standards (25 marks per dimension). 
          Aggregate telemetry provided below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: Master Score & Critical Benchmarks */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border/60 bg-white shadow-2xl rounded-3xl p-12 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
            <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
            
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6">Aggregate Mastery</span>
            <div className="flex items-baseline justify-center gap-1 mb-8 relative">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
                className={`text-9xl font-black tracking-tighter ${isHigh ? 'text-primary' : 'text-rose-600'}`}
              >
                {score.totalScore}
              </motion.div>
              <div className="text-xl font-black text-muted-foreground/20 uppercase tracking-widest pb-4">/100</div>
            </div>
            <Badge variant="outline" className={`h-10 px-8 rounded-full border-border/60 text-[10px] font-bold uppercase tracking-widest shadow-sm ${isHigh ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-amber-600 bg-amber-50 border-amber-100'}`}>
              {isHigh ? 'Certified Mastery' : 'Baseline Standard'}
            </Badge>

            <div className="mt-12 w-full pt-8 border-t border-border/40 grid grid-cols-2 gap-4">
               <div className="text-center">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Pass Mark</div>
                  <div className="text-lg font-bold text-foreground">80 / 100</div>
               </div>
               <div className="text-center">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Consistency</div>
                  <div className="text-lg font-bold text-foreground">High</div>
               </div>
            </div>
          </Card>
          
          <div className="p-6 rounded-3xl bg-muted/30 border border-border/40">
             <div className="flex items-center gap-3 mb-4">
                <Gauge className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contextual Difficulty</span>
             </div>
             <div className="space-y-3">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                   <div className="h-full bg-primary/40 w-full" />
                </div>
                <p className="text-[10px] text-muted-foreground font-medium italic">Benchmarked against high-complexity behavioral scenarios.</p>
             </div>
          </div>
        </div>

        {/* Right Col: Detailed Breakdown & Feedback */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {dimensions.map((dim, idx) => {
                const isExpanded = expandedIndices.includes(idx);
                const percentage = (dim.value / 25) * 100;
                return (
                  <motion.div 
                     key={dim.label}
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.4 + (idx * 0.1) }}
                  >
                     <Card className="border-border/60 bg-white shadow-sm p-6 rounded-2xl group hover:border-primary/30 transition-all">
                        <div className="flex justify-between items-center mb-4">
                           <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{dim.label}</span>
                           <div className="flex items-baseline gap-1">
                              <span className="text-base font-black text-foreground">{dim.value}</span>
                              <span className="text-[10px] font-bold text-muted-foreground/40 uppercase">/ 25</span>
                           </div>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-4 border border-border/20">
                           <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${percentage}%` }}
                               transition={{ duration: 1.5, delay: 0.8 }}
                               className={`h-full ${percentage >= 75 ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                            />
                        </div>
                        
                        <div className="relative">
                          <p className={`text-[11px] font-medium text-muted-foreground leading-relaxed ${!isExpanded ? 'line-clamp-2 italic' : ''}`}>
                             {dim.note}
                          </p>
                          <button 
                            onClick={() => toggleExpand(idx)}
                            className="mt-2 text-[10px] font-black uppercase tracking-[0.15em] text-primary flex items-center gap-1 hover:opacity-70"
                          >
                            {isExpanded ? (
                              <><ChevronUp className="w-3 h-3" /> See Less</>
                            ) : (
                              <><ChevronDown className="w-3 h-3" /> See More</>
                            )}
                          </button>
                        </div>
                     </Card>
                  </motion.div>
                );
             })}
          </div>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
               <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                     <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground">Established Mastery</h3>
                  </div>
                  <div className="space-y-3">
                     {strengths.length > 0 ? strengths.map((s, i) => (
                        <div key={i} className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/50 flex items-start gap-4">
                           <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2} />
                           <p className="text-xs font-semibold text-emerald-900/80 leading-relaxed">{s.replace(/^[-*•]\s+/, '')}</p>
                        </div>
                     )) : (
                        <p className="text-xs text-muted-foreground italic pl-2">No significant mastery markers detected.</p>
                     )}
                  </div>
               </div>

               <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                     <AlertCircle className="w-4 h-4 text-amber-500" />
                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground">Refinement Required</h3>
                  </div>
                  <div className="space-y-3">
                     {weaknesses.length > 0 ? weaknesses.map((w, i) => (
                        <div key={i} className="p-4 rounded-xl bg-amber-50/50 border border-amber-100/50 flex items-start gap-4">
                           <Target className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2} />
                           <p className="text-xs font-semibold text-amber-900/80 leading-relaxed">{w.replace(/^[-*•]\s+/, '')}</p>
                        </div>
                     )) : (
                        <p className="text-xs text-muted-foreground italic pl-2">Procedurally correct. No critical refinement needed.</p>
                     )}
                  </div>
               </div>
            </div>
            
            {score.tip && (
               <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 }}
                  className="p-8 rounded-3xl bg-primary shadow-2xl shadow-primary/20 text-white relative overflow-hidden"
               >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-3xl" />
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 rounded-xl bg-white/10 text-white">
                        <Sparkles className="w-5 h-5" />
                     </div>
                     <span className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-80">Elite Executive Tip</span>
                  </div>
                  <p className="text-base font-bold leading-relaxed italic">
                     "{score.tip}"
                  </p>
               </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <Button
          size="lg"
          onClick={onContinue}
          className="h-16 px-12 text-base font-bold rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group"
        >
          Acknowledge & Continue
          <ChevronRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
