# Authentication Migration Plan: Clerk to Database JWT

## Overview
Replace Clerk authentication with a self-contained database-based JWT authentication system. This removes external dependencies and provides full control over user management.

## Phase 1: Database Schema Changes

### 1.1 Add User Model to Prisma Schema
```prisma
enum UserRole {
  admin
  member
}

enum UserPlan {
  free
  paid
}

model User {
  id        String   @id @default(cuid())
  username  String   @unique
  email     String   @unique
  password  String   // bcrypt hashed
  role      UserRole @default(member)
  plan      UserPlan @default(free)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  conversations Conversation[]
}
```

### 1.2 Update Conversation Model
```prisma
model Conversation {
  id               String           @id @default(cuid())
  originalFilename String
  storagePath      String
  mimeType         String
  sizeBytes        Int
  durationSec      Int?
  status           TranscriptStatus @default(initial)
  transcriptText   String?
  summaryText      String?
  errorMessage     String?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  userId           String
  user             User             @relation(fields: [userId], references: [id])

  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])
  @@index([userId])
  @@index([userId, createdAt(sort: Desc)])
}
```

### 1.3 Database Migration
- Create Prisma migration file
- Handle existing Conversation records (assign to admin user)
- Add indexes for performance

### 1.4 Database Seeding
Create `prisma/seed.ts` with initial admin user:
```typescript
const adminUser = {
  username: 'admin',
  email: 'admin@parle.local',
  password: await bcrypt.hash('admin123', 10),
  role: 'admin',
  plan: 'paid'
}
```

## Phase 2: Backend Changes

### 2.1 Package Management
**Remove:**
- `@clerk/clerk-sdk-node`

**Add:**
- `jsonwebtoken`
- `@types/jsonwebtoken` (dev)
- `bcryptjs`
- `@types/bcryptjs` (dev)

### 2.2 Environment Variables
**Remove from both `.env.example` and `.env`:**
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`

**Add to both `.env.example` and `.env`:**
- `JWT_SECRET=your-super-secret-jwt-key-here` (use strong secret in .env)

### 2.3 New Services

**`src/services/auth.ts`:**
- `validateCredentials(username, password)` - verify against database
- `generateToken(user)` - create JWT with user info
- `verifyToken(token)` - decode and validate JWT
- `hashPassword(password)` - bcrypt hashing utility

**`src/services/user.ts`:**
- `getUserById(id)` - fetch user from database
- `getUserByUsername(username)` - fetch user by username
- Role and plan checking utilities

### 2.4 New Routes

**`src/routes/auth.ts`:**
- `POST /login` - authenticate user and return JWT
- Input validation with Zod
- Rate limiting considerations

### 2.5 Updated Middleware

**`src/middleware/auth.ts`:**
- Replace Clerk validation with JWT validation
- Extract user from database using token payload
- Attach user object to request context
- Handle token expiration gracefully

### 2.6 Update Existing Routes
- Remove Clerk imports from all route files
- Update to use new auth middleware
- Access user via context instead of Clerk user object

## Phase 3: Frontend Changes

### 3.1 Package Management
**Remove:**
- `@clerk/clerk-react`

### 3.2 New Auth System

**`src/contexts/AuthContext.tsx`:**
- JWT-based authentication state
- Login/logout functions
- Token storage in localStorage
- Auto-refresh on app load

**`src/components/LoginForm.tsx`:**
- Simple username/password form
- Form validation
- Error handling
- Redirect after successful login

**`src/components/ProtectedRoute.tsx`:**
- Replace Clerk auth check with JWT validation
- Redirect to login if no valid token
- Handle token expiration

### 3.3 Update API Client

**`src/api.ts`:**
- Remove Clerk user ID from headers
- Add Authorization Bearer token to all requests
- Handle 401 responses (redirect to login)
- Remove dependency on Clerk auth state

### 3.4 Update Components
- Remove all `useAuth` from Clerk
- Replace with custom `useAuth` hook
- Update any user information display
- Remove Clerk-specific UI components

### 3.5 Update App Structure

**`src/main.tsx`:**
- Remove ClerkProvider
- Add AuthProvider

**`src/App.tsx`:**
- Add login route
- Update protected routes structure

## Phase 4: Data Migration

### 4.1 Handle Existing Data
- Assign all existing conversations to the admin user
- Ensure no orphaned records
- Update any hardcoded user references

### 4.2 Testing Data
- Verify login flow works
- Test protected routes
- Verify API authentication
- Test token expiration handling

## Implementation Order

1. **Database First**: Update schema, migrate, seed
2. **Backend Auth**: New services and middleware
3. **Backend Routes**: Update existing routes to use new auth
4. **Frontend Auth**: New auth context and components
5. **Frontend Integration**: Update all components
6. **Testing**: Verify complete flow works

## Security Considerations

- Strong JWT secret (min 32 characters)
- Reasonable token expiration (24 hours)
- Password hashing with bcrypt (salt rounds: 10)
- Secure token storage (httpOnly cookies vs localStorage)
- Input validation on all auth endpoints
- Rate limiting on login endpoint

## Future Enhancements

- Role-based route protection
- Plan-based feature limits
- Password reset functionality
- Session management
- User profile management
- Admin panel for user management

## Testing Checklist

- [ ] Database migration successful
- [ ] Admin user seeded correctly
- [ ] Login endpoint works
- [ ] JWT tokens generated properly
- [ ] Protected routes require authentication
- [ ] Frontend login form functional
- [ ] API calls include proper headers
- [ ] Token expiration handled gracefully
- [ ] Logout clears authentication state
- [ ] Existing conversations still accessible

## Rollback Plan

If issues occur:
1. Revert database schema changes
2. Restore Clerk packages and configuration
3. Restore original auth middleware
4. Restore Clerk frontend components

## Deployment Notes

- Update production environment variables
- Run database migration in production
- Test authentication flow in production
- Monitor for authentication errors
- Have rollback plan ready

---

**This plan provides a complete self-contained authentication system with user roles and plans, removing all Clerk dependencies while maintaining security and scalability.**