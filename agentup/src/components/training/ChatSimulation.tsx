'use client';

import { useState, useRef, useEffect } from 'react';
import { useTrainingStore } from '@/lib/store/training-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  } = useTrainingStore();

  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messages = conversations[currentCaseIndex] || [];

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

    // Add agent message
    addMessage({ role: 'agent', content: text, timestamp: Date.now() });
    incrementTurn();

    const newTurn = currentTurn + 1;

    // Check if this is the last turn
    if (newTurn >= maxTurns) {
      // Score the conversation
      await scoreConversation([...messages, { role: 'agent', content: text, timestamp: Date.now() }]);
      return;
    }

    // Get AI response
    setIsStreaming(true);
    setStreamingText('');

    try {
      // Build message history for OpenAI
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

      // Add customer response
      addMessage({ role: 'customer', content: fullText, timestamp: Date.now() });
      setStreamingText('');
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
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{caseData.title}</h2>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline">{caseData.topic}</Badge>
            <Badge variant="outline">💬 Chat</Badge>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          Turn {Math.min(currentTurn + 1, maxTurns)}/{maxTurns}
        </Badge>
      </div>

      {/* Chat messages */}
      <Card className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'agent' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'agent'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
              }`}
            >
              <div className="text-xs opacity-70 mb-1">
                {msg.role === 'agent' ? 'You' : 'Customer'}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Streaming text */}
        {streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
              <div className="text-xs opacity-70 mb-1">Customer</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{streamingText}</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="text-sm text-gray-500">Scoring your performance...</div>
          </div>
        )}

        <div ref={chatEndRef} />
      </Card>

      {/* Input area */}
      {currentTurn < maxTurns && !isLoading && (
        <div className="mt-4 flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your response as a call centre agent..."
            className="resize-none bg-white"
            rows={2}
            disabled={isStreaming}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="bg-blue-600 hover:bg-blue-700 text-white self-end"
          >
            Send
          </Button>
        </div>
      )}
    </div>
  );
}
