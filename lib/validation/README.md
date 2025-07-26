# CineMini Validation & Security System

A comprehensive input validation and data protection system designed to protect against common security vulnerabilities including SQL Injection, XSS attacks, CSRF, IDOR, and data exposure.

## Overview

The validation system provides multiple layers of security:

1. **Input Validation** - Zod-based schema validation with sanitization
2. **Data Sanitization** - XSS prevention and input cleaning
3. **SQL Injection Prevention** - Parameterized queries and secure database helpers
4. **Data Encryption** - Utilities for sensitive data at rest and in transit
5. **IDOR Protection** - Resource access validation and ownership enforcement
6. **Error Handling** - Secure error responses that prevent information leakage
7. **Request Logging** - Comprehensive security monitoring and audit trails
8. **Rate Limiting** - Protection against abuse and DoS attacks

## Quick Start

### Basic API Route with Security

```typescript
import { createSecureAPI, gameSchemas } from '@/lib/validation'

export const POST = createSecureAPI(
  async (request, validated) => {
    const { body, context } = validated
    const userId = context.userId!
    
    // Your business logic here
    // All input is already validated and sanitized
    
    return NextResponse.json({ success: true })
  },
  {
    body: gameSchemas.retitledGuess,
    requireAuth: true,
    resourceType: 'retitled_guesses',
    resourceAction: 'write'
  }
)
```

### Client-Side Validation

```typescript
import { ClientValidator, gameSchemas } from '@/lib/validation'

// Validate form data
const result = ClientValidator.validate(gameSchemas.retitledGuess, formData)

if (!result.success) {
  console.error('Validation errors:', result.fieldErrors)
  return
}

// Use validated data
const validatedData = result.data
```

## Core Components

### 1. Validation Schemas (`schemas.ts`)

Zod-based schemas for all API endpoints and data types:

```typescript
import { retitledGuessSchema, userProfileSchema } from '@/lib/validation'

// Game guess validation
const guessData = retitledGuessSchema.parse(input)

// User profile validation
const profileData = userProfileSchema.parse(input)
```

**Key Features:**
- UUID validation
- Email and password validation
- Movie ID and TMDB ID validation
- Country code validation
- Text sanitization schemas
- File upload validation

### 2. Data Sanitization (`sanitization.ts`)

Comprehensive input cleaning and XSS prevention:

```typescript
import { DataSanitizer } from '@/lib/validation'

// Sanitize text input
const clean = DataSanitizer.sanitizeText(userInput)

// Sanitize HTML content
const safeHtml = DataSanitizer.sanitizeHtml(htmlContent)

// Sanitize entire objects
const cleanObj = DataSanitizer.sanitizeObject(inputObject)
```

**Protection Against:**
- XSS attacks via HTML/script injection
- SQL injection patterns
- Control character injection
- File name exploits
- URL manipulation

### 3. Secure Database Operations (`database.ts`)

Parameterized queries with automatic RLS enforcement:

```typescript
import { SecureDatabase, createSecureQueryBuilder } from '@/lib/validation'

// User-owned data operations
const userData = await SecureDatabase.getUserData(userId, 'user_favorites')
await SecureDatabase.updateUserData(userId, 'user_profiles', updateData)

// Public data access
const publicData = await SecureDatabase.getPublicData('movies', filters)

// Advanced queries with query builder
const queryBuilder = await createSecureQueryBuilder(securityContext)
const result = await queryBuilder.select('users', '*', { active: true })
```

**Security Features:**
- Automatic ownership filtering
- Table name validation (whitelist)
- Column name validation
- Parameter sanitization
- RLS policy enforcement

### 4. Data Encryption (`encryption.ts`)

Utilities for encrypting sensitive data:

```typescript
import { DataEncryption, EnvironmentEncryption } from '@/lib/validation'

// Encrypt sensitive data
const encrypted = DataEncryption.encrypt(plaintext, password)
const decrypted = DataEncryption.decrypt(encrypted, password)

// Password hashing
const { hash, salt } = DataEncryption.hashPassword(password)
const isValid = DataEncryption.verifyPassword(password, hash, salt)

// Environment-based encryption
const encrypted = EnvironmentEncryption.encryptWithEnvKey(data, 'ENCRYPTION_KEY')
```

**Features:**
- AES-256-GCM encryption
- Secure password hashing with scrypt
- HMAC message authentication
- Secure token generation
- Session token management
- API key generation and validation

### 5. IDOR Protection (`idor-protection.ts`)

Prevents unauthorized access to resources:

```typescript
import { IDORProtection, withIDORProtection } from '@/lib/validation'

// Check resource access
const protection = await IDORProtection.checkResourceAccess(
  userId,
  'user_profiles',
  resourceId,
  'read'
)

if (!protection.allowed) {
  return unauthorized()
}

// Middleware wrapper
export const GET = withIDORProtection('user_profiles', 'id', 'read')(
  async (request, context) => {
    // Handler with automatic IDOR protection
  }
)
```

**Protection Features:**
- Resource ownership validation
- Permission-based access control
- Admin override capabilities
- Cross-resource access validation
- Bulk operation filtering

### 6. Error Handling (`error-handling.ts`)

Secure error responses that don't leak information:

```typescript
import { SecureErrorHandler, ErrorCategory, ErrorSeverity } from '@/lib/validation'

// Handle different error types
return SecureErrorHandler.handleValidationError(errors, context)
return SecureErrorHandler.handleAuthError(error, context)
return SecureErrorHandler.handleDatabaseError(error, context)
```

