'use client';

import { useEffect, useState } from 'react';
import { useCaseStore } from '@/lib/store/case-store';
import { CaseList } from '@/components/cases/CaseList';
import { CaseFilters } from '@/components/cases/CaseFilters';
import { CaseForm } from '@/components/cases/CaseForm';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Case } from '@/types';

export default function MyCasesPage() {
  const { setCases, setLoading } = useCaseStore();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const loadCases = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/cases');
        const data = await res.json();
        if (Array.isArray(data)) {
          setCases(data);
        } else {
          console.error('API Error:', data);
          setCases([]);
        }
      } catch (err) {
        console.error('Fetch Error:', err);
        setCases([]);
      } finally {
        setLoading(false);
      }
    };
    loadCases();
  }, [setCases, setLoading]);

  const handleCaseCreated = (newCase: Case) => {
    useCaseStore.getState().addCase(newCase);
    setShowForm(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-2">
            <BookOpen className="w-4 h-4" strokeWidth={1.5} />
            Scenario Repository
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Scenario Library</h1>
          <p className="text-muted-foreground mt-2 max-w-lg leading-relaxed font-medium text-sm">
            Manage your collection of professional conversational drills and behavioral assessment scenarios.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowForm(true)}
            size="lg"
            className="h-12 px-6 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/10 transition-all hover:scale-[1.01] active:hover:scale-[0.99]"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Scenario
          </Button>
        </div>
      </header>

      <div className="space-y-8">
        <CaseFilters />
        
        <div className="relative min-h-[400px]">
          <CaseList />
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <CaseForm
            onClose={() => setShowForm(false)}
            onCreated={handleCaseCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
