'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { VoicePipeline } from '@/lib/voice/pipeline';
import type { PipelineState } from '@/lib/voice/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  PhoneOff, 
  Mic, 
  VolumeX, 
  Activity, 
  Radio,
  User as UserIcon,
  Bot,
  ShieldAlert,
  Clock,
  Waves
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Case, ConversationMessage } from '@/types';

interface CallInterfaceProps {
  caseData: Case;
  onCallEnd: (conversation: ConversationMessage[]) => void;
  maxTurns: number;
}

export function CallInterface({ caseData, onCallEnd, maxTurns }: CallInterfaceProps) {
  const [state, setState] = useState<PipelineState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [history, setHistory] = useState<ConversationMessage[]>([]);
  const [audioQualityWarning, setAudioQualityWarning] = useState<string | null>(null);

  const pipelineRef = useRef<VoicePipeline | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkTTSDoneRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const turnCountRef = useRef(0);
  const callEndedRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  }, [history, interimTranscript]);

  const doEndCall = useCallback(() => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;
    setCallEnded(true);

    if (checkTTSDoneRef.current) {
      clearInterval(checkTTSDoneRef.current);
      checkTTSDoneRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const finalHistory = pipelineRef.current?.getConversationHistory() || [];
    const conversation: ConversationMessage[] = finalHistory.map((m) => ({
      role: m.role === 'agent' ? 'agent' : 'customer',
      content: m.content,
      timestamp: Date.now(),
    }));

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
      setIsConnected(false);
    }

    onCallEnd(conversation);
  }, [caseData.openingMessage, onCallEnd]);

  const startCall = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setHistory([{ 
        role: 'customer', 
        content: caseData.openingMessage, 
        timestamp: Date.now() 
    }]);

    try {
      const pipeline = new VoicePipeline({
        onStateChange: setState,
        onInterimTranscript: setInterimTranscript,
        onFinalTranscript: (text) => {
          setInterimTranscript('');
          setHistory(prev => [...prev, { role: 'agent', content: text, timestamp: Date.now() }]);
        },
        onAiResponseChunk: () => {},
        onAiResponseDone: (fullText) => {
          setHistory(prev => [...prev, { role: 'customer', content: fullText, timestamp: Date.now() }]);
          
          turnCountRef.current += 1;
          setTurnCount(turnCountRef.current);

          if (turnCountRef.current >= maxTurns) {
            // Immediately stop listening to prevent any extra AI responses during wrap-up
            pipelineRef.current?.setMuted(true);
            
            checkTTSDoneRef.current = setInterval(() => {
              if (!pipelineRef.current || pipelineRef.current.getState() !== 'speaking') {
                if (checkTTSDoneRef.current) {
                  clearInterval(checkTTSDoneRef.current);
                  checkTTSDoneRef.current = null;
                }
                setTimeout(() => doEndCall(), 1500); 
              }
            }, 500);
          }
        },
        onAudioLevel: setAudioLevel,
        onLatencyUpdate: () => {},
        onAudioQualityWarning: (warning) => {
          setAudioQualityWarning(warning);
          setTimeout(() => setAudioQualityWarning(null), 5000);
        },
        onError: setError,
      });

      await pipeline.start(caseData.scenario, caseData.difficulty, maxTurns);
      pipelineRef.current = pipeline;
      setIsConnected(true);
      await pipeline.speakText(caseData.openingMessage);

      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      setIsConnecting(false);
    } catch (err) {
      setError('Live simulation session failed to initialize.');
      setIsConnecting(false);
    }
  }, [caseData, maxTurns, doEndCall]);

  useEffect(() => {
    return () => {
      if (pipelineRef.current) pipelineRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center w-full h-[calc(100vh-14rem)] mt-12 max-w-5xl mx-auto px-4 animate-in fade-in duration-700">
      <Card className="w-full flex-1 border-border/60 bg-white shadow-2xl rounded-2xl flex flex-col relative overflow-hidden">
        {/* Refined Case Header */}
        <div className="flex justify-between items-center px-10 py-6 border-b border-border/40 bg-muted/20 relative z-30">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Live Training Session</span>
              <span className="text-xl font-bold tracking-tight">{caseData.title}</span>
            </div>
            <div className="h-10 w-px bg-border/60" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Difficulty</span>
              <Badge variant="outline" className="bg-white border-border/60 text-foreground text-[10px] font-bold px-3 py-1 uppercase tracking-widest">
                {caseData.difficulty} Benchmarking
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Session Duration</span>
                <span className="text-2xl font-bold tracking-tight text-primary font-mono">{formatTime(callDuration)}</span>
             </div>
             <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
                <Radio className="w-5 h-5 animate-pulse" />
             </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
            {/* Live Transcript Panel */}
            <div className="relative w-full md:w-[45%] border-r border-border/40 h-full flex flex-col bg-muted/5">
                <div className="p-4 border-b border-border/40 flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Audit Transcript</span>
                </div>
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative"
                >
                    {history.map((msg, i) => (
                        <motion.div
                            key={`${i}-${msg.timestamp}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex flex-col gap-1.5"
                        >
                            <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] ${msg.role === 'agent' ? 'text-primary' : 'text-muted-foreground/60'}`}>
                                {msg.role === 'agent' ? <UserIcon className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                {msg.role === 'agent' ? 'Professional Agent' : 'Customer Simulation'}
                            </div>
                            <p className={`text-sm leading-relaxed font-medium ${msg.role === 'agent' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {msg.content}
                            </p>
                        </motion.div>
                    ))}
                    {interimTranscript && (
                        <div className="flex flex-col opacity-50 border-l-2 border-primary/20 pl-4">
                            <span className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">Processing Audio...</span>
                            <p className="text-sm italic font-medium">{interimTranscript}</p>
                        </div>
                    )}
                    <div className="h-10" />
                </div>
            </div>

            {/* Interaction Visualization */}
            <div className="flex-1 flex flex-col items-center justify-center p-12 relative bg-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.01)_0%,transparent_70%)]" />
                
                <div className="relative w-64 h-64 flex items-center justify-center">
                    <motion.div
                        animate={{ 
                            scale: 1 + audioLevel * 0.4,
                            opacity: isConnected ? 1 : 0.2
                        }}
                        className={`absolute inset-0 rounded-full border border-primary/10 transition-colors ${
                          state === 'speaking' ? 'bg-primary/5 shadow-[0_0_80px_rgba(0,0,0,0.03)]' : 
                          state === 'listening' ? 'bg-emerald-500/5 shadow-[0_0_80px_rgba(16,185,129,0.03)]' : ''
                        }`}
                    />
                    
                    <motion.div
                        animate={{ 
                            scale: 1 + audioLevel * 1.2,
                            opacity: isConnected ? 0.3 : 0.05
                        }}
                        className="absolute inset-6 rounded-full border border-primary/20"
                    />

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={state}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex flex-col items-center"
                            >
                                <div className="flex items-end justify-center gap-[3px] h-12 mb-4">
                                    {[...Array(11)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            animate={{ 
                                                height: isConnected ? 
                                                    (state === 'speaking' || state === 'listening' ? 
                                                        `${Math.max(4, audioLevel * (40 + Math.random() * 40) * (1 - Math.abs(i - 5) / 6))}px` : 
                                                        '4px') : 
                                                    '4px'
                                            }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                            className={`w-[3px] rounded-full sm:w-[4px] ${
                                              state === 'listening' ? 'bg-emerald-500' : 
                                              state === 'speaking' ? 'bg-primary' : 'bg-muted-foreground/30'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-[0.25em] ${
                                  state === 'listening' ? 'text-emerald-500' : 
                                  state === 'speaking' ? 'text-primary' : 'text-muted-foreground/40'
                                }`}>{state}</span>
                                
                                <div className="h-1.5 w-16 bg-muted rounded-full mt-4 overflow-hidden border border-border/40">
                                     <motion.div 
                                        animate={{ x: isConnected ? [-64, 64] : 0 }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                        className={`h-full w-1/2 ${state === 'listening' ? 'bg-emerald-500/40' : 'bg-primary/40'}`} 
                                     />
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                <div className="mt-16 flex flex-col items-center text-center">
                   <div className="flex flex-wrap justify-center gap-3">
                      <Badge variant="outline" className="bg-muted/30 border-border/60 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{caseData.topic} Interaction</Badge>
                      <Badge variant="outline" className="bg-primary/5 border-primary/20 text-[10px] font-bold text-primary uppercase tracking-wider">Turn {turnCount + 1} of {maxTurns}</Badge>
                   </div>
                </div>
            </div>
        </div>

        {/* Global Action Bar */}
        <div className="p-8 border-t border-border/40 bg-muted/10 flex items-center justify-between z-40">
           <div className="flex items-center gap-6">
              <Button
                 variant="outline"
                 size="icon"
                 onClick={() => setIsMuted(!isMuted)}
                 className={`w-14 h-14 rounded-xl border-border/80 transition-all ${
                    isMuted ? 'text-rose-600 border-rose-200 bg-rose-50 shadow-inner' : 'text-muted-foreground bg-white shadow-sm hover:text-foreground'
                 }`}
              >
                 {isMuted ? <VolumeX className="w-5 h-5" /> : <Mic className="w-5 h-5" strokeWidth={1.5} />}
              </Button>
              <div className="flex flex-col gap-2">
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Input Sensitivity</span>
                 <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden border border-border/40">
                    <motion.div 
                        animate={{ width: `${audioLevel * 100}%` }}
                        className="h-full bg-primary" 
                    />
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-6">
              {!callEnded && (
                <Button
                    variant="destructive"
                    onClick={doEndCall}
                    className="h-14 px-10 rounded-xl font-bold transition-all shadow-lg shadow-rose-900/10 active:hover:scale-[0.98]"
                >
                    <PhoneOff className="w-5 h-5 mr-3" />
                    Terminate Connection
                </Button>
              )}
              
              {!isConnected && !isConnecting && !callEnded && (
                <Button
                    onClick={startCall}
                    className="h-14 px-16 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:hover:scale-[0.99]"
                >
                    <Clock className="w-5 h-5 mr-3" />
                    Establish Simulation
                </Button>
              )}
           </div>

           <div className="flex flex-col items-end gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Network Integrity</span>
              <div className="flex items-center gap-2">
                 <div className="flex gap-1.5">
                    {[1,2,3].map(i => <div key={i} className="w-1.5 h-3 bg-primary/20 rounded-full" />)}
                 </div>
                 <Activity className="w-4 h-4 text-primary opacity-60 animate-pulse" />
              </div>
           </div>
        </div>

        {audioQualityWarning && (
            <div className="absolute top-32 left-1/2 -translate-x-1/2 z-50 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] px-6 py-2 rounded-full flex items-center gap-3 font-bold shadow-lg shadow-amber-900/5 animate-in slide-in-from-top-4">
                <ShieldAlert className="w-4 h-4" /> Signal Notice: {audioQualityWarning}
            </div>
        )}
      </Card>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
