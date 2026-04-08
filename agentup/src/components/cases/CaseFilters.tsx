'use client';

import { useCaseStore } from '@/lib/store/case-store';
import { Search, Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const topics = ['Sales', 'Support', 'Critical', 'Retention', 'Technical'];
const channels = ['chat', 'call', 'both'];

export function CaseFilters() {
  const { 
    searchQuery, 
    setSearchQuery, 
    selectedTopic, 
    setSelectedTopic,
    selectedChannel,
    setSelectedChannel
  } = useCaseStore();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" strokeWidth={1.5} />
        <Input
          placeholder="Search scenarios by title or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 h-12 bg-white border-border shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-xl font-medium"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-md text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-8 py-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Filters</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-muted-foreground/60">Topic:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedTopic(null)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                !selectedTopic ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
            {topics.map((topic) => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedTopic === topic ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-muted-foreground/60">Channel:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedChannel(null)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                !selectedChannel ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
            {channels.map((channel) => (
              <button
                key={channel}
                onClick={() => setSelectedChannel(channel)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  selectedChannel === channel ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {channel}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
