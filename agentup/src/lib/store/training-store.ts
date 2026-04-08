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
  wasTerminated: boolean;

  // Actions
  startSession: (cases: Case[]) => void;
  setPhase: (phase: TrainingPhase) => void;
  setSessionId: (id: string) => void;
  addMessage: (message: ConversationMessage) => void;
  setConversation: (index: number, messages: ConversationMessage[]) => void;
  incrementTurn: () => void;
  addScore: (score: ScoreResult) => void;
  nextCase: () => void;
  completeSession: () => Promise<void>;
  setStreak: (streak: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setChosenChannel: (channel: 'chat' | 'call', index?: number) => void;
  terminateSession: () => void;
  reset: () => void;
}

export const useTrainingStore = create<TrainingStore>((set, get) => ({
  phase: 'idle',
  sessionId: null,
  cases: [],
  currentCaseIndex: 0,
  currentTurn: 0,
  maxTurns: 5, // A "turn" is a full set (Agent + Customer)
  conversations: [],
  scores: [],
  streak: 0,
  isLoading: false,
  error: null,
  chosenChannels: [],
  wasTerminated: false,

  startSession: (cases) =>
    set({
      phase: 'intro',
      cases,
      currentCaseIndex: 0,
      currentTurn: 0,
      conversations: cases.map((c) => [{ 
        role: 'customer', 
        content: c.openingMessage, 
        timestamp: Date.now() 
      }]),
      scores: [],
      isLoading: false,
      error: null,
      chosenChannels: cases.map((c) =>
        c.channel === 'both' ? 'chat' : (c.channel as 'chat' | 'call')
      ),
      wasTerminated: false,
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

  setConversation: (index, messages) =>
    set((state) => {
      const conversations = [...state.conversations];
      conversations[index] = messages;
      return { conversations };
    }),

  incrementTurn: () =>
    set((state) => ({ currentTurn: state.currentTurn + 1 })),

  addScore: (score) =>
    set((state) => ({ scores: [...state.scores, score] })),

  nextCase: () => {
    const state = get();
    if (state.currentCaseIndex + 1 >= state.cases.length) {
      state.completeSession();
    } else {
      set({
        currentCaseIndex: state.currentCaseIndex + 1,
        currentTurn: 0,
        phase: 'intro',
        error: null,
      });
    }
  },

  completeSession: async () => {
    const state = get();
    if (state.scores.length === 0) {
      set({ phase: 'summary' });
      return;
    }
    set({ isLoading: true, error: null });

    const totalScore = Math.round(
      state.scores.reduce((acc, curr) => acc + curr.totalScore, 0) / state.scores.length
    );

    const payload = {
      totalScore,
      casesCompleted: state.scores.length,
      sessionCases: state.scores.map((score, i) => ({
        caseId: state.cases[i].id,
        channel: state.chosenChannels[i],
        score: score.totalScore,
        empathyScore: score.empathy.score,
        accuracyScore: score.accuracy.score,
        resolutionScore: score.resolution.score,
        professionalismScore: score.professionalism.score,
        feedback: score.tip || '',
        strength: score.strength || '',
        improvement: score.improvement || '',
        conversationLog: state.conversations[i] || [],
        turnCount: (state.conversations[i] || []).filter(m => m.role === 'agent').length,
        avgLatencyMs: null
      }))
    };

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save session');
      set({ phase: 'summary', isLoading: false });
    } catch (error) {
      console.error('Failed to commit session:', error);
      set({ phase: 'summary', isLoading: false, error: 'Warning: Failed to persist session data. Your dashboard may be out of sync.' });
    }
  },

  setStreak: (streak) => set({ streak }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  setChosenChannel: (channel, index) =>
    set((state) => {
      const channels = [...state.chosenChannels];
      const targetIndex = index ?? state.currentCaseIndex;
      channels[targetIndex] = channel;
      return { chosenChannels: channels };
    }),

  terminateSession: () => set({ 
    phase: 'scoring', 
    wasTerminated: true,
    isLoading: false 
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
      wasTerminated: false,
    }),
}));
