# CineMini Security Implementation

This document describes the comprehensive API security improvements implemented for the CineMini platform.

## Overview

The security implementation provides multiple layers of protection:

1. **CSRF Protection** - Prevents cross-site request forgery attacks
2. **Rate Limiting** - Prevents abuse and DoS attacks  
3. **Security Headers** - Implements browser security policies
4. **Authentication** - Enhanced Supabase JWT validation
5. **CORS Configuration** - Proper cross-origin request handling

## Architecture

### Security Middleware Stack

```
Request → Security Headers → CSRF Protection → Rate Limiting → Authentication → API Route
```

All security measures are applied through the Next.js middleware in `middleware.ts`, which orchestrates the security stack before requests reach API routes.

## Components

### 1. CSRF Protection (`/lib/security/csrf.ts`)

**Purpose**: Prevents cross-site request forgery attacks by validating tokens on state-changing operations.

**Features**:
- Token generation with timestamp and session validation
- Automatic token injection in response headers and cookies
- Protection for POST, PUT, PATCH, DELETE requests
- Edge Runtime compatible (uses Web Crypto API)

**Usage**:
```typescript
// Automatically applied by middleware
// Tokens available in cookies and headers for client use
const token = getCSRFToken() // Client-side utility
```

**Configuration**:
- Token expiry: 24 hours
- Header: `x-csrf-token`
- Cookie: `csrf-token`

### 2. Rate Limiting (`/lib/security/rate-limit.ts`)

**Purpose**: Prevents API abuse by limiting request frequency per user/IP.

**Features**:
- Memory-based rate limiting (production-ready for single instances)
- Different limits for authenticated vs unauthenticated users
- Configurable time windows and request limits
- Automatic cleanup of expired entries

**Default Limits**:
- **Unauthenticated**: 100 requests/hour
- **Authenticated**: 1000 requests/hour  
- **Write Operations**: 50 requests/15 minutes

**Response Headers**:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Window reset timestamp
- `Retry-After`: Seconds to wait when rate limited

### 3. Security Headers (`/lib/security/headers.ts`)

**Purpose**: Implements browser security policies to prevent various attacks.

**Headers Implemented**:
- **Content Security Policy**: Restricts resource loading
- **X-Frame-Options**: Prevents clickjacking (DENY)
- **X-Content-Type-Options**: Prevents MIME sniffing (nosniff)
- **Referrer-Policy**: Controls referrer information
- **Strict-Transport-Security**: Forces HTTPS (production only)
- **Permissions-Policy**: Disables dangerous browser features

**CORS Configuration**:
- Origin validation based on environment
- Credential support for authenticated requests
- Proper preflight handling

### 4. Enhanced Authentication (`/lib/security/auth.ts`)

**Purpose**: Provides robust JWT validation and role-based access control.

**Features**:
- Supabase JWT validation with session refresh detection
- Role-based permissions (USER, MODERATOR, ADMIN)
- Route protection (public, protected, admin)
- Email verification requirement (configurable)

**Route Categories**:
- **Public**: `/auth/*`, `/api/games`, `/api/retitled/puzzle/today`
- **Protected**: `/profile/*`, `/api/user/*`, `/api/*/guess`
- **Admin**: `/admin/*`, `/api/admin/*`

### 5. Central Security Orchestration (`/lib/security/index.ts`)

**Purpose**: Coordinates all security measures and provides unified API.

**Key Functions**:
- `applySecurity()`: Main middleware function
- `createSecurityMiddleware()`: Custom middleware factory
- `withSecurity()`: API route wrapper
- `getSecurityContext()`: Security info for routes

## API Integration

### Secure API Route Pattern

```typescript
import { createSecureAPIRoute } from '@/lib/security/api-wrapper'

export const POST = createSecureAPIRoute(
  async (request, context) => {
    // context.user - authenticated user info
    // context.isAuthenticated - auth status
    // context.csrfToken - CSRF validation
    
    const supabase = await createSecureSupabaseClient(context)
    // ... route logic
  },
  {
    requireAuth: true,
    requireCSRF: true,
    methods: ['POST']
  }
)
```

### Client-Side Integration

```typescript
import { apiClient, getCSRFToken } from '@/lib/security/client'

// Automatic CSRF token inclusion
const response = await apiClient.post('/api/user/profile', { username: 'newname' })

// Manual fetch with security
const response = await secureFetch('/api/data', {
  method: 'POST',
  body: JSON.stringify(data)
})
```

