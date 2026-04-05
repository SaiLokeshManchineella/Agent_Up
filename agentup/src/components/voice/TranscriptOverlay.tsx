'use client';

interface TranscriptOverlayProps {
  agentTranscript: string;
  aiTranscript: string;
  isInterim: boolean;
}

export function TranscriptOverlay({
  agentTranscript,
  aiTranscript,
  isInterim,
}: TranscriptOverlayProps) {
  return (
    <div className="w-full max-w-md space-y-2 min-h-[80px]">
      {agentTranscript && (
        <div className="text-right">
          <span className="text-xs text-gray-400 block mb-0.5">You</span>
          <span
            className={`inline-block rounded-xl rounded-br-sm px-3 py-2 text-sm ${
              isInterim
                ? 'bg-blue-100 text-blue-700 opacity-70'
                : 'bg-blue-600 text-white'
            }`}
          >
            {agentTranscript}
          </span>
        </div>
      )}
      {aiTranscript && (
        <div className="text-left">
          <span className="text-xs text-gray-400 block mb-0.5">Customer</span>
          <span className="inline-block rounded-xl rounded-bl-sm bg-gray-200 px-3 py-2 text-sm text-gray-900">
            {aiTranscript}
          </span>
        </div>
      )}
    </div>
  );
}
