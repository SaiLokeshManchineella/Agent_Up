'use client';

import { useTrainingStore } from '@/lib/store/training-store';
import { CallInterface } from '@/components/voice/CallInterface';
import type { Case, ConversationMessage } from '@/types';

interface CallSimulationProps {
  caseData: Case;
}

export function CallSimulation({ caseData }: CallSimulationProps) {
  const {
    maxTurns,
    addMessage,
    setConversation,
    setPhase,
    addScore,
    setLoading,
    conversations,
    currentCaseIndex,
    terminateSession,
  } = useTrainingStore();

  const handleCallEnd = async (conversation: ConversationMessage[]) => {
    // Set final conversation history in store
    setConversation(currentCaseIndex, conversation);

    // Calculate agent turns
    const agentTurns = conversation.filter(m => m.role === 'agent').length;

    if (agentTurns < maxTurns) {
      terminateSession();
      return;
    }

    // Score the conversation
    setLoading(true);
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: caseData.scenario,
          difficulty: caseData.difficulty,
          conversation,
        }),
      });

      const score = await res.json();
      addScore(score);
      setPhase('scoring');
    } catch (error) {
      console.error('Scoring error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CallInterface
      caseData={caseData}
      onCallEnd={handleCallEnd}
      maxTurns={maxTurns}
    />
  );
}
