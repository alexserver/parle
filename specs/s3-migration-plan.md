# S3 Object Storage Migration Plan

## Overview

This specification outlines the migration from local file storage to Cloudflare R2 object storage for the Parle audio transcription application. The migration will create a service-oriented architecture for file handling while maintaining all existing functionality.

## Current Implementation Analysis

### Current File Storage Flow

```
1. File upload via Hono route (/apps/api/src/routes/upload.ts:17)
2. File validation (type, size)
3. Local disk storage (/data/uploads or ./uploads)
4. Database record creation with storagePath
5. Transcription and summarization processing
```

### Current Database Schema (Conversation model)

- `storagePath`: String - Currently stores local file path
- `originalFilename`: String - User's original filename
- `mimeType`: String - File MIME type
- `sizeBytes`: Int - File size

## Migration Goals

1. **Replace local disk storage with Cloudflare R2 object storage**
2. **Create a reusable StorageService for future extensibility**
3. **Maintain API compatibility with existing frontend**
4. **Secure credential management via environment variables**
5. **Preserve all existing functionality (validation, metadata)**

## Technical Implementation Plan

### 1. Dependencies and Infrastructure

#### New Dependencies

```json
{
  "@aws-sdk/client-s3": "^3.x.x",
  "@aws-sdk/lib-storage": "^3.x.x"
}
```

#### Environment Variables

Add these variables in `.env` and `.env.example` files in `/apps/api`

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=parle-audio-files
R2_REGION=auto
```

### 2. Service Layer Architecture

#### StorageService Interface

```typescript
// apps/api/src/services/storage/StorageService.ts
export interface StorageService {
  uploadFile(file: File, key: string): Promise<UploadResult>;
  deleteFile(key: string): Promise<void>;
  getFileUrl(key: string): Promise<string>;
  generatePresignedUrl(key: string, expiresIn?: number): Promise<string>;
}

export interface UploadResult {
  key: string;
  url: string;
  etag?: string;
  size: number;
}
```

#### R2StorageService Implementation

```typescript
// apps/api/src/services/storage/R2StorageService.ts
export class R2StorageService implements StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.R2_REGION || "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    this.bucketName = process.env.R2_BUCKET_NAME!;
  }

  async uploadFile(file: File, key: string): Promise<UploadResult>;
  async deleteFile(key: string): Promise<void>;
  async getFileUrl(key: string): Promise<string>;
  async generatePresignedUrl(key: string, expiresIn = 3600): Promise<string>;
}
```

#### Storage Factory

```typescript
// apps/api/src/services/storage/StorageFactory.ts
export class StorageFactory {
  static createStorageService(): StorageService {
    // Future extensibility: could switch between R2, S3, local, etc.
    return new R2StorageService();
  }
}
```

### 3. Database Schema Changes

#### Option A: Minimal Changes (Recommended)

Keep existing `storagePath` field but change its semantic meaning:

- **Before**: Local file path (`/data/uploads/filename.mp3`)
- **After**: R2 object key (`audio/2024/10/conversation-id.mp3`)

#### Option B: Explicit Schema Migration

Add new fields and deprecate `storagePath`:

```prisma
model Conversation {
  // ... existing fields
  storagePath      String  // Keep for backward compatibility
  storageKey       String? // New R2 object key
  storageProvider  String? @default("r2") // Future extensibility
  // ... rest of fields
}
```

### 4. File Naming Strategy

#### Object Key Format

```
uploads/user/{userId}/{conversationId}.{extension}
```

#### Example Keys

```
uploads/user/cm2user123/cm2abc123.mp3
uploads/user/cm2user456/cm2def456.m4a
```

#### Benefits

- User-specific organization for access control and management
- Conversation ID ensures uniqueness and easy database correlation
- Simple, clean structure within user directories
- Easy to implement user-based file listing and cleanup
- Supports future user-based access controls and quotas

### 5. Upload Route Refactoring

#### Current Flow Modification

```typescript
// apps/api/src/routes/upload.ts
import { StorageFactory } from "../services/storage/StorageFactory";

upload.post("/", async (c) => {
  // ... existing validation logic

  const storageService = StorageFactory.createStorageService();

  // Generate object key with user-based path
  const objectKey = `uploads/user/${userId}/${conversation.id}${fileExtension}`;

  // Upload to R2 instead of local storage
  const uploadResult = await storageService.uploadFile(audioFile, objectKey);

  // Create conversation record with R2 key
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      originalFilename: audioFile.name,
      storagePath: uploadResult.key, // Store R2 key instead of local path
      mimeType: audioFile.type,
      sizeBytes: audioFile.size,
      status: "initial",
    },
  });

  // ... rest of processing logic
});
```

### 6. Transcription Service Updates

#### File Access Pattern Change

```typescript
// apps/api/src/services/transcribe.ts
export async function transcribeAudio(
  storageKey: string,
  conversationId: string
): Promise<string> {
  const storageService = StorageFactory.createStorageService();

  // Generate presigned URL for OpenAI Whisper access
  const fileUrl = await storageService.generatePresignedUrl(storageKey, 3600); // 1 hour

  // Use URL with OpenAI Whisper API instead of local file path
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(fileUrl), // or direct URL if supported
    model: "whisper-1",
  });

  return transcription.text;
}
```

### 7. Environment Configuration

#### Development Environment (.env.development)

```bash
# Local development - can use R2 or fallback to local storage
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=dev_account_id
R2_ACCESS_KEY_ID=dev_access_key
R2_SECRET_ACCESS_KEY=dev_secret_key
R2_BUCKET_NAME=parle-dev-audio
R2_REGION=auto
```

#### Production Environment (.env.production)

```bash
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=prod_account_id
R2_ACCESS_KEY_ID=prod_access_key
R2_SECRET_ACCESS_KEY=prod_secret_key
R2_BUCKET_NAME=parle-prod-audio
R2_REGION=auto
```

### 8. Migration Strategy

#### Phase 1: Service Implementation

1. Implement StorageService interface and R2StorageService
2. Create StorageFactory
3. Add environment variable configuration
4. Write unit tests for storage service

#### Phase 2: Upload Route Integration

1. Modify upload route to use StorageService
2. Update file key generation logic
3. Test upload functionality with R2

#### Phase 3: Transcription Service Updates

1. Update transcribeAudio to work with R2 object keys
2. Implement presigned URL generation for OpenAI access
3. Test end-to-end transcription flow

#### Phase 4: Cleanup and Optimization

1. Remove local file handling code
2. Add cleanup jobs for temporary files
3. Implement file lifecycle management

### 9. Error Handling and Resilience

#### Storage Service Error Types

```typescript
export class StorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
  }
}

