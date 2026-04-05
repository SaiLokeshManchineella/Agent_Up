'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SessionHistoryItem } from '@/types';

interface SessionHistoryProps {
  data: SessionHistoryItem[];
}

export function SessionHistory({ data }: SessionHistoryProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-500">
            Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Your session history will appear here
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-500">
          Last 10 Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {item.caseTitle}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {item.channel === 'chat' ? '💬' : '📞'} {item.channel}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {item.caseTopic}
                  </Badge>
                </div>
              </div>
              <div
                className={`text-lg font-bold ml-4 ${
                  item.totalScore >= 80
                    ? 'text-green-600'
                    : item.totalScore >= 60
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {item.totalScore}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
