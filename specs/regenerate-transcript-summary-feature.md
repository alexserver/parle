# Regenerate Transcript & Summary Feature Specification

## Overview
Add regeneration functionality to the TranscriptDetailPage allowing users to re-process both transcripts and summaries using OpenAI APIs. This provides the ability to improve results or recover from processing errors.

## Current State Analysis

### UI Structure
- **TranscriptDetailPage.tsx** (`/Users/alexserver/Code/ai-gen/parle/apps/web/src/pages/TranscriptDetailPage.tsx:206-214`): Full Transcript section with "Copy" button
- **TranscriptDetailPage.tsx** (`/Users/alexserver/Code/ai-gen/parle/apps/web/src/pages/TranscriptDetailPage.tsx:229-237`): Summary section with "Copy" button
- Both sections have consistent styling with copy functionality

### Backend Processing Services
- **Transcription Service** (`/Users/alexserver/Code/ai-gen/parle/apps/api/src/services/transcribe.ts:10-52`):
  - Uses OpenAI Whisper API (`whisper-1` model)
  - Fetches audio from R2 using presigned URLs
  - Handles mock responses when no API key present
  - Input: `storageKey` (R2 object path) and `conversationId`
  - Output: Transcript text

- **Summarization Service** (`/Users/alexserver/Code/ai-gen/parle/apps/api/src/services/summarize.ts:8-52`):
  - Uses OpenAI GPT-3.5-turbo for chat completions
  - Takes transcript text as input
  - Handles mock responses when no API key present
  - Input: `text` (transcript) and `conversationId`
  - Output: Summary text

### Storage Integration
- **R2 Storage** - Audio files stored with `storagePath` in conversation records
- **Presigned URLs** - Generated for secure audio file access (`generatePresignedUrl`)
- **Database Updates** - Status tracking through conversation records

### Data Flow
1. **Upload Flow** (`/Users/alexserver/Code/ai-gen/parle/apps/api/src/routes/upload.ts:85-129`):
   - Upload → Store in R2 → Transcribe → Update DB → Summarize → Update DB
   - Status progression: `initial` → `transcribed` → `summarized` (or `failed`)

## Feature Requirements

### 1. Backend API Changes

#### 1.0 CORS Configuration Update
**File:** `/Users/alexserver/Code/ai-gen/parle/apps/api/src/routes/index.ts`

**Current CORS config** (line 18):
```typescript
allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS']
```

**Required update**:
```typescript
allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
```

**Reasoning**: The new regeneration endpoints use PUT method for updating existing resources (conversations) with regenerated content.

#### 1.1 Regenerate Transcript Endpoint
**File:** `/Users/alexserver/Code/ai-gen/parle/apps/api/src/routes/transcripts.ts`

Add new PUT endpoint:
```typescript
transcripts.put('/:id/regenerate-transcript', async (c) => {
  // Implementation details below
})
```

**Functionality:**
- Validate user authentication and ownership
- Verify conversation exists and has valid `storagePath`
- Call existing `transcribeAudio()` service with stored audio file
- Update conversation record with new transcript
- Set status back to `transcribed` (removing summary if it existed)
- Return updated conversation data

**Requirements:**
- Only allow regeneration if `storagePath` exists (file was successfully uploaded)
- Reset `summaryText` to null when transcript is regenerated
- Update `status` to `transcribed` regardless of previous status
- Clear any existing `errorMessage`

#### 1.2 Regenerate Summary Endpoint
**File:** `/Users/alexserver/Code/ai-gen/parle/apps/api/src/routes/transcripts.ts`

Add new PUT endpoint:
```typescript
transcripts.put('/:id/regenerate-summary', async (c) => {
  // Implementation details below
})
```

**Functionality:**
- Validate user authentication and ownership
- Verify conversation exists and has `transcriptText`
- Call existing `summarizeTranscript()` service with existing transcript
- Update conversation record with new summary
- Set status to `summarized`
- Return updated conversation data

**Requirements:**
- Only allow regeneration if `transcriptText` exists and is not empty
- Update `status` to `summarized`
- Clear any existing `errorMessage`

#### 1.3 Error Handling
- **404**: Conversation not found or user doesn't own it
- **400**: Invalid state (missing audio file for transcript, missing transcript for summary)
- **422**: Processing failed (OpenAI API errors, storage errors)
- **500**: Internal server error

### 2. Frontend Changes

#### 2.1 UI Updates - Full Transcript Section
**File:** `/Users/alexserver/Code/ai-gen/parle/apps/web/src/pages/TranscriptDetailPage.tsx`

**Current Section** (lines 202-222):
```jsx
<div className="flex items-center justify-between mb-4">
  <h2 className="text-lg font-medium text-gray-900">Full Transcript</h2>
  <button onClick={() => copyToClipboard(transcript.transcriptText!)}>Copy</button>
</div>
```

