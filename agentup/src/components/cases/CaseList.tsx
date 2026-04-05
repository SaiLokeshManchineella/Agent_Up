'use client';

import { useCaseStore } from '@/lib/store/case-store';
import { CaseCard } from './CaseCard';

export function CaseList() {
  const { filteredCases, isLoading } = useCaseStore();
  const cases = filteredCases();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-32 rounded-lg bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-3">📋</div>
        <p>No cases found. Try adjusting your filters or create a new case.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {cases.map((c) => (
        <CaseCard key={c.id} caseData={c} />
      ))}
    </div>
  );
}
