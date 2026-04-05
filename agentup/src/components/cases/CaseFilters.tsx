'use client';

import { useCaseStore } from '@/lib/store/case-store';

const topics = ['all', 'Billing', 'De-escalation', 'Technical', 'Retention'];
const channels = ['all', 'chat', 'call', 'both'];
const difficulties = ['all', 'Beginner', 'Intermediate', 'Advanced'];

export function CaseFilters() {
  const { filters, setFilter, cases } = useCaseStore();

  // Get unique custom topics from cases
  const customTopics = Array.from(
    new Set(cases.map((c) => c.topic).filter((t) => !topics.includes(t)))
  );
  const allTopics = [...topics, ...customTopics];

  return (
    <div className="flex flex-wrap gap-3">
      <FilterSelect
        label="Topic"
        value={filters.topic}
        options={allTopics}
        onChange={(v) => setFilter('topic', v)}
      />
      <FilterSelect
        label="Channel"
        value={filters.channel}
        options={channels}
        onChange={(v) => setFilter('channel', v)}
      />
      <FilterSelect
        label="Difficulty"
        value={filters.difficulty}
        options={difficulties}
        onChange={(v) => setFilter('difficulty', v)}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-500">{label}:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === 'all' ? `All ${label}s` : opt}
          </option>
        ))}
      </select>
    </div>
  );
}
