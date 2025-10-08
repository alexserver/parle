# Re-upload Failed Audio File Feature Specification

## Overview
Add re-upload functionality for conversations that failed during the initial file upload process, allowing users to recover from R2 storage failures without losing their conversation metadata or starting over completely.

## Problem Statement

### Current Upload Flow
1. User selects audio file on UploadPage
2. Frontend uploads to `/upload` endpoint
3. Backend creates DB record with `status='initial'` and `storagePath=''`
4. Backend uploads file to R2 storage
5. Backend updates DB record with `storagePath` and processes transcript/summary

### Failure Scenarios
- **R2 Storage Failure**: File upload to R2 fails after DB record creation
- **Network Interruption**: Connection lost during R2 upload
- **Storage Quota Exceeded**: R2 bucket storage limits reached
- **Authentication Issues**: R2 credentials temporarily invalid

### Current State After Failure
- **Database Record**: Exists with `status='initial'` and `storagePath=null/empty`
- **User Experience**: Conversation appears in list but cannot be processed
- **Recovery Options**: None - user must delete and start over

## Feature Requirements

### 1. Detection Logic

#### 1.1 Failed Upload Identification
**Criteria for re-upload eligibility:**
```typescript
const isEligibleForReupload = (conversation: Conversation): boolean => {
  return conversation.status === 'initial' && 
         (!conversation.storagePath || conversation.storagePath.trim() === '')
}
```

#### 1.2 UI State Indicators
- **File Information Section**: Show "Upload Failed" status
- **Processing Information Section**: Clear indication of upload failure
- **Action Buttons**: Re-upload button prominently displayed

### 2. Backend API Changes

#### 2.1 Re-upload Endpoint
**File:** `/Users/alexserver/Code/ai-gen/parle/apps/api/src/routes/transcripts.ts`

```typescript
transcripts.post('/:id/re-upload', async (c) => {
  // Implementation details below
})
```

**Functionality:**
- Validate user authentication and conversation ownership
- Verify conversation is in failed upload state (`status='initial'` and no `storagePath`)
- Accept new audio file via multipart form data
- Update conversation metadata (filename, size, mimeType if changed)
- Upload file to R2 storage using existing upload logic
- Update conversation with `storagePath` and trigger processing pipeline
- Maintain original conversation ID and metadata

**Request Format:**
```
POST /api/transcripts/:id/re-upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: FormData with 'audio' field containing File
```

**Response:**
```typescript
interface ReuploadResponse {
  id: string
  status: 'initial' | 'transcribed' | 'summarized' | 'failed'
  transcriptPreview?: string
  summary?: string
}
```

#### 2.2 Validation Logic
```typescript
// Conversation eligibility check
if (conversation.status !== 'initial' || conversation.storagePath) {
  return c.json({ error: 'Conversation is not eligible for re-upload' }, 400)
}

// File validation (reuse existing logic)
const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'video/mp4']
const maxSize = 25 * 1024 * 1024 // 25MB
```

#### 2.3 Processing Pipeline Integration
- **R2 Upload**: Use existing `StorageFactory.createStorageService().uploadFile()`
- **Transcription**: Trigger existing `transcribeAudio()` service
- **Summarization**: Trigger existing `summarizeTranscript()` service
- **Status Updates**: Follow existing status progression (`initial` → `transcribed` → `summarized`)

### 3. Frontend Changes

#### 3.1 UI Placement - TranscriptDetailPage
**Location:** Replace or augment the existing metadata sections when upload failed

**Current Processing Information Section** (when upload failed):
```jsx
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-lg font-medium text-gray-900 mb-4">Processing Information</h2>
  <dl className="space-y-3">
    <div>
      <dt className="text-sm font-medium text-gray-500">Status</dt>
      <dd className="text-sm text-gray-900">
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Upload Failed
        </span>
      </dd>
    </div>
    {/* Other metadata */}
  </dl>
  
  {/* Re-upload section */}
  <div className="mt-6 pt-6 border-t border-gray-200">
    <h3 className="text-sm font-medium text-gray-900 mb-3">File Re-upload</h3>
    <p className="text-sm text-gray-600 mb-4">
      The original file failed to upload. Please select the same audio file to retry.
    </p>
    <div className="flex items-center space-x-4">
      <input
        type="file"
        accept="audio/*"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isReuploading}
        className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50"
      >
        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Select File to Re-upload
      </button>
      
      {selectedFile && (
        <button
          onClick={handleReupload}
          disabled={isReuploading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {isReuploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Uploading...
            </>
          ) : (
            <>
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload File
            </>
          )}
        </button>
      )}
    </div>
    
    {selectedFile && (
      <div className="mt-3 p-3 bg-blue-50 rounded-md">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800">{selectedFile.name}</p>
            <p className="text-xs text-blue-600">{formatFileSize(selectedFile.size)}</p>
          </div>
        </div>
      </div>
    )}
  </div>
</div>
```

