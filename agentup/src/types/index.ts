// ==================== CASE TYPES ====================

export type Channel = 'chat' | 'call' | 'both';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
/** Built-in topics. Custom topics are allowed as any string via the case form. */
export type BuiltInTopic = 'Billing' | 'De-escalation' | 'Technical' | 'Retention';
export type Topic = BuiltInTopic | (string & {});

export interface Case {
  id: string;
  title: string;
  scenario: string;
  openingMessage: string;
  channel: Channel;
  topic: Topic;
  difficulty: Difficulty;
  isDefault: boolean;
  createdAt: string;
}

export interface CaseFormData {
  title: string;
  scenario: string;
  openingMessage: string;
  channel: Channel;
  topic: string;
  difficulty: Difficulty;
}

// ==================== SESSION TYPES ====================

export interface Session {
  id: string;
  date: string;
  totalScore: number;
  casesCompleted: number;
  createdAt: string;
}

export interface SessionCase {
  id: string;
  sessionId: string;
  caseId: string;
  channel: 'chat' | 'call';
  score: number;
  empathyScore: number;
  accuracyScore: number;
  resolutionScore: number;
  professionalismScore: number;
  feedback: string;
  strength: string;
  improvement: string;
  conversationLog: string;
  turnCount: number;
  avgLatencyMs: number | null;
  completedAt: string;
}

export interface SessionWithCases extends Session {
  cases: (SessionCase & { caseTitle: string; caseTopic: string })[];
}

// ==================== CHAT TYPES ====================

export type MessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface ConversationMessage {
  role: 'agent' | 'customer';
  content: string;
  timestamp: number;
}

// ==================== SCORING TYPES ====================

export interface ScoreCriterion {
  score: number;
  note: string;
}

export interface ScoreResult {
  empathy: ScoreCriterion;
  accuracy: ScoreCriterion;
  resolution: ScoreCriterion;
  professionalism: ScoreCriterion;
  totalScore: number;
  strength: string;
  improvement: string;
  tip: string;
}

// ==================== TRAINING STATE TYPES ====================

export type TrainingPhase = 'idle' | 'intro' | 'simulation' | 'scoring' | 'summary';

export interface TrainingState {
  phase: TrainingPhase;
  sessionId: string | null;
  cases: Case[];
  currentCaseIndex: number;
  currentTurn: number;
  maxTurns: number;
  conversations: ConversationMessage[][];
  scores: ScoreResult[];
  streak: number;
}

// ==================== DASHBOARD TYPES ====================

export interface DailyScore {
  date: string;
  avgScore: number;
}

export interface TopicScore {
  topic: string;
  avgScore: number;
  count: number;
}

export interface ChannelScore {
  channel: 'chat' | 'call';
  avgScore: number;
  count: number;
}

export interface DashboardStats {
  currentStreak: number;
  sessionsThisWeek: number;
  topSkill: string | null;
  skillToImprove: string | null;
}

export interface SessionHistoryItem {
  id: string;
  date: string;
  totalScore: number;
  caseTitle: string;
  caseTopic: string;
  channel: 'chat' | 'call';
}

// ==================== VOICE PIPELINE TYPES ====================

export type ConversationFSMState =
  | 'idle'
  | 'listening'
  | 'speculating'
  | 'turn_deciding'
  | 'processing'
  | 'speaking'
  | 'interrupted';

export interface LatencyMetrics {
  vadToStt: number;
  sttToLlmFirstToken: number;
  llmToTtsFirstByte: number;
  totalE2e: number;
  perceivedE2e: number;
  ttsCacheHitRate: number;
  speculationHitRate: number;
}

export interface VoicePipelineConfig {
  sttModel: string;
  llmModel: string;
  ttsVoice: string;
  vadSpeechThreshold: number;
  vadSilenceDurationMs: number;
  speculationSimilarityThreshold: number;
}
