'use client';

interface LatencyIndicatorProps {
  metrics: {
    vadToStt: number;
    sttToLlmFirstToken: number;
    llmToTtsFirstByte: number;
    totalE2e: number;
    perceivedE2e?: number;
    speculationUsed?: boolean;
    ttsCacheHit?: boolean;
  } | null;
  speculationHitRate?: number;
  ttsCacheHitRate?: number;
}

export function LatencyIndicator({
  metrics,
  speculationHitRate,
  ttsCacheHitRate,
}: LatencyIndicatorProps) {
  if (!metrics) return null;

  const getColor = (ms: number) => {
    if (ms < 1000) return 'text-green-400';
    if (ms < 2000) return 'text-yellow-400';
    return 'text-red-400';
  };

  const displayE2e = metrics.perceivedE2e || metrics.totalE2e;

  return (
    <div className="flex items-center gap-3 text-xs font-mono flex-wrap justify-center">
      <div className={getColor(displayE2e)}>
        E2E: {displayE2e}ms
        {metrics.speculationUsed && (
          <span className="text-purple-400 ml-1" title="Speculative response used">
            ⚡
          </span>
        )}
        {metrics.ttsCacheHit && (
          <span className="text-cyan-400 ml-1" title="TTS cache hit">
            💾
          </span>
        )}
      </div>
      <div className="text-gray-500">|</div>
      <div className="text-gray-400">STT: {metrics.vadToStt}ms</div>
      <div className="text-gray-400">LLM: {metrics.sttToLlmFirstToken}ms</div>
      <div className="text-gray-400">TTS: {metrics.llmToTtsFirstByte}ms</div>
      {(speculationHitRate !== undefined && speculationHitRate > 0) ||
      (ttsCacheHitRate !== undefined && ttsCacheHitRate > 0) ? (
        <>
          <div className="text-gray-500">|</div>
          {speculationHitRate !== undefined && speculationHitRate > 0 && (
            <div className="text-purple-400">Spec: {speculationHitRate}%</div>
          )}
          {ttsCacheHitRate !== undefined && ttsCacheHitRate > 0 && (
            <div className="text-cyan-400">Cache: {ttsCacheHitRate}%</div>
          )}
        </>
      ) : null}
    </div>
  );
}
