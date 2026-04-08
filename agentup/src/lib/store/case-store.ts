import { create } from 'zustand';
import type { Case, Channel, Difficulty } from '@/types';

interface CaseFilters {
  topic: string;
  channel: string;
  difficulty: string;
}

export interface CaseStore {
  cases: Case[];
  isLoading: boolean;
  
  // Filters
  searchQuery: string;
  selectedTopic: string | null;
  selectedChannel: string | null;

  // Actions
  setCases: (cases: Case[]) => void;
  addCase: (c: Case) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTopic: (topic: string | null) => void;
  setSelectedChannel: (channel: string | null) => void;
  filteredCases: () => Case[];
}

export const useCaseStore = create<CaseStore>((set, get) => ({
  cases: [],
  isLoading: false,
  searchQuery: '',
  selectedTopic: null,
  selectedChannel: null,

  setCases: (cases) => set({ cases }),
  addCase: (c) => set((state) => ({ cases: [...state.cases, c] })),
  setLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedTopic: (selectedTopic) => set({ selectedTopic }),
  setSelectedChannel: (selectedChannel) => set({ selectedChannel }),

  filteredCases: () => {
    const { cases, searchQuery, selectedTopic, selectedChannel } = get();
    return cases.filter((c) => {
      // Filter by search query
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matchesSearch = 
          c.title.toLowerCase().includes(search) || 
          c.scenario.toLowerCase().includes(search) ||
          c.topic.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Filter by topic
      if (selectedTopic && c.topic !== selectedTopic) return false;

      // Filter by channel
      if (selectedChannel && c.channel !== selectedChannel && c.channel !== 'both') return false;

      return true;
    });
  },
}));
