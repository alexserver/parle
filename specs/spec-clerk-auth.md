# Clerk Authentication Integration Specification

## Overview

This specification outlines the implementation plan for integrating Clerk authentication into the Parle Audio Transcriber application, enabling user accounts and data isolation so each user only sees their own transcripts.

## Current State Analysis

- **Frontend**: React app with React Router, no authentication
- **Backend**: Hono API with PostgreSQL/Prisma, no user context
- **Database**: Conversation model without user association
- **Security**: No access control or user data isolation

## Goals

- Add user authentication with sign-in/sign-up flows
- Implement user data isolation (users only see their own transcripts)
- Maintain existing functionality and user experience
- Ensure secure API endpoints with JWT verification

---

## Implementation Plan

### Phase 1: Frontend Authentication Setup

#### 1.1 Install Dependencies

```bash
cd apps/web
npm install @clerk/clerk-react
```

#### 1.2 Environment Configuration

Add to `apps/web/.env` and `apps/web/.env.example` (create files if don't exist):

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

#### 1.3 App Structure Updates

**File: `apps/web/src/main.tsx`**

- Wrap app with ClerkProvider
- Import Clerk publishable key from environment

**File: `apps/web/src/App.tsx`**

- Create new public landing page component for route `/`
- Move current HomePage content to new `/dashboard` route (protected)
- Add protected route wrapper for authenticated pages (`/dashboard`, `/upload`, `/transcripts`)
- Keep landing page (/) public with app info and sign-in prompts

#### 1.4 Page Component Creation

**New File: `apps/web/src/pages/LandingPage.tsx`**

- Create public landing page with app information
- Include sign-in/sign-up call-to-action buttons
- Add feature highlights and benefits
- Responsive design for marketing content

**New File: `apps/web/src/pages/DashboardPage.tsx`**

- Move current HomePage content here
- Rename component from HomePage to DashboardPage  
- Update navigation references and imports
- Keep all existing functionality (recent transcripts, quick actions)

#### 1.5 Layout Component Updates

**File: `apps/web/src/components/Layout.tsx`**

- Add Clerk auth components:
  - `SignedOut` with `SignInButton`
  - `SignedIn` with `UserButton`
- Update navigation to show different items based on auth state:
  - **Unauthenticated**: Show "Home", "Sign In" 
  - **Authenticated**: Show "Dashboard", "Upload", "Transcripts", User Menu
- Add user profile section in header

#### 1.6 Route Protection

- Create `ProtectedRoute` component
- Wrap dashboard, upload and transcripts routes  
- Redirect unauthenticated users to landing page or sign-in
- Update route configuration in App.tsx

### Phase 2: Backend Authentication Integration

#### 2.1 API Dependencies

```bash
cd apps/api
npm install @clerk/clerk-sdk-node
```

#### 2.2 Environment Configuration

Add to `apps/api/.env`:

```
CLERK_SECRET_KEY=sk_test_your_secret_key_here
CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

#### 2.3 Authentication Middleware

**File: `apps/api/src/middleware/auth.ts`**

- Create Clerk auth middleware for Hono
- Verify JWT tokens from requests
- Extract user ID and attach to context
- Handle authentication errors

#### 2.4 API Route Protection

**Files to update:**

- `apps/api/src/routes/upload.ts`
- `apps/api/src/routes/transcripts.ts`

Add authentication middleware to protect these routes.

### Phase 3: Database Schema Migration

#### 3.1 Schema Updates

**File: `apps/api/prisma/schema.prisma`**

Add user association to Conversation model:

```prisma
model Conversation {
  id               String          @id @default(cuid())
  userId           String          // New field - Clerk user ID
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

  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])
  @@index([userId])                    // New index
  @@index([userId, createdAt(sort: Desc)]) // New composite index
}
```

#### 3.2 Migration Strategy

1. **Generate migration**: `npx prisma migrate dev --name add-user-id-to-conversations`
2. **Handle existing data**:
   - Option A: Delete existing conversations (if acceptable)
   - Option B: Create system user ID for existing records
   - Option C: Make userId optional initially, then migrate

### Phase 4: Data Isolation Implementation

#### 4.1 Upload Route Updates

**File: `apps/api/src/routes/upload.ts`**

- Extract userId from authenticated request
- Include userId when creating conversation records
- Ensure user context in all database operations

#### 4.2 Transcripts Route Updates

**File: `apps/api/src/routes/transcripts.ts`**

- Filter all queries by authenticated user's ID
- Update both list and detail endpoints
- Add user context to error logging

#### 4.3 Frontend Context Updates

**File: `apps/web/src/contexts/TranscriptContext.tsx`**

- Integrate Clerk's `useUser` and `useAuth` hooks
- Pass authentication headers to API calls
- Handle loading states during authentication

#### 4.4 API Client Updates

**File: `apps/web/src/api.ts`**

- Add authentication headers to all requests
- Handle 401 responses appropriately
- Include Clerk session token in requests

### Phase 5: User Experience Enhancements

#### 5.1 Authentication UI

- Sign-in page with Clerk components
- Sign-up flow integration
- User profile management
- Loading states during auth

#### 5.2 Navigation Updates

- Show different navigation for authenticated/unauthenticated users:
  - **Public**: Landing page, Sign In/Sign Up buttons
  - **Authenticated**: Dashboard, Upload, Transcripts, User profile menu
- Add user menu with profile, settings, sign out
- Update navigation highlighting for `/dashboard` instead of `/`
- Ensure proper routing between public and protected areas

#### 5.3 Error Handling

- Handle authentication failures gracefully
- Provide clear messaging for auth-required actions
- Redirect flows for expired sessions

### Phase 6: Testing & Security Validation

#### 6.1 Authentication Flow Testing

- [ ] Sign-up new user flow
- [ ] Sign-in existing user flow
- [ ] Sign-out functionality
- [ ] Session persistence across browser refresh
- [ ] Protected route access control

#### 6.2 Data Isolation Testing

- [ ] User A cannot access User B's transcripts
- [ ] API endpoints properly filter by user ID
- [ ] Database queries include user context
- [ ] Upload associates with correct user

#### 6.3 Security Testing

- [ ] JWT token validation on API
- [ ] Unauthorized API access returns 401
- [ ] No data leakage between users
- [ ] Proper error handling without info disclosure

---

## Technical Considerations

### Authentication Flow

1. User signs in via Clerk component
2. Clerk issues JWT token stored in browser
3. Frontend includes token in API requests
4. Backend validates token and extracts user ID
5. All database operations filtered by user ID

### Migration Strategy

For existing conversations without user IDs:

- **Recommended**: Create system/admin user and assign existing conversations
- **Alternative**: Delete existing conversations if data loss is acceptable
- **Complex**: Implement user claim process for existing conversations

### Performance Considerations

- Add database indexes on userId fields
- Consider pagination for user transcript lists
- Cache user authentication state appropriately
- Monitor query performance with user filtering

### Error Scenarios

- Handle Clerk service outages gracefully
- Provide offline-friendly messaging
- Clear error messages for auth failures
- Fallback UI for authentication issues

---

## Success Criteria

### Functional Requirements ✅

- [ ] Users can sign up and sign in
- [ ] Only authenticated users can upload files
- [ ] Users only see their own transcripts
- [ ] All existing functionality preserved
- [ ] Secure API endpoints

### Non-Functional Requirements ✅

- [ ] Fast authentication flow (< 2s)
- [ ] Secure JWT validation
- [ ] Proper error handling
- [ ] Mobile-responsive auth UI
- [ ] Accessible authentication components

### Security Requirements ✅

- [ ] No cross-user data access
- [ ] Proper JWT validation
- [ ] Secure token storage
- [ ] API route protection
- [ ] Input validation maintained

---

## Risk Assessment

### High Risk 🔴

- **Data Migration**: Existing conversations need user association
- **Breaking Changes**: Authentication requirement changes user flow

### Medium Risk 🟡

- **Third-party Dependency**: Reliance on Clerk service availability
- **JWT Validation**: Proper token verification implementation

### Low Risk 🟢

- **UI Integration**: Clerk provides well-tested React components
- **Documentation**: Clerk has comprehensive integration guides

---

## Post-Implementation

### Monitoring

- Track authentication success/failure rates
- Monitor API response times with auth overhead
- User adoption and conversion metrics

### Future Enhancements

- Multi-factor authentication
- Team/organization support
- Advanced user management
- SSO integration options

### Maintenance

- Regular Clerk SDK updates
- Monitor authentication performance
- Review and rotate API keys
- User feedback integration
