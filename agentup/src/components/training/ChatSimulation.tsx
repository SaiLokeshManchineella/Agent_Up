'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTrainingStore } from '@/lib/store/training-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, Bot, User as UserIcon, Sparkles, Activity, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Case, ConversationMessage, ChatMessage } from '@/types';

interface ChatSimulationProps {
  caseData: Case;
}

export function ChatSimulation({ caseData }: ChatSimulationProps) {
  const {
    conversations,
    currentCaseIndex,
    currentTurn,
    maxTurns,
    addMessage,
    incrementTurn,
    setPhase,
    addScore,
    setLoading,
    isLoading,
    terminateSession,
  } = useTrainingStore();

  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messages = useMemo(() => conversations[currentCaseIndex] || [], [conversations, currentCaseIndex]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [isStreaming]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');
    addMessage({ role: 'agent', content: text, timestamp: Date.now() });

    setIsStreaming(true);
    setStreamingText('');

    try {
      const chatMessages: ChatMessage[] = [];
      const allMessages = [...messages, { role: 'agent' as const, content: text, timestamp: Date.now() }];

      for (const msg of allMessages) {
        chatMessages.push({
          role: msg.role === 'agent' ? 'user' : 'assistant',
          content: msg.content,
        });
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          scenario: caseData.scenario,
          difficulty: caseData.difficulty,
          channel: 'chat',
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let lineBuffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              fullText += parsed.text;
              setStreamingText(fullText);
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      const aiMsg = { role: 'customer' as const, content: fullText, timestamp: Date.now() };
      addMessage(aiMsg);
      setStreamingText('');
      
      incrementTurn();
      const nextTurn = currentTurn + 1;

      if (nextTurn >= maxTurns) {
        await scoreConversation([...allMessages, aiMsg]);
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  const scoreConversation = async (allMessages: ConversationMessage[]) => {
    setLoading(true);
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: caseData.scenario,
          difficulty: caseData.difficulty,
          conversation: allMessages,
        }),
      });

      const score = await res.json();
      addScore(score);
      setPhase('scoring');
    } catch (error) {
      console.error('Scoring error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] max-w-5xl mx-auto px-4 mt-12 animate-in fade-in duration-700">
      {/* Refined Header */}
      <div className="flex items-center justify-between mb-8 px-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Session Active</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{caseData.title}</h2>
        </div>

        <div className="flex items-center gap-6">
           <Button 
             variant="ghost" 
             size="sm"
             onClick={() => {
               if (confirm('Are you sure you want to end this scenario early? No score will be generated.')) {
                 terminateSession();
               }
             }}
             className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors"
           >
             End Session Early
           </Button>
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Status</span>
              <span className="text-sm font-bold text-primary flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Turn {currentTurn + 1} of {maxTurns}
              </span>
           </div>
           <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
              <Activity className="w-5 h-5" strokeWidth={1.5} />
           </div>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col bg-white border-border/60 shadow-xl rounded-2xl relative">
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar relative z-10">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={`${i}-${msg.timestamp}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex w-full ${msg.role === 'agent' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex flex-col gap-2 max-w-[70%]`}>
                  <div className={`flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider ${
                    msg.role === 'agent' ? 'flex-row-reverse' : ''
                  }`}>
                    {msg.role === 'agent' ? <><UserIcon className="w-3 h-3" strokeWidth={2.5} /> Professional Agent</> : <><Bot className="w-3 h-3" strokeWidth={2.5} /> Customer Interaction</>}
                  </div>
                  
                  <div className={`p-4 rounded-2xl shadow-sm border ${
                    msg.role === 'agent'
                      ? 'bg-primary text-primary-foreground border-primary rounded-tr-none'
                      : 'bg-muted/50 border-border/60 text-foreground rounded-tl-none font-medium'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex flex-col gap-2 max-w-[70%]">
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider animate-pulse">
                  <Sparkles className="w-3 h-3 text-primary" /> Processing Sentiment...
                </div>
                <div className="bg-muted/30 border border-border/40 p-4 rounded-2xl rounded-tl-none font-medium text-muted-foreground italic">
                  <p className="text-sm">{streamingText || "Customer is typing..."}</p>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} className="h-4" />
        </div>

        {/* Professional Input Console */}
        {currentTurn < maxTurns && !isLoading && (
          <div className="p-6 bg-muted/20 border-t border-border/60 relative z-20">
            <div className="max-w-4xl mx-auto flex gap-4 items-end">
              <div className="relative flex-1">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Draft your professional response..."
                  className="rounded-xl border-border bg-white focus-visible:ring-primary/20 min-h-[50px] max-h-[200px] px-6 py-4 text-sm font-medium shadow-none resize-none transition-all"
                  rows={1}
                  disabled={isStreaming}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                size="lg"
                className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/10 transition-all hover:scale-[1.01] active:hover:scale-[0.99]"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit
              </Button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
             <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
             <div className="font-bold text-lg tracking-tight">Processing Diagnostic Data</div>
             <p className="text-sm text-muted-foreground font-medium mt-1">Analyzing conversation mastery and behavioral markers...</p>
          </div>
        )}
      </Card>
    </div>
  );
}
