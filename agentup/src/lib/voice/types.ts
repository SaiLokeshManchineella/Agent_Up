export type PipelineState =
  | 'idle'
  | 'listening'
  | 'speculating'
  | 'turn_deciding'
  | 'processing'
  | 'speaking'
  | 'interrupted';

export interface PipelineEvent {
  type:
    | 'state_change'
    | 'transcript_interim'
    | 'transcript_final'
    | 'ai_response'
    | 'audio_start'
    | 'audio_end'
    | 'error'
    | 'latency_update'
    | 'turn_complete';
  data?: unknown;
}

export interface LatencyMetrics {
  vadToStt: number;
  sttToLlmFirstToken: number;
  llmToTtsFirstByte: number;
  totalE2e: number;
}

export interface VoiceTurn {
  agentTranscript: string;
  customerResponse: string;
  latency: LatencyMetrics | null;
}
