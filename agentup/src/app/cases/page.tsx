'use client';

import { useEffect, useState } from 'react';
import { useCaseStore } from '@/lib/store/case-store';
import { CaseList } from '@/components/cases/CaseList';
import { CaseFilters } from '@/components/cases/CaseFilters';
import { CaseForm } from '@/components/cases/CaseForm';
import { Button } from '@/components/ui/button';
import type { Case } from '@/types';

export default function MyCasesPage() {
  const { setCases, setLoading, isLoading } = useCaseStore();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const loadCases = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/cases');
        const data: Case[] = await res.json();
        setCases(data);
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Cases</h1>
          <p className="text-gray-500 mt-1">
            Browse and create training scenarios
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          + Create Case
        </Button>
      </div>

      <CaseFilters />
      <CaseList />

      {showForm && (
        <CaseForm
          onClose={() => setShowForm(false)}
          onCreated={handleCaseCreated}
        />
      )}
    </div>
  );
}
