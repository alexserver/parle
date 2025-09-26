# Audio Transcriber

A full-stack web application that transforms audio files (MP3/WAV) into text using AI transcription and summarization.

## Features

- Upload MP3/WAV audio files
- Automatic transcription using OpenAI Whisper (with fallback mock)
- AI-powered summarization using OpenAI GPT (with fallback mock)
- Real-time processing status tracking
- Search transcripts by ID
- Responsive web interface built with React and Tailwind CSS

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Bun + Hono + TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **AI Services**: OpenAI Whisper & GPT (optional)

## Project Structure

```
parle/
├── README.md
├── package.json               # Monorepo root with dev scripts
├── docker-compose.yml          # PostgreSQL database
├── apps/
│   ├── api/                   # Backend API (Bun + Hono)
│   │   ├── .env.example       # API environment variables
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts       # Server entry point
│   │   │   ├── routes.ts      # API routes
│   │   │   ├── prisma.ts      # Database client
│   │   │   ├── types.ts       # TypeScript types
│   │   │   └── services/
│   │   │       ├── transcribe.ts  # Audio transcription
│   │   │       └── summarize.ts   # Text summarization
│   │   ├── uploads/           # Audio file storage (gitignored)
│   │   └── prisma/
│   │       └── schema.prisma  # Database schema
│   └── web/                   # Frontend (React + Vite)
│       ├── package.json
│       ├── vite.config.ts     # Vite config with API proxy
│       ├── tailwind.config.js
│       └── src/
│           ├── main.tsx       # React entry point
│           ├── App.tsx        # Main application component
│           ├── api.ts         # API client functions
│           └── index.css      # Tailwind CSS
```

## Setup Instructions

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- [Docker](https://www.docker.com/) and Docker Compose
- Node.js 20+ (for the frontend)
- [pnpm](https://pnpm.io/) or npm

### 1. Clone and Setup Environment

```bash
cd parle
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` and optionally add your OpenAI API key:

```
# API Server Configuration
PORT=3000
NODE_ENV=development

# OpenAI API Configuration (optional - uses mock services if not provided)
OPENAI_API_KEY=sk-your-key-here

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/parle?schema=public

# PostgreSQL Docker Configuration (used by docker-compose.yml)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=parle
```

### 2. Start PostgreSQL Database

```bash
docker compose up -d
```

### 3. Setup Backend API

```bash
cd apps/api

# Install dependencies
bun install

# Generate Prisma client and push schema to database
bun run db:generate
bun run db:push

# Start development server
bun run dev
```

The API will be available at `http://localhost:3000`

Test the health endpoint:

```bash
curl http://localhost:3000/health
# Should return: {"ok":true}
```

### 4. Setup Frontend Web App

```bash
# In a new terminal
cd apps/web

# Install dependencies
npm install

# Start development server
npm run dev
```

The web app will be available at `http://localhost:5173`

## Usage

### Web Interface

1. Open `http://localhost:5173` in your browser
2. Select an MP3 or WAV file using the file picker
3. Click "Upload & Transcribe"
4. Wait for processing (status will show progress)
5. View the transcript and summary results
6. Use the ID lookup feature to retrieve previous transcriptions

### API Endpoints

- `GET /health` - Health check
- `POST /upload` - Upload audio file for transcription
- `GET /transcripts/:id` - Retrieve transcript by ID

### Example API Usage

```bash
# Upload an audio file
curl -X POST http://localhost:3000/upload \
  -F "audio=@your-audio-file.mp3"

# Get transcript by ID
curl http://localhost:3000/transcripts/your-transcript-id
```

## Database Schema

The application uses a single `Conversation` model:

```prisma
model Conversation {
  id               String          @id @default(cuid())
  originalFilename String
  storagePath      String
  mimeType         String
  sizeBytes        Int
  durationSec      Int?
  status           TranscriptStatus @default(initial)
  transcriptText   String?
  summaryText      String?
  errorMessage     String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
}

enum TranscriptStatus {
  initial
  transcribed
  summarized
  failed
}
```

## Development

### Database Management

```bash
cd apps/api

# View database in Prisma Studio
bun run db:studio

# Reset database
bun run db:push --force-reset

# Create and apply migrations
bun run db:migrate
```

### Building for Production

```bash
# Build API
cd apps/api
bun run build

# Build frontend
cd apps/web
npm run build
```

## Notes

- Audio files are stored locally in the `apps/api/uploads/` directory
- If no OpenAI API key is provided, the app uses mock services that still demonstrate the full workflow
- The frontend automatically proxies `/api` requests to the backend during development
- File uploads are limited by available disk space and Bun's default limits

## 🚀 Next Steps

1. Start the database: docker compose up -d
2. Setup backend: cd apps/api && bun install && bun run db:generate && bun run db:push && bun run dev
3. Setup frontend: cd apps/web && npm install && npm run dev
4. Access the app: Open http://localhost:5173
