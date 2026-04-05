'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Case, Channel, Difficulty } from '@/types';

interface CaseFormProps {
  onClose: () => void;
  onCreated: (c: Case) => void;
}

export function CaseForm({ onClose, onCreated }: CaseFormProps) {
  const [title, setTitle] = useState('');
  const [scenario, setScenario] = useState('');
  const [openingMessage, setOpeningMessage] = useState('');
  const [channel, setChannel] = useState<Channel>('chat');
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const predefinedTopics = ['Billing', 'De-escalation', 'Technical', 'Retention'];
  const selectedTopic = topic === '__custom' ? customTopic : topic;

  const isValid =
    title.trim() &&
    scenario.trim() &&
    openingMessage.trim() &&
    selectedTopic.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          scenario: scenario.trim(),
          openingMessage: openingMessage.trim(),
          channel,
          topic: selectedTopic.trim(),
          difficulty,
        }),
      });

      const newCase: Case = await res.json();
      onCreated(newCase);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Case</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short name for the scenario"
            />
          </div>

          <div>
            <Label htmlFor="scenario">Customer Scenario</Label>
            <Textarea
              id="scenario"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="Describe the customer's situation..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="opening">Customer Opening Message</Label>
            <Textarea
              id="opening"
              value={openingMessage}
              onChange={(e) => setOpeningMessage(e.target.value)}
              placeholder="The first thing the customer says..."
              rows={2}
            />
          </div>

          <div>
            <Label>Channel</Label>
            <div className="flex gap-2 mt-1">
              {(['chat', 'call', 'both'] as Channel[]).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannel(ch)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    channel === ch
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {ch === 'chat' ? '💬 Chat' : ch === 'call' ? '📞 Call' : '💬📞 Both'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Topic</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {predefinedTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTopic(t);
                    setCustomTopic('');
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    topic === t
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {t}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTopic('__custom')}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  topic === '__custom'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                + Custom
              </button>
            </div>
            {topic === '__custom' && (
              <Input
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Enter custom topic..."
                className="mt-2"
              />
            )}
          </div>

          <div>
            <Label>Difficulty</Label>
            <div className="flex gap-2 mt-1">
              {(['Beginner', 'Intermediate', 'Advanced'] as Difficulty[]).map(
                (d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      difficulty === d
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {d}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Creating...' : 'Create Case'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
