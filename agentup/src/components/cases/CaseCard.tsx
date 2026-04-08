'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Phone, MessagesSquare, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTrainingStore } from '@/lib/store/training-store';
import { useRouter } from 'next/navigation';
import type { Case } from '@/types';

interface CaseCardProps {
  caseData: Case;
}

const difficultyColors = {
  Beginner: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  Intermediate: 'text-amber-700 bg-amber-50 border-amber-100',
  Advanced: 'text-rose-700 bg-rose-50 border-rose-100',
};

const channelIcons = {
  chat: <MessageSquare className="w-4 h-4" />,
  call: <Phone className="w-4 h-4" />,
  both: <MessagesSquare className="w-4 h-4" />,
};

export function CaseCard({ caseData }: CaseCardProps) {
  const router = useRouter();
  const { startSession } = useTrainingStore();

  const handleOpen = () => {
    startSession([caseData]);
    router.push('/');
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="h-full cursor-pointer"
      onClick={handleOpen}
    >
      <Card className="group h-full flex flex-col border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-border transition-all rounded-xl overflow-hidden cursor-pointer">
        <CardContent className="p-6 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground/80 border border-border/50 group-hover:text-primary transition-colors">
                {channelIcons[caseData.channel]}
              </div>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider bg-transparent border-border/60 text-muted-foreground">
                {caseData.topic}
              </Badge>
            </div>
            {caseData.isDefault && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50/50 px-2 py-1 rounded-full border border-emerald-100">
                <CheckCircle2 className="w-3 h-3" />
                Vetted
              </div>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-base font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors">
              {caseData.title}
            </h3>

            <p className="text-sm text-muted-foreground line-clamp-3 mb-6 font-medium leading-relaxed">
              {caseData.scenario}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-auto">
            <Badge className={`text-[9px] font-bold uppercase tracking-widest border shadow-none ${difficultyColors[caseData.difficulty]}`}>
              {caseData.difficulty}
            </Badge>
            
            <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors">
              Open Scenario
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
