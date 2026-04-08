# AgentUp: Titan AI Training Platform 🚀

**AgentUp** is a high-fidelity, production-grade conversational AI platform designed to train and benchmark sales and support agents using state-of-the-art Voice and Chat simulations.

Built as an engineering demonstration for the **AI Full Stack Engineer** hiring exercise, this platform showcases advanced real-time voice pipelines, a hybrid database architecture, and deep behavioral diagnostics.

---

## 🏗️ Architectural Excellence

### 1. Dual-Driver Database System (Cloud-Ready)
The platform features a sophisticated hybrid storage engine built with **Drizzle ORM**. It automatically detects its environment and switches between:
- 🛠️ **Local Development**: Ultra-fast **SQLite** with Write-Ahead Logging (WAL).
- ☁️ **Production**: **Vercel Postgres** for global scale and persistence.
- 📦 **Docker Support**: Built-in `docker-compose` for local Postgres parity testing.

### 2. High-Fidelity Voice Pipeline
The voice engine is engineered for low-latency, "human-like" interaction:
- **Deepgram**: Real-time STT with acoustic endpointing.
- **OpenAI**: GPT-4o powered conversational intelligence.
- **Cartesia/ElevenLabs**: High-fidelity TTS for natural prosody.
- **Waveform Visualization**: Real-time frequency-domain visualization for immersive UX.

### 3. Hardened Diagnostic Engine
The simulation logic is built with a turn-based "Zero-Gap" guard:
- **Turn Enforcement**: Exactly 5 conversational pairs (AI + User) are required before the diagnostic phase.
- **Automated Scoring**: Multi-dimensional analysis across Empathy, Accuracy, Resolution, and Professionalism.
- **Behavioral Insights**: Detailed feedback and actionable "Strengths vs. Improvements" generated for every session.

---

## 🛠️ Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, Framer Motion, Lucide Icons.
- **State Management**: Zustand (Global Store), React Context (Real-time Pipeline).
- **Backend**: Next.js API Routes, Drizzle ORM.
- **Database**: Vercel Postgres / SQLite.
- **AI Services**: OpenAI, Deepgram, ElevenLabs.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker (Optional, for local Postgres testing)

### Installation
1. Clone the repository and navigate into the project:
   ```bash
   cd agentup/agentup
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your Environment:
   Create a `.env` file based on `.env.example`.

4. Run locally:
   ```bash
   npm run dev
   ```

### Local Postgres Testing
To test the production database logic locally:
```bash
docker-compose up -d
npm run dev
```

---

## 📡 Deployment to Vercel
1. Push this repository to your GitHub/GitLab.
2. Connect the project in the Vercel Dashboard.
3. Add the **Vercel Postgres** Storage add-on.
4. Add your API keys to the Environment Variables.

---

### 🎓 Hiring Exercise Notes
This project was meticulously hardened to ensure 100% stability. Key improvements made during the exercise:
- Fixed a concurrency bug in the simulation scoring logic.
- Implemented real-time waveform visualization for the voice channel.
- Migrated the entire database layer to a production-grade Postgres architecture.
- Hardened the "5-Turn" simulation limit to ensure deterministic evaluations.

**Developed with ❤️ for the IAG AI Full Stack Engineer hiring exercise.**
