'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { VoicePipeline } from '@/lib/voice/pipeline';
import type { PipelineState } from '@/lib/voice/types';
import { AudioVisualizer } from './AudioVisualizer';
import { LatencyIndicator } from './LatencyIndicator';
import { TranscriptOverlay } from './TranscriptOverlay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Case, ConversationMessage } from '@/types';

interface CallInterfaceProps {
  caseData: Case;
  onCallEnd: (conversation: ConversationMessage[]) => void;
  maxTurns: number;
}

export function CallInterface({ caseData, onCallEnd, maxTurns }: CallInterfaceProps) {
  const [state, setState] = useState<PipelineState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [latency, setLatency] = useState<{
    vadToStt: number;
    sttToLlmFirstToken: number;
    llmToTtsFirstByte: number;
    totalE2e: number;
  } | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [specHitRate, setSpecHitRate] = useState(0);
  const [ttsCacheHitRate, setTtsCacheHitRate] = useState(0);
  const [audioQualityWarning, setAudioQualityWarning] = useState<string | null>(null);

  const pipelineRef = useRef<VoicePipeline | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkTTSDoneRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnCountRef = useRef(0);
  const callEndedRef = useRef(false);
  const onCallEndRef = useRef(onCallEnd);
  onCallEndRef.current = onCallEnd;

  const doEndCall = useCallback(() => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;
    setCallEnded(true);

    // Clear all intervals
    if (checkTTSDoneRef.current) {
      clearInterval(checkTTSDoneRef.current);
      checkTTSDoneRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Get conversation from pipeline (single source of truth)
    const history = pipelineRef.current?.getConversationHistory() || [];
    const conversation: ConversationMessage[] = history.map((m) => ({
      role: m.role === 'agent' ? 'agent' : 'customer',
      content: m.content,
      timestamp: Date.now(),
    }));

    // Add opening message if pipeline history doesn't have it
    if (conversation.length === 0 || conversation[0].content !== caseData.openingMessage) {
      conversation.unshift({
        role: 'customer',
        content: caseData.openingMessage,
        timestamp: Date.now(),
      });
    }

    if (pipelineRef.current) {
      pipelineRef.current.stop();
      pipelineRef.current = null;
    }

    onCallEndRef.current(conversation);
  }, [caseData.openingMessage]);

  const startCall = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const pipeline = new VoicePipeline({
        onStateChange: (newState) => {
          setState(newState);
          if (newState === 'listening') {
            setAiResponse('');
          }
        },
        onInterimTranscript: (text) => {
          setInterimTranscript(text);
        },
        onFinalTranscript: (text) => {
          setFinalTranscript(text);
          setInterimTranscript('');
          turnCountRef.current += 1;
          setTurnCount(turnCountRef.current);
        },
        onAiResponseChunk: (textSoFar) => {
          setAiResponse(textSoFar);
          setFinalTranscript('');
          setInterimTranscript('');
        },
        onAiResponseDone: (fullText) => {
          setAiResponse(fullText);

          // Auto-end after max turns
          if (turnCountRef.current >= maxTurns) {
            // Wait for TTS to finish, then end
            checkTTSDoneRef.current = setInterval(() => {
              if (!pipelineRef.current || pipelineRef.current.getState() !== 'speaking') {
                if (checkTTSDoneRef.current) {
                  clearInterval(checkTTSDoneRef.current);
                  checkTTSDoneRef.current = null;
                }
                setTimeout(() => doEndCall(), 500);
              }
            }, 500);
          }
        },
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },
        onLatencyUpdate: (metrics) => {
          setLatency(metrics);
          // Update pipeline hit rates
          if (pipelineRef.current) {
            setSpecHitRate(pipelineRef.current.getSpeculationHitRate());
            setTtsCacheHitRate(pipelineRef.current.getTtsCacheHitRate());
          }
        },
        onAudioQualityWarning: (warning) => {
          setAudioQualityWarning(warning);
          // Clear warning after 5 seconds
          setTimeout(() => setAudioQualityWarning(null), 5000);
        },
        onError: (err) => {
          setError(err);
        },
      });

      await pipeline.start(caseData.scenario, caseData.difficulty);
      pipelineRef.current = pipeline;

      setAiResponse(caseData.openingMessage);
      await pipeline.speakText(caseData.openingMessage);

      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      setIsConnecting(false);
    } catch (err) {
      setError('Failed to start call. Check microphone permissions.');
      setIsConnecting(false);
    }
  }, [caseData, maxTurns, doEndCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pipelineRef.current) {
        pipelineRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (checkTTSDoneRef.current) clearInterval(checkTTSDoneRef.current);
    };
  }, []);

  // Wire mute button to pipeline
  useEffect(() => {
    if (pipelineRef.current) {
      pipelineRef.current.setMuted(isMuted);
    }
  }, [isMuted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const stateLabel: Record<PipelineState, string> = {
    idle: 'Ready — speak now',
    listening: 'Listening...',
    speculating: 'Processing...',
    turn_deciding: 'Processing...',
    processing: 'Thinking...',
    speaking: 'Customer speaking...',
    interrupted: 'Interrupted',
  };

  // Pre-call screen
  if (!pipelineRef.current && !isConnecting && !callEnded) {
    return (
      <div className="flex flex-col items-center py-10">
        <div className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl p-8 text-white text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-4xl shadow-lg shadow-green-500/30">
            📞
          </div>
          <h2 className="text-xl font-semibold mb-2">{caseData.title}</h2>
          <div className="flex justify-center gap-2 mb-4">
            <Badge variant="outline" className="border-gray-500 text-gray-300">
              {caseData.topic}
            </Badge>
            <Badge variant="outline" className="border-gray-500 text-gray-300">
              {caseData.difficulty}
            </Badge>
          </div>
          <p className="text-gray-400 text-sm mb-6">
            You&apos;ll speak with the customer via your microphone. The AI will respond with voice.
          </p>
          {error && (
            <div className="bg-red-900/50 text-red-300 rounded-lg px-4 py-2 text-sm mb-4">
              {error}
            </div>
          )}
          <Button
            onClick={startCall}
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-lg w-full"
          >
            Start Call
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-4">
      <div className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
        {/* Avatar */}
        <div className="text-center mb-4">
          <div
            className={`w-20 h-20 mx-auto mb-3 rounded-full flex items-center justify-center text-3xl transition-all duration-300 ${
              state === 'speaking'
                ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/40 scale-110'
                : state === 'listening'
                  ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/30'
                  : 'bg-gradient-to-br from-gray-600 to-gray-700'
            }`}
          >
            {state === 'speaking' ? '🗣️' : '👤'}
          </div>
          <div className="text-sm font-medium">{caseData.title}</div>
          <div className="text-xs text-gray-400 mt-1">
            {callEnded ? 'Call ended — scoring...' : stateLabel[state]}
          </div>
        </div>

        {/* Waveform */}
        <div className="flex justify-center mb-4">
          <AudioVisualizer
            audioLevel={audioLevel * 10}
            isActive={state === 'listening' || state === 'speaking'}
          />
        </div>

        {/* Timer & Turn counter */}
        <div className="flex justify-center gap-6 mb-4 text-sm">
          <div className="text-gray-400">⏱ {formatTime(callDuration)}</div>
          <div className="text-gray-400">
            Turn {Math.min(turnCount + 1, maxTurns)}/{maxTurns}
          </div>
        </div>

        {/* Transcript */}
        <div className="mb-4 flex justify-center">
          <TranscriptOverlay
            agentTranscript={interimTranscript || finalTranscript}
            aiTranscript={aiResponse}
            isInterim={!!interimTranscript}
          />
        </div>

        {/* Latency */}
        <div className="flex justify-center mb-4">
          <LatencyIndicator metrics={latency} speculationHitRate={specHitRate} ttsCacheHitRate={ttsCacheHitRate} />
        </div>

        {/* Controls */}
        {!callEnded && (
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              {isMuted ? '🔇 Muted' : '🔊'}
            </Button>
            <Button
              onClick={doEndCall}
              className="bg-red-500 hover:bg-red-600 text-white px-8"
            >
              End Call
            </Button>
          </div>
        )}

        {audioQualityWarning && (
          <div className="mt-3 bg-yellow-900/50 text-yellow-300 rounded-lg px-3 py-2 text-xs text-center">
            🎙️ {audioQualityWarning}
          </div>
        )}

        {error && (
          <div className="mt-3 bg-red-900/50 text-red-300 rounded-lg px-3 py-2 text-xs text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
