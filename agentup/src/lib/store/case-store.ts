import { create } from 'zustand';
import type { Case, Channel, Difficulty } from '@/types';

interface CaseFilters {
  topic: string;
  channel: string;
  difficulty: string;
}

interface CaseStore {
  cases: Case[];
  filters: CaseFilters;
  isLoading: boolean;

  setCases: (cases: Case[]) => void;
  addCase: (c: Case) => void;
  setFilter: (key: keyof CaseFilters, value: string) => void;
  resetFilters: () => void;
  setLoading: (loading: boolean) => void;
  filteredCases: () => Case[];
}

export const useCaseStore = create<CaseStore>((set, get) => ({
  cases: [],
  filters: { topic: 'all', channel: 'all', difficulty: 'all' },
  isLoading: false,

  setCases: (cases) => set({ cases }),
  addCase: (c) => set((state) => ({ cases: [...state.cases, c] })),
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  resetFilters: () =>
    set({ filters: { topic: 'all', channel: 'all', difficulty: 'all' } }),
  setLoading: (loading) => set({ isLoading: loading }),

  filteredCases: () => {
    const { cases, filters } = get();
    return cases.filter((c) => {
      if (filters.topic !== 'all' && c.topic !== filters.topic) return false;
      if (filters.channel !== 'all' && c.channel !== filters.channel) return false;
      if (filters.difficulty !== 'all' && c.difficulty !== filters.difficulty) return false;
      return true;
    });
  },
}));
