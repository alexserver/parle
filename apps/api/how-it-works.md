# How the Audio Processing API Works

## 📋 Step-by-Step Audio Processing Flow

### **1. File Upload & Validation** 
📍 `src/routes.ts:19-30`
- Receives multipart form data with `audio` field
- Validates file exists and is audio type (`audio/*`)
- Rejects non-audio files with 400 error

### **2. File Storage**
📍 `src/routes.ts:32-40`
- Creates `uploads/` directory in API folder if it doesn't exist
- Generates unique filename: `timestamp-random.ext`
- Saves file to disk using `fs.writeFile()`

### **3. Database Record Creation** 
📍 `src/routes.ts:42-50`
- Creates DB record with status=`initial`
- Stores metadata: filename, path, mimetype, size
- Returns record ID for tracking

### **4. Transcription Process**
📍 `src/routes.ts:52-61` → `src/services/transcribe.ts`
- Calls `transcribeAudio(storagePath)`
- **With OpenAI**: Uses Whisper-1 model via streaming
- **Without API key**: Returns mock transcript
- Updates DB: `transcriptText` + status=`transcribed`

### **5. Summarization Process**
📍 `src/routes.ts:63-75` → `src/services/summarize.ts`
- Calls `summarizeTranscript(transcriptText)`
- **With OpenAI**: Uses GPT-3.5-turbo with system prompt
- **Without API key**: Returns first 3 sentences + mock note
- Updates DB: `summaryText` + status=`summarized`

### **6. Error Handling**
📍 `src/routes.ts:76-86`
- If transcription fails: sets status=`failed` + `errorMessage`
- If summarization fails: continues (summary is optional)
- Returns appropriate HTTP status codes

### **7. Response Formation**
📍 `src/routes.ts:88-96`
- Returns: `id`, `status`, `transcriptPreview` (first 300 chars), `summary`
- Frontend receives this to show processing results

## 🗺️ Code Navigation Map

| **Step** | **File** | **Lines** | **What It Does** |
|----------|----------|-----------|------------------|
| Upload Handler | `routes.ts` | 19-96 | Main upload endpoint |
| File Storage | `routes.ts` | 32-40 | Save to uploads/ |
| DB Initial | `routes.ts` | 42-50 | Create record |
| Transcription | `services/transcribe.ts` | 9-27 | OpenAI Whisper/Mock |
| Summarization | `services/summarize.ts` | 7-36 | OpenAI GPT/Mock |
| Error Handling | `routes.ts` | 76-86 | Failed status |

## 🔄 Processing States

The `TranscriptStatus` enum tracks the pipeline:

1. `initial` - File uploaded, stored, DB record created
2. `transcribed` - Audio converted to text successfully
3. `summarized` - Text summarized successfully (final state)
4. `failed` - Error occurred during transcription

## 🚀 Key Features

- **Async Processing**: Each step updates the database progressively
- **Graceful Fallbacks**: Mock services when OpenAI API key not provided
- **Error Recovery**: Summarization failure doesn't break the pipeline
- **File Safety**: Unique filenames prevent conflicts
- **Type Safety**: Full TypeScript validation throughout

## 📝 API Endpoints

### POST `/upload`
**Request**: Multipart form with `audio` field (MP3/WAV)
**Response**: 
```json
{
  "id": "cuid",
  "status": "summarized",
  "transcriptPreview": "first 300 chars...",
  "summary": "short summary text"
}
```

### GET `/transcripts/:id`
**Response**: Full conversation record with complete transcript and metadata

### GET `/health`
**Response**: `{"ok": true}` for service health checks

The implementation follows the exact specifications: **upload → store metadata → transcribe → summarize → return results**!