export class UploadFailedError extends StorageError {}
export class FileNotFoundError extends StorageError {}
export class AccessDeniedError extends StorageError {}
```

#### Retry Logic

- Implement exponential backoff for upload failures
- Graceful degradation for transcription service access
- Proper error logging and monitoring

### 10. Security Considerations

#### Access Control

- R2 bucket should not be publicly accessible
- Use presigned URLs for temporary access
- Implement proper IAM roles and policies

#### Data Protection

- Files are automatically encrypted at rest by R2
- Consider client-side encryption for sensitive audio
- Implement proper file cleanup policies

### 11. Performance Optimizations

#### Upload Optimizations

- Use multipart uploads for large files (>5MB)
- Implement upload progress tracking
- Add client-side compression options

#### Access Optimizations

- Cache presigned URLs for repeated access
- Implement CDN integration if needed
- Consider streaming uploads for better UX

### 12. Monitoring and Observability

#### Metrics to Track

- Upload success/failure rates
- File processing times
- Storage costs and usage
- API response times

#### Logging Enhancement

```typescript
// Enhanced logging for storage operations
logger.storageUploadStart(conversationId, originalFilename, fileSize);
logger.storageUploadSuccess(conversationId, objectKey, uploadTime);
logger.storageUploadFailure(conversationId, errorCode, errorMessage);
```

### 13. Testing Strategy

#### Manual Testing (MVP Approach)

- End-to-end upload and transcription flow testing
- R2 connectivity and authentication verification
- File upload with various file sizes and formats
- Error handling scenarios (network failures, invalid credentials)
- Presigned URL generation and access validation

#### Performance Testing

- Upload performance with various file sizes
- Concurrent upload handling
- Network failure recovery

#### Future Testing Enhancement

Consider implementing a unit testing suite using:
- **Bun's built-in test runner** (already available in the project)
- **Vitest** for fast unit testing with TypeScript support
- **Jest** for comprehensive testing with mocking capabilities

Recommended test structure:
```
apps/api/src/
├── services/
│   ├── storage/
│   │   ├── __tests__/
│   │   │   ├── R2StorageService.test.ts
│   │   │   └── StorageFactory.test.ts
```

### 14. Cost Optimization

#### R2 Pricing Considerations

- Storage costs: $0.015/GB/month
- Request costs: Free egress for first 10GB/month
- Operation costs: $4.50 per million Class A operations

#### Optimization Strategies

- Implement file lifecycle policies
- Archive old files to cheaper storage tiers
- Monitor and alert on unusual usage patterns

### 15. Rollback Plan

#### Rollback Strategy

1. Keep local storage code as fallback during initial deployment
2. Feature flag for storage provider selection
3. Simple configuration rollback to local storage

#### Emergency Procedures

- Immediate fallback to local storage
- Service degradation handling
- R2 connectivity issue mitigation

## Implementation Timeline

### Week 1: Foundation

- [ ] Implement StorageService interface and R2StorageService
- [ ] Set up environment configuration
- [ ] Create unit tests

### Week 2: Integration

- [ ] Modify upload route to use StorageService
- [ ] Update transcription service for R2 access
- [ ] End-to-end testing

### Week 3: Cleanup and Optimization

- [ ] Remove local file handling code
- [ ] Performance optimizations
- [ ] Monitoring and logging enhancements

### Week 4: Production Deployment

- [ ] Production environment setup
- [ ] Gradual rollout with feature flags
- [ ] Monitoring and cleanup

## Success Criteria

1. **Functional**: All existing upload and transcription functionality works with R2
2. **Performance**: Upload and processing times remain comparable or improve
3. **Reliability**: 99.9% upload success rate
4. **Security**: No data breaches or unauthorized access
5. **Cost**: Storage costs remain within budget projections
6. **Maintainability**: Code is clean, testable, and well-documented

## Future Enhancements

1. **Multi-cloud support**: Extend StorageService for AWS S3, Google Cloud Storage
2. **CDN integration**: Add CloudFlare CDN for faster file access
3. **Advanced processing**: Implement audio format conversion and optimization
4. **Backup strategy**: Automated backups to secondary storage
5. **Analytics**: File usage analytics and optimization recommendations

---

This migration will modernize the file storage architecture while maintaining system reliability and providing a foundation for future enhancements.
