# Delete Conversation Feature Specification

## Overview
Add a delete action for conversations/transcripts in the transcripts page, allowing users to permanently remove conversations along with their associated data from both the database and R2 storage bucket.

## Current State Analysis

### UI Structure
- **TranscriptsPage.tsx** (`/Users/alexserver/Code/ai-gen/parle/apps/web/src/pages/TranscriptsPage.tsx:176-187`): Contains a table with "View Details" button in the Actions column
- Currently only has one action: "View Details" link to individual transcript

### Data Model
- **Conversation Model** (`/Users/alexserver/Code/ai-gen/parle/apps/api/prisma/schema.prisma:33-54`):
  - `id`: String (primary key)
  - `storagePath`: String (R2 bucket object key)
  - `userId`: String (foreign key to User)
  - Other fields: originalFilename, mimeType, sizeBytes, status, etc.

### Storage Integration
- **R2StorageService** (`/Users/alexserver/Code/ai-gen/parle/apps/api/src/services/storage/R2StorageService.ts:174-194`): Has `deleteFile(key: string)` method
- **StorageFactory** creates R2StorageService instances

### API Structure
- **Transcripts API** (`/Users/alexserver/Code/ai-gen/parle/apps/api/src/routes/transcripts.ts`): Currently has GET endpoints only
- Authentication middleware applied to all transcript routes

## Feature Requirements

### 1. Backend API Changes

#### 1.1 Delete Endpoint
**File:** `/Users/alexserver/Code/ai-gen/parle/apps/api/src/routes/transcripts.ts`

Add new DELETE endpoint:
```typescript
transcripts.delete('/:id', async (c) => {
  // Implementation details below
})
```

**Functionality:**
- Validate user authentication and ownership
- Retrieve conversation to get `storagePath` and `status`
- **Conditional R2 deletion:** Only delete from R2 bucket if:
  - `status !== 'initial'` AND
  - `storagePath` is not null/empty
- Always delete conversation record from database
- Handle errors gracefully (file not found, access denied, etc.)
- Return appropriate HTTP status codes

**R2 Deletion Logic:**
```typescript
// Only attempt R2 deletion if file was successfully uploaded
if (conversation.status !== 'initial' && conversation.storagePath) {
  await storageService.deleteFile(conversation.storagePath)
}
```

**Error Handling:**
- 404: Conversation not found or user doesn't own it
- 403: Access denied
- 500: Internal server error (storage or database failure)
- **Partial failure handling:** 
  - If R2 deletion fails but DB deletion succeeds (or vice versa)
  - **Special case:** If conversation has `status='initial'`, skip R2 deletion entirely and only delete DB record
  - Log when R2 deletion is skipped due to initial status

#### 1.2 Transaction Considerations
- Use database transactions when possible
- Consider implementing soft delete initially, then hard delete later
- Log all deletion attempts for auditing

### 2. Frontend Changes

#### 2.1 UI Updates
**File:** `/Users/alexserver/Code/ai-gen/parle/apps/web/src/pages/TranscriptsPage.tsx`

**Location:** Actions column (line 176-187)

**Current:**
```jsx
<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
  <Link to={`/transcripts/${transcript.id}`} className="...">
    View Details
  </Link>
</td>
```

**Proposed:**
```jsx
<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
  <div className="flex space-x-3">
    <Link to={`/transcripts/${transcript.id}`} className="...">
      View Details
    </Link>
    <button 
      onClick={() => handleDeleteConversation(transcript.id)} 
      className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-md transition-colors"
    >
      Delete
    </button>
  </div>
</td>
```

#### 2.2 Delete Confirmation Modal
Create a confirmation modal component to prevent accidental deletions:

**Features:**
- Show conversation filename
- Warn about permanent deletion
- Require explicit confirmation (typed confirmation or checkbox)
- Show loading state during deletion
- Handle errors and display user-friendly messages

#### 2.3 Frontend API Integration
**File:** `/Users/alexserver/Code/ai-gen/parle/apps/web/src/api.ts`

Add new API function:
```typescript
export const deleteConversation = async (id: string, token: string | null): Promise<void> => {
  // Implementation
}
```

#### 2.4 Context Updates
**File:** `/Users/alexserver/Code/ai-gen/parle/apps/web/src/contexts/TranscriptContext.tsx`

Add delete functionality to context:
```typescript
interface TranscriptContextType {
  // ... existing properties
  deleteTranscript: (id: string) => Promise<void>
}
```

**Implementation:**
- Call delete API
- Remove transcript from local state on success
- Handle errors appropriately
- Show success/error notifications

### 3. User Experience Considerations

#### 3.1 Progressive Enhancement
1. **Phase 1:** Basic delete button with simple confirmation
2. **Phase 2:** Enhanced modal with better UX
3. **Phase 3:** Bulk delete functionality (future consideration)

