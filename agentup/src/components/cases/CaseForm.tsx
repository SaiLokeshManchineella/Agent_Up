'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Phone, MessagesSquare, CheckCircle, Info, Rocket, Sparkles, Brain } from 'lucide-react';
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
    title.trim().length >= 3 &&
    scenario.trim().length >= 10 &&
    openingMessage.trim().length >= 5 &&
    selectedTopic.trim().length >= 2;

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-border shadow-2xl p-0 overflow-hidden bg-white">
        <div className="h-1.5 bg-primary w-full" />
        
        <div className="p-8">
          <DialogHeader className="mb-8">
            <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest mb-2">
              <Brain className="w-4 h-4" strokeWidth={1.5} />
              Scenario Configuration
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">Create Training Scenario</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground font-medium mt-1">
              Define the behavioral and contextual parameters for this simulation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Scenario Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Complex Billing Dispute"
                  className="rounded-xl border-border focus:ring-1 focus:ring-primary/20 transition-all font-semibold h-11"
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subject Category</Label>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={topic === '__custom' ? '__custom' : predefinedTopics.includes(topic) ? topic : topic ? '__custom' : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__custom') {
                        setTopic('__custom');
                      } else {
                        setTopic(val);
                        setCustomTopic('');
                      }
                    }}
                    className="w-full rounded-xl border border-border bg-card px-4 h-11 text-sm text-foreground font-semibold focus:ring-1 focus:ring-primary/20 outline-none transition-all cursor-pointer shadow-sm"
                  >
                    <option value="" disabled>Select Category...</option>
                    {predefinedTopics.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="__custom">+ Custom Category</option>
                  </select>
                </div>
                {topic === '__custom' && (
                  <Input
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="Enter custom category name..."
                    className="rounded-xl border-border font-semibold mt-2 animate-in fade-in slide-in-from-top-1 h-11"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="scenario" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customer Backstory & Intent</Label>
                <Info className="w-3 h-3 text-muted-foreground/40" />
              </div>
              <Textarea
                id="scenario"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="Describe the customer's motivation, emotional state, and any critical constraints..."
                className="rounded-xl border-border focus:ring-1 focus:ring-primary/20 transition-all font-medium resize-none min-h-[120px]"
                rows={4}
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="opening" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Opening Inquiry / Greeting</Label>
              <div className="relative">
                <Textarea
                  id="opening"
                  value={openingMessage}
                  onChange={(e) => setOpeningMessage(e.target.value)}
                  placeholder="The first sentence spoken or typed by the customer..."
                  className="rounded-xl border-border focus:ring-1 focus:ring-primary/20 transition-all font-medium bg-muted/20 px-4 py-3 min-h-[80px]"
                  rows={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Interaction Channel</Label>
                <div className="flex gap-2">
                  {(['chat', 'call', 'both'] as Channel[]).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setChannel(ch)}
                      className={`flex-1 flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
                        channel === ch
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : 'border-border bg-white hover:border-border text-muted-foreground'
                      }`}
                    >
                      {ch === 'chat' ? <MessageSquare className="w-5 h-5" strokeWidth={1.5} /> : ch === 'call' ? <Phone className="w-5 h-5" strokeWidth={1.5} /> : <MessagesSquare className="w-5 h-5" strokeWidth={1.5} />}
                      <span className="text-[10px] font-bold uppercase tracking-wider capitalize">{ch}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Difficulty Benchmark</Label>
                <div className="flex gap-2">
                  {(['Beginner', 'Intermediate', 'Advanced'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 rounded-xl border px-3 h-14 text-[10px] font-bold uppercase tracking-widest transition-all ${
                        difficulty === d
                          ? d === 'Beginner' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 
                            d === 'Intermediate' ? 'border-amber-500 bg-amber-50 text-amber-700' : 
                            'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-border bg-white text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1 h-12 rounded-xl font-bold text-muted-foreground hover:text-foreground"
              >
                Discard
              </Button>
              <Button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="flex-[2] h-12 rounded-xl font-bold shadow-lg shadow-primary/10 transition-all hover:scale-[1.01]"
              >
                {isSubmitting ? (
                  <>Finalizing Logic...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Save Scenario</>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
