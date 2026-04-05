import { create } from 'zustand';
import type { Case, ConversationMessage, ScoreResult, TrainingPhase } from '@/types';

interface TrainingStore {
  phase: TrainingPhase;
  sessionId: string | null;
  cases: Case[];
  currentCaseIndex: number;
  currentTurn: number;
  maxTurns: number;
  conversations: ConversationMessage[][];
  scores: ScoreResult[];
  streak: number;
  isLoading: boolean;
  error: string | null;
  chosenChannels: ('chat' | 'call')[];

  // Actions
  startSession: (cases: Case[]) => void;
  setPhase: (phase: TrainingPhase) => void;
  setSessionId: (id: string) => void;
  addMessage: (message: ConversationMessage) => void;
  incrementTurn: () => void;
  addScore: (score: ScoreResult) => void;
  nextCase: () => void;
  setStreak: (streak: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setChannelForCurrentCase: (channel: 'chat' | 'call') => void;
  reset: () => void;
}

export const useTrainingStore = create<TrainingStore>((set) => ({
  phase: 'idle',
  sessionId: null,
  cases: [],
  currentCaseIndex: 0,
  currentTurn: 0,
  maxTurns: 5,
  conversations: [],
  scores: [],
  streak: 0,
  isLoading: false,
  error: null,
  chosenChannels: [],

  startSession: (cases) =>
    set({
      phase: 'intro',
      cases,
      currentCaseIndex: 0,
      currentTurn: 0,
      conversations: cases.map(() => []),
      scores: [],
      isLoading: false,
      error: null,
      chosenChannels: cases.map((c) =>
        c.channel === 'both' ? 'chat' : (c.channel as 'chat' | 'call')
      ),
    }),

  setPhase: (phase) => set({ phase }),
  setSessionId: (id) => set({ sessionId: id }),

  addMessage: (message) =>
    set((state) => {
      const conversations = [...state.conversations];
      conversations[state.currentCaseIndex] = [
        ...conversations[state.currentCaseIndex],
        message,
      ];
      return { conversations };
    }),

  incrementTurn: () =>
    set((state) => ({ currentTurn: state.currentTurn + 1 })),

  addScore: (score) =>
    set((state) => ({ scores: [...state.scores, score] })),

  nextCase: () =>
    set((state) => ({
      currentCaseIndex: state.currentCaseIndex + 1,
      currentTurn: 0,
      phase: 'intro',
      error: null,
    })),

  setStreak: (streak) => set({ streak }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  setChannelForCurrentCase: (channel) =>
    set((state) => {
      const channels = [...state.chosenChannels];
      channels[state.currentCaseIndex] = channel;
      return { chosenChannels: channels };
    }),

  reset: () =>
    set({
      phase: 'idle',
      sessionId: null,
      cases: [],
      currentCaseIndex: 0,
      currentTurn: 0,
      conversations: [],
      scores: [],
      isLoading: false,
      error: null,
      chosenChannels: [],
    }),
}));
