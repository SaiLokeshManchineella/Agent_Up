# State Management — Zustand Stores

Two Zustand stores manage all client-side state. No Redux, no context providers, no boilerplate.

## Files

| File | Purpose |
|------|---------|
| `training-store.ts` | Training session state (phases, cases, scores, streak) |
| `case-store.ts` | Case library state (cases list, filters) |

## Training Store (`training-store.ts`)

Manages the entire training session lifecycle.

### State

| Field | Type | Description |
|-------|------|-------------|
| `phase` | `TrainingPhase` | Current phase: idle, intro, simulation, scoring, summary |
| `cases` | `Case[]` | The 3 selected cases for this session |
| `currentCaseIndex` | `number` | Which case is active (0, 1, 2) |
| `currentTurn` | `number` | Agent's turn count (0-4) |
| `maxTurns` | `number` | Max turns per case (5) |
| `conversations` | `ConversationMessage[][]` | Message history per case |
| `scores` | `ScoreResult[]` | Score results per case |
| `streak` | `number` | Current daily streak |
| `isLoading` | `boolean` | Loading indicator |
| `error` | `string \| null` | Error state for recovery |
| `chosenChannels` | `('chat' \| 'call')[]` | User's channel choice per case |

### Actions

| Action | Description |
|--------|-------------|
| `startSession(cases)` | Initialize session with 3 cases, reset all state |
| `setPhase(phase)` | Transition to next phase |
| `addMessage(msg)` | Add a message to current case's conversation |
| `incrementTurn()` | Increment agent turn counter |
| `addScore(score)` | Store score result for current case |
| `nextCase()` | Move to next case (increments index, resets turn, sets phase=intro) |
| `setChannelForCurrentCase(ch)` | Set user's channel choice for "both" cases |
| `setError(error)` | Set error message (null to clear) |
| `reset()` | Reset everything back to idle |

## Case Store (`case-store.ts`)

Manages the case library with client-side filtering.

### State

| Field | Type | Description |
|-------|------|-------------|
| `cases` | `Case[]` | All cases (default + custom) |
| `filters` | `CaseFilters` | Active filters (topic, channel, difficulty) |
| `isLoading` | `boolean` | Loading indicator |

### Actions

| Action | Description |
|--------|-------------|
| `setCases(cases)` | Set full case list (from API) |
| `addCase(c)` | Add a newly created case |
| `setFilter(key, value)` | Set a filter (e.g., topic='Billing') |
| `resetFilters()` | Clear all filters to 'all' |
| `filteredCases()` | Computed: returns cases matching current filters |
