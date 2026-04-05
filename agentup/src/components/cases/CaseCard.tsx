'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Case } from '@/types';

interface CaseCardProps {
  caseData: Case;
}

const difficultyColors = {
  Beginner: 'bg-green-100 text-green-800',
  Intermediate: 'bg-yellow-100 text-yellow-800',
  Advanced: 'bg-red-100 text-red-800',
};

const channelIcons = {
  chat: '💬',
  call: '📞',
  both: '💬📞',
};

export function CaseCard({ caseData }: CaseCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 leading-tight">
            {caseData.title}
          </h3>
          <span className="text-lg ml-2">{channelIcons[caseData.channel]}</span>
        </div>

        <p className="text-xs text-gray-500 line-clamp-2 mb-3">
          {caseData.scenario}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {caseData.topic}
          </Badge>
          <Badge className={`text-xs ${difficultyColors[caseData.difficulty]}`}>
            {caseData.difficulty}
          </Badge>
          {caseData.isDefault && (
            <Badge variant="outline" className="text-xs text-gray-400">
              Default
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