## Configuration

### Environment Variables

```bash
# Required for production
CSRF_SECRET=your_64_character_secret_key_here
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Existing Supabase config
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Security Configuration

Security can be configured per-route or globally:

```typescript
// Global middleware configuration (middleware.ts)
const securityResponse = await applySecurity(request, {
  enableCSRF: true,
  enableRateLimit: true,
  enableSecurityHeaders: true,
  enableAuthentication: false, // Let Supabase handle
  enableLogging: true
})

// Per-route configuration
export const POST = createSecureAPIRoute(handler, {
  requireAuth: true,
  requireCSRF: true,
  enableRateLimit: true,
  methods: ['POST'],
  adminOnly: false
})
```

## Security Headers Details

### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
connect-src 'self' https://api.themoviedb.org https://*.supabase.co wss://*.supabase.co;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

### Permissions Policy

```
camera=(), microphone=(), geolocation=(), interest-cohort=(),
payment=(), usb=(), battery=(), accelerometer=(), gyroscope=(), magnetometer=()
```

## Monitoring and Logging

### Security Events Logged

- Rate limit violations
- CSRF token failures
- Authentication failures
- Security middleware errors
- API handler errors

### Log Format

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "event": "RATE_LIMIT_EXCEEDED",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "url": "/api/user/profile",
  "method": "PUT",
  "userId": "user-uuid"
}
```

## Performance Considerations

### Memory Usage

- Rate limiting uses in-memory Map (cleaned every 5 minutes)
- CSRF tokens are stateless (no server storage)
- Security headers cached by Next.js

### Production Recommendations

1. **Redis Rate Limiting**: For multi-instance deployments
2. **CDN Security Headers**: Offload header setting to CDN
3. **WAF Integration**: Additional layer for common attacks
4. **Log Aggregation**: Centralized security event monitoring

## Testing Security

### Rate Limiting Test

```bash
# Test rate limiting
for i in {1..101}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/games
done
# Should return 429 after 100 requests
```

### CSRF Protection Test

```bash
# This should fail without CSRF token
curl -X POST http://localhost:3000/api/user/profile \
  -H "Content-Type: application/json" \
  -d '{"username":"test"}'
# Expected: 403 Forbidden
```

### Security Headers Test

```bash
curl -I http://localhost:3000/
# Should include security headers
```

## Migration Guide

### From Existing API Routes

1. **Import security wrapper**:
   ```typescript
   import { createSecureAPIRoute } from '@/lib/security/api-wrapper'
   ```

2. **Wrap handlers**:
   ```typescript
   // Before
   export async function POST(request: NextRequest) { ... }
   
   // After  
   export const POST = createSecureAPIRoute(
     async (request, context) => { ... },
     { requireAuth: true }
   )
   ```

3. **Update client code**:
   ```typescript
   // Before
   fetch('/api/endpoint', { method: 'POST', ... })
   
   // After
   apiClient.post('/endpoint', data)
   ```

## Future Enhancements

1. **Redis Rate Limiting**: For distributed deployments
2. **Advanced CSRF**: HMAC-based tokens with Web Crypto API
3. **Geolocation Blocking**: Country-based access control
4. **Device Fingerprinting**: Enhanced user tracking
5. **Automated Security Scanning**: CI/CD integration
6. **Security Metrics Dashboard**: Real-time monitoring

## Troubleshooting

### Common Issues

1. **CSRF Token Missing**: Check client-side token retrieval
2. **Rate Limit False Positives**: Verify IP extraction logic
3. **CORS Errors**: Check origin configuration
4. **Build Warnings**: Ensure Edge Runtime compatibility

### Debug Mode

Set `NODE_ENV=development` for detailed security logs:

```typescript
// Security middleware will log all security events in development
console.log(`Security middleware: ${method} ${path} - ${time}ms`)
```

## Security Checklist

- [ ] CSRF_SECRET set in production environment
- [ ] Rate limiting configured appropriately
- [ ] Security headers verified in browser
- [ ] Authentication flows tested
- [ ] CORS origins properly configured
- [ ] Security logging enabled
- [ ] Error handling doesn't leak sensitive info
- [ ] Client-side CSRF integration working
- [ ] All API routes use security wrapper
- [ ] Production environment variables set