#### 3.2 Accessibility
- Proper ARIA labels for delete buttons
- Keyboard navigation support
- Screen reader friendly confirmation dialogs
- Color contrast compliance for red delete button

#### 3.3 Loading States
- Disable delete button during deletion
- Show loading spinner/indicator
- Prevent multiple deletion attempts

#### 3.4 Error Handling
- Network errors
- Permission errors
- Partial deletion failures
- User-friendly error messages

### 4. Security Considerations

#### 4.1 Authorization
- Verify user owns the conversation before deletion
- Use existing auth middleware
- No admin override initially (users can only delete their own conversations)

#### 4.2 Audit Trail
- Log all deletion attempts with user ID, conversation ID, timestamp
- Include success/failure status in logs
- Consider keeping deletion records for compliance

#### 4.3 Rate Limiting
- Implement reasonable rate limits for delete operations
- Prevent bulk deletion abuse

### 5. Implementation Plan

#### Phase 1: Backend API (Priority: High)
1. Add DELETE endpoint to transcripts router
2. Implement conversation ownership validation
3. Add R2 storage deletion logic
4. Add database deletion logic
5. Implement error handling and logging
6. Add basic tests

#### Phase 2: Frontend Integration (Priority: High)
1. Add delete button to TranscriptsPage
2. Create basic confirmation dialog
3. Add deleteConversation API function
4. Update TranscriptContext with delete functionality
5. Implement optimistic UI updates
6. Add error handling and user feedback

#### Phase 3: Enhanced UX (Priority: Medium)
1. Create better confirmation modal component
2. Add loading states and progress indicators
3. Implement success/error notifications
4. Add accessibility improvements
5. Enhanced error messaging

#### Phase 4: Testing & Polish (Priority: Medium)
1. Manual testing of delete flow
2. Test error scenarios (network failures, permission errors)
3. Performance testing for bulk operations
4. Security testing

### 6. Technical Specifications

#### 6.1 API Endpoint
```
DELETE /api/transcripts/:id
Authorization: Bearer <token>
Response: 204 No Content (success) | 404 Not Found | 403 Forbidden | 500 Internal Server Error
```

#### 6.2 Database Operations
```sql
-- Verify ownership, existence, and get storage info
SELECT id, storagePath, status FROM conversations WHERE id = ? AND userId = ?

-- Delete conversation (always performed regardless of status)
DELETE FROM conversations WHERE id = ? AND userId = ?
```

#### 6.3 Storage Operations
```typescript
// Conditional delete from R2 bucket - only if file was uploaded successfully
if (conversation.status !== 'initial' && conversation.storagePath) {
  await storageService.deleteFile(conversation.storagePath)
} else {
  logger.info('Skipping R2 deletion for conversation with initial status', { 
    conversationId: conversation.id, 
    status: conversation.status, 
    hasStoragePath: !!conversation.storagePath 
  })
}
```

### 7. Testing Strategy

#### 7.1 Manual Testing Checklist
- [ ] Delete button appears in transcripts table
- [ ] Confirmation dialog shows correct information
- [ ] Successful deletion removes item from list
- [ ] **File deleted from R2 bucket (for non-initial status conversations)**
- [ ] **R2 deletion skipped for conversations with status='initial'**
- [ ] **Database record removed regardless of status**
- [ ] Error handling for network failures
- [ ] Error handling for permission errors
- [ ] Loading states work correctly
- [ ] Accessibility compliance
- [ ] **Test deleting conversations with different statuses:**
  - [ ] status='initial' (should skip R2 deletion)
  - [ ] status='transcribed' (should delete from R2)
  - [ ] status='summarized' (should delete from R2)
  - [ ] status='failed' (should delete from R2 if storagePath exists)

### 8. Rollback Plan

#### 8.1 Feature Flags
- Consider implementing feature flag for delete functionality
- Allow quick disable if issues arise

#### 8.2 Database Backup
- Ensure regular database backups before deployment
- Document recovery procedure for accidental deletions

#### 8.3 Soft Delete Option
- Consider implementing soft delete initially
- Hard delete can be implemented later for permanent removal

### 9. Success Metrics

- [ ] Delete functionality works without errors
- [ ] No orphaned files in R2 bucket
- [ ] No orphaned database records
- [ ] User feedback is positive
- [ ] Performance impact is minimal
- [ ] Security audit passes

### 10. Future Enhancements

1. **Bulk Delete:** Select multiple conversations for deletion
2. **Recycle Bin:** Temporary storage for deleted conversations with restore option
3. **Admin Tools:** Administrative deletion capabilities
4. **Export Before Delete:** Option to download/export conversation before deletion
5. **Deletion Analytics:** Track deletion patterns for product insights