#### 3.2 State Management
```typescript
const [selectedFile, setSelectedFile] = useState<File | null>(null)
const [isReuploading, setIsReuploading] = useState(false)
const [reuploadError, setReuploadError] = useState<string | null>(null)
const fileInputRef = useRef<HTMLInputElement>(null)
```

#### 3.3 Frontend API Integration
**File:** `/Users/alexserver/Code/ai-gen/parle/apps/web/src/api.ts`

```typescript
export async function reuploadAudio(id: string, file: File, token: string | null): Promise<Conversation> {
  try {
    console.log('🔄 Re-upload audio - ID:', id, 'File:', file.name, 'Token present:', !!token)
    
    const formData = new FormData()
    formData.append('audio', file)
    
    const headers = createAuthHeaders(token)
    console.log('🔐 Re-upload - Headers:', headers)

    const url = `${API_BASE_URL}/transcripts/${id}/re-upload`
    console.log('🌐 Making POST request to:', url)
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    })
    
    console.log('📡 Re-upload - Response status:', response.status)

    return handleApiResponse<Conversation>(response)
  } catch (error) {
    console.error('❌ Re-upload - Error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to re-upload audio file. Please try again.')
  }
}
```

#### 3.4 Event Handlers
```typescript
const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  if (file) {
    setSelectedFile(file)
    setReuploadError(null)
  }
}

const handleReupload = async () => {
  if (!selectedFile || !transcript || !id) return
  
  setIsReuploading(true)
  setReuploadError(null)
  
  try {
    console.log('🔄 Starting re-upload for conversation:', id)
    const updatedConversation = await reuploadAudio(id, selectedFile, token)
    setTranscript(updatedConversation)
    setSelectedFile(null)
    console.log('✅ Re-upload successful')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to re-upload file'
    setReuploadError(errorMessage)
    console.error('❌ Re-upload failed:', error)
  } finally {
    setIsReuploading(false)
  }
}
```

### 4. User Experience Considerations

#### 4.1 Visual State Indicators
- **Failed Status Badge**: Red "Upload Failed" status indicator
- **Clear Messaging**: Explain what happened and what user needs to do
- **Progress Indicators**: Loading states during re-upload process
- **Success Feedback**: Automatic page update after successful re-upload

#### 4.2 File Validation
- **Same Constraints**: Apply same file type and size validations as original upload
- **Real-time Feedback**: Validate file immediately upon selection
- **Clear Error Messages**: Explain validation failures clearly

#### 4.3 Error Handling
```typescript
// Common error scenarios
"File type not supported. Please select an MP3, MP4, or M4A file."
"File size exceeds 25MB limit. Please select a smaller file."
"Upload failed due to network error. Please try again."
"Conversation is not eligible for re-upload."
```

### 5. Security Considerations

#### 5.1 Authorization
- **Ownership Validation**: Verify user owns the conversation before allowing re-upload
- **Conversation State**: Only allow re-upload for conversations in failed state
- **Rate Limiting**: Prevent abuse of re-upload functionality

#### 5.2 File Validation
- **Same Validations**: Apply identical security checks as original upload
- **Metadata Updates**: Safely update file metadata without affecting conversation ID
- **Storage Path**: Generate new storage path to avoid conflicts

### 6. Implementation Plan

#### Phase 1: Backend API Development (Priority: High)
1. Add POST `/transcripts/:id/re-upload` endpoint with validation
2. Implement conversation eligibility checking
3. Reuse existing upload and processing logic
4. Add comprehensive error handling and logging
5. Update CORS configuration if needed (POST already allowed)

#### Phase 2: Frontend Integration (Priority: High)
1. Add re-upload UI section to TranscriptDetailPage
2. Implement file selection and upload state management
3. Add reuploadAudio API function
4. Update conversation state after successful re-upload
5. Implement error handling and user feedback

#### Phase 3: UX Enhancement (Priority: Medium)
1. Add file validation and preview functionality
2. Implement drag-and-drop file selection
3. Add upload progress indicators
4. Enhance error messaging and recovery guidance
5. Add success animations and feedback

#### Phase 4: Testing & Polish (Priority: Medium)
1. Test re-upload flow with various file types and sizes
2. Test error scenarios (network failures, validation errors)
3. Test concurrent re-upload attempts
4. Performance testing with large files
5. Security testing for authorization and validation

