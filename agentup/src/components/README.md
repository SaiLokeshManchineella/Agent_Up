# Components — UI Architecture

## Directory Structure

```
components/
├── ui/               # shadcn/ui primitives (shared, reusable)
├── layout/           # App-level layout components
├── training/         # Daily Training session flow
├── cases/            # My Cases page components
├── dashboard/        # My Dashboard widgets
└── voice/            # Voice call interface
```

## Component Tree (per page)

### Page 1: Daily Training (`/`)

```
SessionManager (orchestrates the entire flow)
├── [phase=idle]     → Button "Start Training Session" + Spinner
├── [phase=intro]    → CaseIntro (scenario preview + channel choice)
├── [phase=simulation]
│   ├── ChatSimulation (if channel=chat)
│   │   └── streaming chat UI with turn counter
│   └── CallSimulation (if channel=call)
│       └── CallInterface
│           ├── AudioVisualizer (canvas waveform)
│           ├── TranscriptOverlay (agent + customer text)
│           └── LatencyIndicator (E2E, STT, LLM, TTS metrics)
├── [phase=scoring]  → ScoreCard (4-dimension breakdown + tips)
└── [phase=summary]  → SessionSummary (avg score + streak + per-case scores)
```

### Page 2: My Cases (`/cases`)

```
MyCasesPage
├── CaseFilters (topic, channel, difficulty dropdowns)
├── CaseList
│   └── CaseCard (title, topic, channel badge, difficulty badge)
└── CaseForm (dialog: title, scenario, opening message, channel, topic, difficulty)
```

### Page 3: My Dashboard (`/dashboard`)

```
DashboardPage
├── StatsCards (streak, sessions this week, top skill, skill to improve)
├── ScoreLineChart (Recharts line chart, last 30 days)
├── TopicBreakdown (Recharts bar chart, score by topic)
├── ChannelComparison (chat vs call score cards)
└── SessionHistory (last 10 sessions list)
```

### Layout (all pages)

```
RootLayout
├── Navbar (sticky, 3 nav links with active state)
└── PageTransition (Framer Motion fade+slide)
    └── {children}
```

## Key Components

### SessionManager (`training/SessionManager.tsx`)
The brain of the training flow. Manages phases (idle → intro → simulation → scoring → summary), fetches cases, handles smart selection (avoids recent cases, prefers weak topics), and coordinates transitions.

### ChatSimulation (`training/ChatSimulation.tsx`)
Chat-style practice. Handles streaming AI responses via SSE, turn counting, and scoring trigger after max turns. Input via textarea with Enter-to-send.

### CallInterface (`voice/CallInterface.tsx`)
Full voice call screen. Creates the VoicePipeline, manages call duration timer, displays transcripts and latency metrics, handles mute toggle and end call. Shows audio quality warnings from the pipeline.

### ScoreCard (`training/ScoreCard.tsx`)
Per-case results. Shows 4 progress bars (Empathy, Accuracy, Resolution, Professionalism) with color coding, notes for each dimension, and Strength/Improvement/Tip sections.

### CaseForm (`cases/CaseForm.tsx`)
Dialog for creating new cases. Predefined topics (Billing, De-escalation, Technical, Retention) + custom topic input. All fields validated before submit.

## Shared UI Components (`ui/`)

Built with shadcn/ui: Button, Card, Input, Textarea, Select, Badge, Tabs, Separator, Progress, Label, Dialog, Sheet, Spinner.
