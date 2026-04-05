'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChannelScore } from '@/types';

interface ChannelComparisonProps {
  data: ChannelScore[];
}

export function ChannelComparison({ data }: ChannelComparisonProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-500">
            Chat vs Call
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Complete sessions in both channels to compare
        </CardContent>
      </Card>
    );
  }

  const chatScore = data.find((d) => d.channel === 'chat');
  const callScore = data.find((d) => d.channel === 'call');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-500">
          Chat vs Call
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <ChannelCard
            icon="💬"
            label="Chat"
            score={chatScore ? Math.round(chatScore.avgScore) : null}
            count={chatScore?.count || 0}
            color="blue"
          />
          <ChannelCard
            icon="📞"
            label="Call"
            score={callScore ? Math.round(callScore.avgScore) : null}
            count={callScore?.count || 0}
            color="green"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ChannelCard({
  icon,
  label,
  score,
  count,
  color,
}: {
  icon: string;
  label: string;
  score: number | null;
  count: number;
  color: 'blue' | 'green';
}) {
  const bg = color === 'blue' ? 'bg-blue-50' : 'bg-green-50';
  const textColor = color === 'blue' ? 'text-blue-600' : 'text-green-600';

  return (
    <div className={`flex-1 rounded-xl ${bg} p-6 text-center`}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${textColor}`}>
        {score !== null ? score : '—'}
      </div>
      <div className="text-xs text-gray-400 mt-1">
        {count} session{count !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