### 7. Technical Specifications

#### 7.1 API Endpoint
```
POST /api/transcripts/:id/re-upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Response: 200 OK with updated Conversation object
Error Responses: 400, 404, 413, 422, 500
```

#### 7.2 Database Operations
```typescript
// Validate conversation state
const conversation = await prisma.conversation.findFirst({
  where: { 
    id,
    userId,
    status: 'initial',
    storagePath: { in: [null, ''] }
  }
})

// Update conversation with new file metadata and storage path
const updatedConversation = await prisma.conversation.update({
  where: { id },
  data: {
    originalFilename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    storagePath: uploadResult.key,
    updatedAt: new Date()
  }
})
```

#### 7.3 Service Integration
```typescript
// Reuse existing upload services
const uploadResult = await storageService.uploadFile(audioFile, objectKey)
const transcriptText = await transcribeAudio(uploadResult.key, conversationId)
const summaryText = await summarizeTranscript(transcriptText, conversationId)
```

### 8. Error Recovery Scenarios

#### 8.1 Re-upload Failure Handling
- **Partial Success**: If R2 upload succeeds but processing fails, maintain R2 file
- **Complete Failure**: Reset conversation to original failed state
- **Network Issues**: Provide retry mechanism with exponential backoff
- **Validation Errors**: Clear error messages with specific guidance

#### 8.2 User Guidance
```jsx
// Error message examples
<div className="bg-red-50 border border-red-200 rounded-md p-4">
  <div className="flex">
    <div className="flex-shrink-0">
      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
    </div>
    <div className="ml-3">
      <h3 className="text-sm font-medium text-red-800">Re-upload Failed</h3>
      <div className="mt-2 text-sm text-red-700">
        <p>The file upload failed due to a network error. Please check your connection and try again.</p>
      </div>
      <div className="mt-4">
        <button onClick={handleRetry} className="text-sm text-red-600 hover:text-red-500 underline">
          Try Again
        </button>
      </div>
    </div>
  </div>
</div>
```

### 9. Success Metrics & Validation

#### 9.1 Functional Requirements
- [ ] Re-upload button appears for conversations with failed uploads
- [ ] File selection works with proper validation
- [ ] Re-upload process completes successfully
- [ ] Conversation state updates correctly after re-upload
- [ ] Processing pipeline (transcription/summarization) triggers automatically
- [ ] Error handling covers all failure scenarios

#### 9.2 Performance Requirements
- [ ] Re-upload time similar to initial upload
- [ ] No impact on existing upload functionality
- [ ] Graceful handling of large file uploads
- [ ] Proper cleanup of temporary resources

#### 9.3 User Experience Requirements
- [ ] Clear indication of failed upload state
- [ ] Intuitive re-upload workflow
- [ ] Helpful error messages with recovery guidance
- [ ] Loading states provide clear feedback
- [ ] Success state automatically updates UI

### 10. Future Enhancements

#### 10.1 Advanced Features
1. **Auto-retry Mechanism**: Automatic retry with exponential backoff
2. **Upload Progress**: Real-time upload progress indicator
3. **Drag & Drop**: Enhanced file selection UX
4. **Bulk Re-upload**: Select multiple failed conversations for re-upload
5. **Upload Resume**: Resume interrupted uploads from where they left off

#### 10.2 Integration Opportunities
1. **Notification System**: Email/push notifications for upload failures
2. **Analytics Dashboard**: Track upload failure rates and patterns
3. **Admin Tools**: Administrative re-upload and recovery tools
4. **Backup Storage**: Fallback storage options for high availability
5. **Quality Assessment**: Automatic file quality validation

### 11. Risk Assessment & Mitigation

#### 11.1 Technical Risks
- **Storage Consistency**: Ensure R2 storage state consistency during re-upload
- **Race Conditions**: Handle concurrent re-upload attempts safely
- **Memory Usage**: Manage memory efficiently during large file uploads
- **Error State Management**: Maintain clean error states without corruption

#### 11.2 Business Risks
- **User Confusion**: Clear UX to prevent user confusion about upload status
- **Cost Impact**: Monitor additional storage costs from failed uploads
- **Support Load**: Reduce support tickets related to upload failures
- **Data Loss**: Prevent loss of conversation metadata during re-upload

#### 11.3 Mitigation Strategies
- Implement comprehensive error handling and logging
- Add thorough validation at multiple levels
- Create clear user documentation and help resources
- Establish monitoring and alerting for upload failures
- Regular testing of re-upload functionality and edge cases