**Proposed Enhancement**:
```jsx
<div className="flex items-center justify-between mb-4">
  <h2 className="text-lg font-medium text-gray-900">Full Transcript</h2>
  <div className="flex space-x-2">
    <button onClick={() => handleRegenerateTranscript()}>
      <RefreshIcon /> Regenerate
    </button>
    <button onClick={() => copyToClipboard(transcript.transcriptText!)}>
      <CopyIcon /> Copy
    </button>
  </div>
</div>
```

#### 2.2 UI Updates - Summary Section
**File:** `/Users/alexserver/Code/ai-gen/parle/apps/web/src/pages/TranscriptDetailPage.tsx`

**Current Section** (lines 225-243):
```jsx
<div className="flex items-center justify-between mb-4">
  <h2 className="text-lg font-medium text-gray-900">Summary</h2>
  <button onClick={() => copyToClipboard(transcript.summaryText!)}>Copy</button>
</div>
```

**Proposed Enhancement**:
```jsx
<div className="flex items-center justify-between mb-4">
  <h2 className="text-lg font-medium text-gray-900">Summary</h2>
  <div className="flex space-x-2">
    <button onClick={() => handleRegenerateSummary()}>
      <RefreshIcon /> Regenerate
    </button>
    <button onClick={() => copyToClipboard(transcript.summaryText!)}>
      <CopyIcon /> Copy
    </button>
  </div>
</div>
```

#### 2.3 State Management & Loading States

**New State Variables:**
```typescript
const [isRegeneratingTranscript, setIsRegeneratingTranscript] = useState(false)
const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false)
const [regenerationError, setRegenerationError] = useState<string | null>(null)
```

**Loading State UI:**
- Show spinner and "Regenerating..." text during processing
- Disable regenerate buttons during processing
- Show progress indicators for long-running operations

#### 2.4 Frontend API Integration
**File:** `/Users/alexserver/Code/ai-gen/parle/apps/web/src/api.ts`

Add new API functions:
```typescript
export const regenerateTranscript = async (id: string, token: string | null): Promise<Conversation> => {
  // PUT /transcripts/:id/regenerate-transcript
}

export const regenerateSummary = async (id: string, token: string | null): Promise<Conversation> => {
  // PUT /transcripts/:id/regenerate-summary
}
```

### 3. User Experience Considerations

#### 3.1 Button Placement & Design
- **Location**: Right side of section headers, next to existing Copy buttons
- **Layout**: Horizontal button group with consistent spacing
- **Icons**: Refresh/reload icon for regenerate, copy icon for copy
- **Styling**: Match existing button design patterns
- **Order**: Regenerate button first, then Copy button

#### 3.2 Loading & Feedback States
- **Loading Indicators**: Spinner with "Regenerating..." text
- **Progress Communication**: Clear indication of which section is processing
- **Disable Interactions**: Prevent multiple simultaneous regenerations
- **Success Feedback**: Automatic content update without explicit success message
- **Error Handling**: Clear error messages with retry options

#### 3.3 Conditional Availability
- **Transcript Regeneration**: Only available if audio file exists (`storagePath` not empty)
- **Summary Regeneration**: Only available if transcript exists (`transcriptText` not empty)
- **Visual Indicators**: Disable/hide buttons when prerequisites not met
- **Tooltips**: Explain why buttons are disabled when applicable

### 4. Technical Implementation Details

#### 4.1 API Endpoints
```
PUT /api/transcripts/:id/regenerate-transcript
PUT /api/transcripts/:id/regenerate-summary

Authorization: Bearer <token>
Content-Type: application/json

Response: 200 OK with updated Conversation object
Error Responses: 400, 404, 422, 500
```

#### 4.2 Database Operations
```typescript
// Regenerate Transcript
UPDATE conversations 
SET transcriptText = ?, summaryText = NULL, status = 'transcribed', errorMessage = NULL, updatedAt = NOW()
WHERE id = ? AND userId = ?

// Regenerate Summary  
UPDATE conversations 
SET summaryText = ?, status = 'summarized', errorMessage = NULL, updatedAt = NOW()
WHERE id = ? AND userId = ?
```

#### 4.3 Service Reuse
- **Transcript Regeneration**: Reuse existing `transcribeAudio(storageKey, conversationId)` function
- **Summary Regeneration**: Reuse existing `summarizeTranscript(text, conversationId)` function
- **Storage Access**: Reuse existing R2 presigned URL generation
- **Logging**: Leverage existing OpenAI request logging

### 5. Error Scenarios & Handling

