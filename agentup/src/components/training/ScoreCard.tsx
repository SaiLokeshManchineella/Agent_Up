'use client';

import { useTrainingStore } from '@/lib/store/training-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Case, ScoreResult } from '@/types';

interface ScoreCardProps {
  score: ScoreResult;
  caseData: Case;
  caseNumber: number;
  totalCases: number;
}

const criteriaLabels = [
  { key: 'empathy' as const, label: 'Empathy & Tone', icon: '💛', max: 25 },
  { key: 'accuracy' as const, label: 'Accuracy', icon: '🎯', max: 25 },
  { key: 'resolution' as const, label: 'Resolution', icon: '✅', max: 25 },
  { key: 'professionalism' as const, label: 'Professionalism', icon: '👔', max: 25 },
];

function getScoreColor(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'text-green-600';
  if (pct >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function getOverallColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

export function ScoreCard({ score, caseData, caseNumber, totalCases }: ScoreCardProps) {
  const { nextCase, setPhase, cases, currentCaseIndex } = useTrainingStore();

  const isLastCase = caseNumber === totalCases;

  const handleNext = () => {
    if (isLastCase) {
      setPhase('summary');
    } else {
      nextCase();
    }
  };

  return (
    <div className="flex flex-col items-center py-6 max-w-xl mx-auto">
      <div className="text-sm text-gray-500 mb-4">
        Case {caseNumber} of {totalCases} — Results
      </div>

      <Card className="w-full">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg">{caseData.title}</CardTitle>
          <div className={`text-5xl font-bold mt-2 ${getOverallColor(score.totalScore)}`}>
            {score.totalScore}
            <span className="text-lg text-gray-400">/100</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Score breakdown */}
          <div className="space-y-4">
            {criteriaLabels.map(({ key, label, icon, max }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">
                    {icon} {label}
                  </span>
                  <span className={`text-sm font-semibold ${getScoreColor(score[key].score, max)}`}>
                    {score[key].score}/{max}
                  </span>
                </div>
                <Progress value={(score[key].score / max) * 100} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">{score[key].note}</p>
              </div>
            ))}
          </div>

          {/* Feedback */}
          <div className="space-y-3 pt-4 border-t">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-sm font-medium text-green-800 mb-1">
                💪 Strength
              </div>
              <p className="text-sm text-green-700">{score.strength}</p>
            </div>

            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-sm font-medium text-amber-800 mb-1">
                📈 Area to Improve
              </div>
              <p className="text-sm text-amber-700">{score.improvement}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-800 mb-1">
                💡 Tip
              </div>
              <p className="text-sm text-blue-700">{score.tip}</p>
            </div>
          </div>

          <Button
            onClick={handleNext}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            {isLastCase ? 'View Session Summary' : `Next Case (${caseNumber + 1}/${totalCases})`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