**Security Features:**
- Information leakage prevention
- Error categorization and severity levels
- Security event logging
- Development vs production error details
- Standardized error response format

### 7. Request Logging (`logging.ts`)

Comprehensive security monitoring:

```typescript
import { SecurityLogger, withRequestLogging } from '@/lib/validation'

// Log security events
SecurityLogger.logSecurityEvent('LOGIN_ATTEMPT', request, {
  userId,
  severity: 'medium',
  description: 'Failed login attempt',
  details: { reason: 'invalid_password' }
})

// Performance monitoring
SecurityLogger.logPerformanceMetrics({
  requestId,
  endpoint: '/api/games',
  duration: 150,
  dbQueries: 3
})
```

**Logging Features:**
- Request/response logging
- Security event tracking
- Performance metrics
- Authentication events
- Database operation logging
- Rate limit violations

### 8. Client-Side Validation (`client.ts`)

XSS-safe client validation with React hooks:

```typescript
import { ClientValidator, useFormValidation } from '@/lib/validation'

// React hook for forms
const { state, validateField, validateForm } = useFormValidation(schema)

// Standalone validation
const result = ClientValidator.validateEmail(email)
const fileResult = ClientValidator.validateFile(file, options)
```

**Client Features:**
- Real-time field validation
- XSS prevention
- File validation
- Email validation with suggestions
- Password strength checking
- Rate limiting

## Pre-configured API Builders

### Game APIs

```typescript
import { GameAPI } from '@/lib/validation'

// Game submission endpoint
export const POST = GameAPI.create(handler, gameSchemas.retitledGuess, 'retitled_guesses')

// Game stats endpoint
export const GET = GameAPI.stats(handler, querySchema)
```

### User APIs

```typescript
import { UserAPI } from '@/lib/validation'

// User profile endpoint
export const PUT = UserAPI.profile(handler, userSchemas.profile)

// User favorites endpoint
export const POST = UserAPI.favorites(handler, userSchemas.favoriteMovie)
```

### Admin APIs

```typescript
import { AdminAPI } from '@/lib/validation'

// Admin-only endpoint
export const POST = AdminAPI.create(handler, {
  body: adminSchema,
  methods: ['POST'],
  resourceType: 'admin_panel'
})
```

## Environment Variables

Required environment variables for full functionality:

```bash
# Database encryption
PII_ENCRYPTION_KEY=your-encryption-key-here
ENCRYPTION_KEY=your-general-encryption-key
HMAC_SECRET=your-hmac-secret

# External services
TMDB_API_KEY=your-tmdb-api-key

# Security monitoring (optional)
SECURITY_WEBHOOK_URL=https://your-security-monitoring-service.com/webhook
```

## Security Best Practices

### 1. Input Validation
- Always validate input at both client and server levels
- Use strict schemas with appropriate length limits
- Sanitize all user input before processing
- Validate file uploads carefully

### 2. Database Security
- Use parameterized queries exclusively
- Implement Row Level Security (RLS) in Supabase
- Validate table and column names
- Log all database operations

### 3. Authentication & Authorization
- Implement proper IDOR protection
- Use secure session management
- Log all authentication events
- Implement rate limiting

### 4. Error Handling
- Never expose internal system details
- Use consistent error response formats
- Log all security-relevant errors
- Implement proper error boundaries

### 5. Monitoring & Logging
- Log all security events
- Monitor for suspicious patterns
- Implement real-time alerting
- Regular security audits

## Migration Guide

To update existing API routes:

1. **Replace basic validation:**
   ```typescript
   // Before
   const { puzzleId } = await request.json()
   if (!puzzleId) return error()
   
   // After
   export const POST = createSecureAPI(handler, {
     body: gameSchemas.retitledGuess,
     requireAuth: true
   })
   ```

2. **Update database operations:**
   ```typescript
   // Before
   const { data } = await supabase.from('table').select('*')
   
   // After
   const result = await SecureDatabase.getUserData(userId, 'table')
   ```

3. **Add error handling:**
   ```typescript
   // Before
   return NextResponse.json({ error: 'Failed' }, { status: 500 })
   
   // After
   return SecureErrorHandler.handleDatabaseError(error, context)
   ```

## Performance Considerations

- Validation adds ~5-10ms per request
- Database security helpers add ~2-5ms per query
- Logging is asynchronous and doesn't block requests
- Rate limiting uses in-memory storage (consider Redis for production)
- Encryption operations are optimized for performance

## Testing

The validation system includes comprehensive error handling and logging to help identify issues during development:

- Development mode shows detailed error information
- Production mode uses generic error messages
- All security events are logged for monitoring
- Performance metrics help identify bottlenecks

## Contributing

When adding new features:

1. Add appropriate Zod schemas to `schemas.ts`
2. Update sanitization rules in `sanitization.ts`
3. Add IDOR protection patterns in `idor-protection.ts`
4. Include comprehensive error handling
5. Add security event logging
6. Update documentation

## Security Considerations

This system protects against:

- ✅ SQL Injection
- ✅ XSS attacks
- ✅ CSRF attacks (with existing middleware)
- ✅ IDOR vulnerabilities
- ✅ Data exposure through errors
- ✅ Rate limiting bypass
- ✅ Input validation bypass
- ✅ Unauthorized data access

Regular security audits and updates are recommended to maintain protection against emerging threats.