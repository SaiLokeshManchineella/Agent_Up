'use client';

import { useCaseStore } from '@/lib/store/case-store';
import { CaseCard } from './CaseCard';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CaseList() {
  const { filteredCases, isLoading } = useCaseStore();
  const cases = filteredCases();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-64 rounded-xl bg-muted/40 animate-pulse border border-border/50"
          />
        ))}
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-muted/30 border border-border/50"
      >
        <div className="w-16 h-16 mb-4 rounded-xl bg-muted flex items-center justify-center text-muted-foreground/30">
          <Search className="w-8 h-8" strokeWidth={1} />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-foreground">No matching scenarios</h3>
        <p className="max-w-xs text-sm text-muted-foreground mt-2 font-medium">
          We couldn&apos;t find any sessions matching your current filter criteria.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      <AnimatePresence mode="popLayout">
        {cases.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <CaseCard caseData={c} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
