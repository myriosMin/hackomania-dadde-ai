# DADDE's FUND

**AI-Mediated Decentralized Community Aid** — A community-powered emergency fund platform that uses dual-AI verification, Interledger Open Payments, and ClickHouse real-time analytics to deliver transparent, instant disaster relief.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, TailwindCSS v4, Radix UI, Recharts |
| AI Agent | Google ADK (Gemini 2.5 Flash) via CopilotKit |
| Payments | Interledger Open Payments SDK |
| Analytics | ClickHouse (SummingMergeTree, Materialized Views) |

## Prerequisites

- Node.js 18+
- Python 3.12+
- [Google API Key](https://makersuite.google.com/app/apikey) (set in `agent/.env`)

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
   > This also runs `uv sync` in the `agent/` directory to set up the Python virtual environment.

2. **Set your Google API key** in `agent/.env`:
   ```
   GOOGLE_API_KEY=your-key-here
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   This starts both the Next.js UI (port 3000) and the Python ADK agent (port 8000) concurrently.

## Project Structure

```
├── src/app/
│   ├── [[...slug]]/page.tsx   # Catch-all route (SPA via react-router)
│   ├── client-app.tsx         # Client-side app shell (router + CopilotKit popup)
│   ├── routes.tsx             # React Router route definitions
│   ├── context/               # Auth context provider
│   ├── pages/                 # Page components (landing, payment, giving, login, signup, admin, impact)
│   ├── components/            # UI components (shadcn/Radix primitives, navigation, hero, etc.)
│   ├── api/copilotkit/        # CopilotKit runtime API route
│   └── globals.css            # Tailwind v4 theme + CopilotKit styles
├── agent/
│   ├── main.py                # Google ADK agent (FastAPI + Gemini)
│   ├── .env                   # API keys
│   └── pyproject.toml         # Python dependencies
├── scripts/                   # Agent setup & run scripts
└── docs/                      # PRD, problem statement, Q&A
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start UI + agent concurrently |
| `npm run dev:ui` | Start Next.js only |
| `npm run dev:agent` | Start Python agent only |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |

## Troubleshooting

- **"Agent my_agent not found"** — The Python agent server isn't running. Make sure `npm run dev` starts both servers, or run `npm run dev:agent` separately.
- **500 on `/api/copilotkit`** — Check that `@langchain/core` is installed (`npm install @langchain/core`) and the agent is running on port 8000.
- **Python import errors** — Run `cd agent && uv sync` to reinstall Python dependencies.

## License

MIT — see [LICENSE](LICENSE) for details.