#### 5.1 Transcript Regeneration Errors
- **Missing Audio File**: R2 object not found or inaccessible
- **OpenAI API Errors**: Rate limits, API downtime, invalid audio format
- **Storage Errors**: Presigned URL generation failures
- **Database Errors**: Update operation failures

#### 5.2 Summary Regeneration Errors
- **Missing Transcript**: No transcript text available to summarize
- **OpenAI API Errors**: Rate limits, API downtime, content policy violations
- **Database Errors**: Update operation failures

#### 5.3 User Feedback Strategy
```typescript
// Error message examples
"Unable to regenerate transcript: Audio file not found"
"Unable to regenerate summary: No transcript available"
"Regeneration failed: Please try again later"
"OpenAI service temporarily unavailable"
```

### 6. Security & Performance Considerations

#### 6.1 Authorization
- Verify user ownership before allowing regeneration
- Use existing auth middleware for consistency
- Prevent unauthorized access to conversation data

#### 6.2 Rate Limiting & Abuse Prevention
- Consider implementing regeneration limits per user/time period
- Log regeneration attempts for monitoring
- Prevent spam regeneration requests

#### 6.3 Cost Management
- Track OpenAI API usage from regenerations
- Consider warnings for excessive regeneration usage
- Implement usage analytics for cost monitoring

### 7. Implementation Plan

#### Phase 1: Backend API Development (Priority: High)
1. **Update CORS configuration** to include PUT method in allowed methods
2. Add regenerate-transcript endpoint with ownership validation
3. Add regenerate-summary endpoint with prerequisite validation
4. Implement error handling for all failure scenarios
5. Add comprehensive logging for debugging and monitoring

#### Phase 2: Frontend Integration (Priority: High)
1. Add regenerate buttons to both transcript and summary sections
2. Implement loading states and error handling
3. Add API integration functions
4. Update local state management after successful regeneration
5. Implement conditional button availability

#### Phase 3: UX Enhancement (Priority: Medium)
1. Add icons and improved visual design
2. Implement progress indicators for better feedback
3. Add tooltips and help text
4. Enhance error messaging with actionable guidance
5. Add success animations or feedback

#### Phase 4: Testing & Polish (Priority: Medium)
1. Manual testing of both regeneration flows
2. Error scenario testing (network failures, API errors)
3. Performance testing with large files/transcripts
4. User acceptance testing for UX validation
5. Cost and usage monitoring implementation

### 8. Success Metrics & Validation

#### 8.1 Functional Requirements
- [ ] Transcript regeneration works with existing audio files
- [ ] Summary regeneration works with existing transcripts
- [ ] Buttons are conditionally available based on data state
- [ ] Loading states provide clear user feedback
- [ ] Error handling covers all failure scenarios
- [ ] Database updates reflect regenerated content

#### 8.2 Performance Requirements
- [ ] Regeneration time similar to initial processing
- [ ] No memory leaks or resource issues
- [ ] Graceful handling of concurrent regenerations
- [ ] Proper cleanup of temporary resources

#### 8.3 User Experience Requirements
- [ ] Intuitive button placement and design
- [ ] Clear progress indication during processing
- [ ] Helpful error messages with recovery guidance
- [ ] Consistent behavior across different conversation states

### 9. Future Enhancements

#### 9.1 Advanced Features
1. **Batch Regeneration**: Select multiple conversations for bulk regeneration
2. **Model Selection**: Allow users to choose different OpenAI models
3. **Custom Prompts**: User-defined prompts for summarization
4. **Regeneration History**: Track and compare different generations
5. **Quality Scoring**: AI-powered quality assessment of regenerations

#### 9.2 Integration Opportunities
1. **Webhook Notifications**: Notify users when regeneration completes
2. **Export Integration**: Include regenerated content in exports
3. **Analytics Dashboard**: Usage and improvement metrics
4. **A/B Testing**: Compare different model versions or prompts
5. **Collaborative Features**: Team-based regeneration workflows

### 10. Risk Assessment & Mitigation

#### 10.1 Technical Risks
- **OpenAI API Changes**: Monitor API deprecations and updates
- **Storage Dependencies**: Ensure R2 reliability and access patterns
- **Database Consistency**: Handle partial update failures gracefully
- **Performance Impact**: Monitor regeneration load on system resources

#### 10.2 Business Risks
- **Cost Escalation**: Track and limit regeneration costs
- **User Confusion**: Clear documentation and intuitive UX design
- **Quality Degradation**: Ensure regenerated content maintains quality
- **Feature Complexity**: Balance functionality with simplicity

#### 10.3 Mitigation Strategies
- Implement robust error handling and recovery mechanisms
- Add comprehensive logging and monitoring
- Create clear user documentation and help resources
- Establish usage limits and cost controls
- Regular testing and quality assurance processes