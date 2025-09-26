## Objective

You are an expert full-stack engineer. Build a minimal MVP with:

- Frontend: React + Vite + TypeScript
- Backend: Node + Express + TypeScript
- DB: PostgreSQL via Prisma
- Audio pipeline: upload MP3/WAV → create DB record (status=initial) → transcribe → save transcriptText and set status=transcribed → (optional) summarize → save summaryText and set status=summarized.

## High-level goals

- A web form that lets me upload .mp3 or .wav.
- The backend receives the file, creates a DB record with metadata and status=initial.
- The backend transcribes the audio, stores the text in the same record, sets status=transcribed.
- (Optional but include) Summarize transcript, store summaryText, set status=summarized.
- Frontend shows the job result (status, transcript preview, summary).

## Project structure

Create a monorepo with two apps:

```
parle/
├─ README.md
├─ docker-compose.yml                # Postgres
├─ .env.example
├─ apps/
│  ├─ api/                           # Node + Express + TS
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ prisma.ts
│  │  │  ├─ routes.ts
│  │  │  ├─ services/
│  │  │  │  ├─ transcribe.ts
│  │  │  │  └─ summarize.ts
│  │  │  └─ types.ts
│  │  └─ prisma/
│  │     └─ schema.prisma
│  └─ web/                           # React + Vite + TS
│     ├─ package.json
│     ├─ index.html
│     ├─ tsconfig.json
│     └─ src/
│        ├─ main.tsx
│        ├─ App.tsx
│        └─ api.ts
└─ uploads/                          # gitignored, local storage for files
```

## Tech choices

- Frontend: Vite + React + TypeScript, fetch API calls, use Tailwind + shadcn-ui
- Backend: Bun + Hono, Multer for upload, Zod for validation, Prisma for DB, OpenAI (or stub) for STT + summary.
- Database: Postgres 16 via docker-compose.
- Environment: Node 20+, pnpm or npm.

## Database schema (Prisma)

`apps/api/prisma/schema.prisma`

- Enum `Conversation = initial | transcribed | summarized | failed`

- Model `Conversation`:

  - id: String @id @default(cuid())
  - originalFilename: String
  - storagePath: String
  - mimeType: String
  - sizeBytes: Int
  - durationSec: Int?
  - status: TranscriptStatus @default(initial)
  - transcriptText: String?
  - summaryText: String?
  - errorMessage: String?
  - createdAt: DateTime @default(now())
  - updatedAt: DateTime @updatedAt

## API endpoints (Express)

Base URL: http://localhost:3000

- POST `/upload`

  Form-data: audio (file: mp3/wav)
  Flow:

  1. Create DB record with metadata and status=initial.
  2. Transcribe → update transcriptText, status=transcribed.
  3. Summarize (optional) → update summaryText, status=summarized.

  Response JSON:

  ```
  {
    "id": "cuid",
    "status": "summarized",
    "transcriptPreview": "first 300 chars...",
    "summary": "short summary text"
  }
  ```

- GET /transcripts/:id
  Returns full record.

- GET /health
  `{ ok: true }` for readiness checks.

## Transcription & summary services

- Implement transcribeAudio(filePath: string): Promise<string> in apps/api/src/services/transcribe.ts.

  - Default implementation: use OpenAI Whisper if OPENAI_API_KEY is present.
  - If not present, implement a mock that returns "[MOCK TRANSCRIPT for <filename>]" so the app still works locally without credentials.

- Implement summarizeTranscript(text: string): Promise<string>.

  - Use OpenAI chat if OPENAI_API_KEY is present.
  - Else return a simple rule-based summary (e.g., first N sentences + TODO note).

## Frontend (Vite + React)

Page with:

- `<input type="file" accept=".mp3,.wav" />`
- Upload button → POST /upload
- Show a “processing…” state until response arrives.
- Render the result: status, transcript preview, summary.
- Add a small “check by id” form calling GET /transcripts/:id.
- apps/web/src/api.ts holds base URL (/api), helpers for uploadAudio(file) and getTranscript(id).
- Dev: proxy /api to http://localhost:3000 using Vite proxy config.

---

## Commands & setup

- Root `docker-compose.yml`:

```yaml
version: "3.8"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: parle
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

- Root .env.example:

```
PORT=3000
OPENAI_API_KEY=
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/parle?schema=public
```

## Backend details

Multer upload → store in /uploads
Insert record (status=initial)
Transcribe → update text & status=transcribed
Summarize → update summary & status=summarized
On error: update status=failed, store errorMessage

## Frontend details

Minimal UI:
Upload card
File picker + button
Spinner on processing
Results panel with transcript + summary
ID lookup form

# Proxy (Vite)

Proxy /api → http://localhost:3000
Frontend calls /api/upload and /api/transcripts/:id

## Acceptance criteria

Run DB: docker compose up -d
Run API: npm dev in apps/api → GET /health returns { ok: true }
Run Web: npm dev in apps/web → open http://localhost:5173
Upload audio → see record with transcript + summary

## Deliverable:

Generate all files with working code for backend and frontend. Include Prisma schema, routes, services, React UI, and Vite proxy config. Provide a README with setup instructions.
