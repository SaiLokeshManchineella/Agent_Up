'use client';

import { useTrainingStore } from '@/lib/store/training-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Case } from '@/types';

interface CaseIntroProps {
  caseData: Case;
  caseNumber: number;
  totalCases: number;
}

const difficultyColors = {
  Beginner: 'bg-green-100 text-green-800',
  Intermediate: 'bg-yellow-100 text-yellow-800',
  Advanced: 'bg-red-100 text-red-800',
};

export function CaseIntro({ caseData, caseNumber, totalCases }: CaseIntroProps) {
  const { setPhase, addMessage, chosenChannels, currentCaseIndex, setChannelForCurrentCase, maxTurns } =
    useTrainingStore();

  const currentChannel = chosenChannels[currentCaseIndex] || 'chat';
  const isBothChannel = caseData.channel === 'both';

  const handleStart = (channel?: 'chat' | 'call') => {
    if (channel) {
      setChannelForCurrentCase(channel);
    }
    addMessage({
      role: 'customer',
      content: caseData.openingMessage,
      timestamp: Date.now(),
    });
    setPhase('simulation');
  };

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="text-sm text-gray-500 mb-4">
        Case {caseNumber} of {totalCases}
      </div>

      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{caseData.topic}</Badge>
            <Badge className={difficultyColors[caseData.difficulty]}>
              {caseData.difficulty}
            </Badge>
            <Badge variant="outline">
              {caseData.channel === 'chat'
                ? '💬 Chat'
                : caseData.channel === 'call'
                  ? '📞 Call'
                  : '💬📞 Chat or Call'}
            </Badge>
          </div>
          <CardTitle className="text-xl">{caseData.title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Scenario
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {caseData.scenario}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Customer&apos;s opening message
            </h3>
            <p className="text-gray-900 italic">
              &ldquo;{caseData.openingMessage}&rdquo;
            </p>
          </div>

          <div className="text-sm text-gray-500">
            You will have up to {maxTurns} turns to handle this customer.
          </div>

          {isBothChannel ? (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">
                Choose your channel:
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleStart('chat')}
                  variant="outline"
                  className="flex-1 h-14 text-base border-2 hover:border-blue-500 hover:bg-blue-50"
                  size="lg"
                >
                  💬 Chat
                </Button>
                <Button
                  onClick={() => handleStart('call')}
                  variant="outline"
                  className="flex-1 h-14 text-base border-2 hover:border-green-500 hover:bg-green-50"
                  size="lg"
                >
                  📞 Voice Call
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => handleStart()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              {caseData.channel === 'chat' ? '💬 Start Chat' : '📞 Start Call'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
