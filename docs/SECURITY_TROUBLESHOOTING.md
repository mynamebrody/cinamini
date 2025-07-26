# Security Troubleshooting Guide

This guide helps diagnose and resolve common security-related issues in CineMini.

## Table of Contents

1. [Authentication Issues](#authentication-issues)
2. [Authorization Problems](#authorization-problems)
3. [CSRF Protection Issues](#csrf-protection-issues)
4. [Rate Limiting Problems](#rate-limiting-problems)
5. [Input Validation Errors](#input-validation-errors)
6. [Security Header Issues](#security-header-issues)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Performance Issues](#performance-issues)
9. [Emergency Procedures](#emergency-procedures)

## Authentication Issues

### Problem: Users Cannot Log In

**Symptoms:**
- 401 Unauthorized responses
- Session not being created
- Redirect loops on login

**Diagnosis:**
```typescript
// Check authentication middleware
const { user } = await authMiddleware(request)
console.log('Authentication result:', { 
  user: user ? 'authenticated' : 'not authenticated',
  sessionExists: !!request.cookies.get('sb-access-token'),
  timestamp: new Date().toISOString()
})
```

**Common Causes & Solutions:**

1. **Expired or Invalid Session Tokens**
   ```typescript
   // Check token expiration
   const token = request.cookies.get('sb-access-token')?.value
   if (token) {
     try {
       const decoded = jwt.decode(token)
       console.log('Token expiration:', new Date(decoded.exp * 1000))
     } catch (error) {
       console.error('Invalid token format:', error)
     }
   }
   ```
   
   **Solution:** Clear cookies and re-authenticate
   ```bash
   # Clear authentication cookies
   document.cookie = 'sb-access-token=; Max-Age=0; path=/'
   document.cookie = 'sb-refresh-token=; Max-Age=0; path=/'
   ```

2. **Supabase Configuration Issues**
   ```typescript
   // Verify Supabase client configuration
   const supabaseConfig = {
     url: process.env.NEXT_PUBLIC_SUPABASE_URL,
     anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
     serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
   }
   
   console.log('Supabase config check:', {
     urlConfigured: !!supabaseConfig.url,
     anonKeyConfigured: !!supabaseConfig.anonKey,
     serviceKeyConfigured: !!supabaseConfig.serviceRoleKey
   })
   ```

3. **Cookie Security Settings**
   ```typescript
   // Check cookie configuration in production
   const cookieConfig = {
     secure: process.env.NODE_ENV === 'production',
     httpOnly: true,
     sameSite: 'strict',
     domain: process.env.NODE_ENV === 'production' ? '.cinemini.com' : 'localhost'
   }
   ```

### Problem: Session Expires Too Quickly

**Symptoms:**
- Users logged out after short periods
- Constant re-authentication required

**Solution:**
```typescript
// Adjust session configuration
const sessionConfig = {
  maxAge: 24 * 60 * 60, // 24 hours
  updateAge: 60 * 60,   // Refresh every hour
  strategy: 'jwt'
}
```

### Problem: Authentication Loops

**Symptoms:**
- Infinite redirects between auth pages
- Users stuck on login screen

**Diagnosis:**
```typescript
// Check authentication state
const checkAuthLoop = async (request: NextRequest) => {
  const url = new URL(request.url)
  const isAuthPage = ['/auth/login', '/auth/sign-up'].includes(url.pathname)
  const { user } = await authMiddleware(request)
  
  console.log('Auth loop check:', {
    currentPath: url.pathname,
    isAuthPage,
    userAuthenticated: !!user,
    shouldRedirect: isAuthPage && !!user
  })
}
```

**Solution:**
```typescript
// Fix authentication middleware logic
if (isAuthPage && user) {
  return NextResponse.redirect(new URL('/', request.url))
}
if (!isAuthPage && !user && isProtectedRoute) {
  return NextResponse.redirect(new URL('/auth/login', request.url))
}
```

## Authorization Problems

### Problem: Access Denied for Authorized Users

**Symptoms:**
- 403 Forbidden responses for valid users
- Admin features not accessible

**Diagnosis:**
```typescript
// Check user permissions
const checkPermissions = async (user: User, requiredPermission: string) => {
  const userRoles = user.roles || ['user']
  const hasPermission = userRoles.some(role => 
    roles[role]?.includes(requiredPermission) || roles[role]?.includes('*')
  )
  
  console.log('Permission check:', {
    userId: user.id,
    userRoles,
    requiredPermission,
    hasPermission
  })
  
  return hasPermission
}
```

**Solutions:**

1. **Role Assignment Issues**
   ```sql
   -- Check user roles in database
   SELECT user_id, roles FROM user_profiles WHERE user_id = 'user-id';
   
   -- Update user role
   UPDATE user_profiles 
   SET roles = ARRAY['admin'] 
   WHERE user_id = 'user-id';
   ```

2. **Permission Configuration**
   ```typescript
   // Verify role-permission mapping
   const rolePermissions = {
     user: ['read:profile', 'update:profile', 'play:games'],
     admin: ['*'], // All permissions
     moderator: ['read:users', 'moderate:content']
   }
   ```

### Problem: Row Level Security (RLS) Blocking Access

**Symptoms:**
- Database queries returning empty results
- "permission denied" errors

**Diagnosis:**
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'your_table_name';

-- Test RLS with specific user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-id';
SELECT * FROM your_table_name;
```

**Solution:**
```sql
-- Update RLS policy
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "updated_policy" ON table_name
  FOR ALL USING (auth.uid() = user_id);
```

## CSRF Protection Issues

### Problem: CSRF Token Validation Failures

**Symptoms:**
- POST requests failing with 403 errors
- "CSRF token mismatch" errors

**Diagnosis:**
```typescript
// Check CSRF token in request
const csrfToken = request.headers.get('x-csrf-token')
const expectedToken = request.cookies.get('csrf-token')?.value

console.log('CSRF check:', {
  tokenInHeader: !!csrfToken,
  tokenInCookie: !!expectedToken,
  tokensMatch: csrfToken === expectedToken,
  headerValue: csrfToken?.substring(0, 10) + '...',
  cookieValue: expectedToken?.substring(0, 10) + '...'
})
```

**Solutions:**

1. **Missing CSRF Token in Requests**
   ```typescript
   // Ensure CSRF token is included in requests
   const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
   
   fetch('/api/endpoint', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'X-CSRF-Token': csrfToken
     },
     body: JSON.stringify(data)
   })
   ```

2. **Token Generation Issues**
   ```typescript
   // Check CSRF token generation
   const generateCSRFToken = () => {
     return crypto.randomBytes(32).toString('hex')
   }
   ```

3. **SameSite Cookie Issues**
   ```typescript
   // Adjust cookie settings for CSRF protection
   const csrfCookieOptions = {
     httpOnly: false, // CSRF tokens need to be accessible to JS
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'strict'
   }
   ```

## Rate Limiting Problems

### Problem: Legitimate Users Being Rate Limited

**Symptoms:**
- 429 Too Many Requests errors
- Users unable to perform normal actions

**Diagnosis:**
```typescript
// Check rate limit status
const checkRateLimit = async (userId: string, ipAddress: string) => {
  const userLimits = await getRateLimitStatus('user', userId)
  const ipLimits = await getRateLimitStatus('ip', ipAddress)
  
  console.log('Rate limit status:', {
    userId,
    ipAddress,
    userRequests: userLimits.count,
    userLimit: userLimits.limit,
    ipRequests: ipLimits.count,
    ipLimit: ipLimits.limit,
    resetTime: new Date(userLimits.resetTime)
  })
}
```

**Solutions:**

1. **Adjust Rate Limit Thresholds**
   ```typescript
   // Increase limits for authenticated users
   const rateLimitConfig = {
     windowMs: 60 * 1000,        // 1 minute
     maxRequests: {
       anonymous: 100,
       authenticated: 1000,
       admin: 5000
     }
   }
   ```

2. **Whitelist Specific IPs**
   ```typescript
   // Add IP whitelist for trusted sources
   const ipWhitelist = [
     '192.168.1.0/24',  // Internal network
     '10.0.0.0/8',      // Private network
     '127.0.0.1'        // Localhost
   ]
   ```

3. **Reset Rate Limits**
   ```typescript
   // Manual rate limit reset for specific user
   await resetRateLimit('user', userId)
   await resetRateLimit('ip', ipAddress)
   ```

### Problem: Rate Limiting Not Working

**Symptoms:**
- No 429 responses during load testing
- Suspected DDoS attacks getting through

**Diagnosis:**
```typescript
// Verify rate limiting is enabled
const rateLimitCheck = {
  enabled: process.env.RATE_LIMIT_ENABLED === 'true',
  redisConnected: await checkRedisConnection(),
  configValid: !!process.env.RATE_LIMIT_REDIS_URL
}

console.log('Rate limit configuration:', rateLimitCheck)
```

**Solutions:**

1. **Enable Rate Limiting**
   ```typescript
   // Ensure rate limiting middleware is applied
   export const POST = withSecurity(handler, {
     enableRateLimit: true,
     rateLimitConfig: {
       windowMs: 60 * 1000,
       maxRequests: 100
     }
   })
   ```

2. **Fix Redis Connection**
   ```bash
   # Check Redis connectivity
   redis-cli ping
   
   # Verify Redis URL
   echo $RATE_LIMIT_REDIS_URL
   ```

## Input Validation Errors

### Problem: Valid Input Being Rejected

**Symptoms:**
- Form submissions failing validation
- API requests rejected with validation errors

**Diagnosis:**
```typescript
// Debug validation schema
const debugValidation = (schema: z.ZodSchema, input: any) => {
  try {
    const result = schema.parse(input)
    console.log('Validation successful:', result)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('Validation errors:', error.errors)
      return { success: false, errors: error.errors }
    }
    throw error
  }
}
```

**Solutions:**

1. **Schema Adjustments**
   ```typescript
   // Relax overly strict validation
   const userSchema = z.object({
     displayName: z.string()
       .min(1)
       .max(100)
       .regex(/^[a-zA-Z0-9\s_.-]+$/, 'Invalid characters'), // Added . and -
     
     email: z.string()
       .email()
       .transform(email => email.toLowerCase()) // Normalize email
   })
   ```

2. **Better Error Messages**
   ```typescript
   // Provide clear validation error messages
   const schema = z.object({
     password: z.string()
       .min(8, 'Password must be at least 8 characters')
       .regex(/[A-Z]/, 'Password must contain uppercase letter')
       .regex(/[a-z]/, 'Password must contain lowercase letter')
       .regex(/[0-9]/, 'Password must contain a number')
   })
   ```

### Problem: Sanitization Removing Valid Content

**Symptoms:**
- User content being overly sanitized
- Valid HTML/formatting being stripped

**Solution:**
```typescript
// Adjust sanitization rules
const sanitizationConfig = {
  allowedTags: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
  allowedAttributes: {
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'width', 'height']
  },
  preserveWhitespace: true
}
```

## Security Header Issues

### Problem: Content Security Policy (CSP) Blocking Resources

**Symptoms:**
- Scripts not loading
- Stylesheets blocked
- Images not displaying

**Diagnosis:**
```javascript
// Check CSP violations in browser console
window.addEventListener('securitypolicyviolation', (event) => {
  console.log('CSP Violation:', {
    blockedURI: event.blockedURI,
    violatedDirective: event.violatedDirective,
    originalPolicy: event.originalPolicy
  })
})
```

**Solutions:**

1. **Update CSP Policy**
   ```typescript
   // Add trusted sources to CSP
   const csp = `
     default-src 'self';
     script-src 'self' 'unsafe-inline' https://trusted-cdn.com;
     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
     img-src 'self' data: https:;
     font-src 'self' https://fonts.gstatic.com;
   `.replace(/\s+/g, ' ').trim()
   ```

2. **Use Nonces for Inline Scripts**
   ```typescript
   // Generate nonce for inline scripts
   const nonce = crypto.randomBytes(16).toString('base64')
   
   const csp = `script-src 'self' 'nonce-${nonce}'`
   
   // In HTML: <script nonce="${nonce}">...</script>
   ```

### Problem: Mixed Content Warnings

**Symptoms:**
- HTTPS pages loading HTTP resources
- Browser security warnings

**Solution:**
```typescript
// Ensure all resources use HTTPS
const secureUrl = (url: string) => {
  if (url.startsWith('http://') && process.env.NODE_ENV === 'production') {
    return url.replace('http://', 'https://')
  }
  return url
}
```

## Monitoring and Logging

### Problem: Security Events Not Being Logged

**Symptoms:**
- Empty security dashboard
- Missing audit trail entries

**Diagnosis:**
```typescript
// Check logging configuration
const loggingCheck = {
  auditLoggingEnabled: process.env.AUDIT_LOGGING_ENABLED === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
  logDestination: process.env.LOG_DESTINATION || 'console'
}

console.log('Logging configuration:', loggingCheck)
```

**Solutions:**

1. **Enable Audit Logging**
   ```typescript
   // Ensure audit logging is enabled in security middleware
   export const handler = withSecurity(apiHandler, {
     enableLogging: true,
     enableAuditTrail: true
   })
   ```

2. **Check Log Permissions**
   ```bash
   # Verify log file permissions
   ls -la logs/
   
   # Create log directory if missing
   mkdir -p logs
   chmod 755 logs
   ```

### Problem: Too Many False Positive Alerts

**Symptoms:**
- Alert fatigue from excessive notifications
- Important alerts being missed

**Solution:**
```typescript
// Adjust alert thresholds
const alertConfig = {
  failedLoginThreshold: 10,        // Increased from 5
  rateLimitViolationThreshold: 50, // Increased from 20
  suspiciousPatternThreshold: 25   // Increased from 10
}

// Implement alert suppression
const suppressDuplicateAlerts = (alertType: string, timeWindow: number) => {
  // Suppress duplicate alerts within time window
}
```

## Performance Issues

### Problem: Security Middleware Causing Slowdowns

**Symptoms:**
- Increased response times
- Timeout errors

**Diagnosis:**
```typescript
// Measure middleware performance
const performanceCheck = async (request: NextRequest) => {
  const startTime = Date.now()
  
  const authTime = await measureTime(() => authMiddleware(request))
  const rateLimitTime = await measureTime(() => rateLimitMiddleware(request))
  const validationTime = await measureTime(() => validateInput(request))
  
  const totalTime = Date.now() - startTime
  
  console.log('Security middleware performance:', {
    authTime,
    rateLimitTime,
    validationTime,
    totalTime,
    acceptable: totalTime < 100 // Target: under 100ms
  })
}
```

**Solutions:**

1. **Optimize Database Queries**
   ```typescript
   // Cache user roles to avoid repeated database lookups
   const userRoleCache = new Map<string, string[]>()
   
   const getUserRoles = async (userId: string): Promise<string[]> => {
     if (userRoleCache.has(userId)) {
       return userRoleCache.get(userId)!
     }
     
     const roles = await fetchUserRoles(userId)
     userRoleCache.set(userId, roles)
     return roles
   }
   ```

2. **Implement Caching**
   ```typescript
   // Cache rate limit counters
   const rateLimitCache = new Map<string, RateLimitData>()
   
   // Cache validation results for repeated inputs
   const validationCache = new Map<string, ValidationResult>()
   ```

3. **Async Processing**
   ```typescript
   // Process audit logs asynchronously
   const logSecurityEvent = async (event: SecurityEvent) => {
     // Don't wait for logging to complete
     setImmediate(() => {
       SecurityLogger.logSecurityEvent(event)
     })
   }
   ```

## Emergency Procedures

### Security Incident Response

1. **Immediate Actions**
   ```bash
   # Enable maintenance mode
   export MAINTENANCE_MODE=true
   
   # Block suspicious IPs
   iptables -A INPUT -s suspicious.ip.address -j DROP
   
   # Revoke all active sessions
   redis-cli FLUSHDB
   ```

2. **Assessment**
   ```typescript
   // Check for ongoing attacks
   const securityStatus = await SecurityMonitor.getSecurityStatus()
   console.log('Security status:', securityStatus)
   
   // Review recent security events
   const recentEvents = await AuditLogger.queryAuditTrail({
     startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
     severity: 'critical'
   })
   ```

3. **Communication**
   ```typescript
   // Send security alert
   await sendSecurityAlert({
     severity: 'critical',
     message: 'Security incident detected',
     timestamp: new Date().toISOString(),
     affectedSystems: ['web-app', 'api'],
     actions: ['maintenance-mode-enabled', 'sessions-revoked']
   })
   ```

### System Recovery

1. **Verify System Integrity**
   ```bash
   # Run security scan
   npm run security:scan
   
   # Check for unauthorized changes
   git status
   git log --oneline -10
   ```

2. **Restore from Backup**
   ```bash
   # Restore database from clean backup
   pg_restore --clean --if-exists -d cinemini backup.sql
   
   # Verify data integrity
   psql -d cinemini -c "SELECT COUNT(*) FROM users;"
   ```

3. **Gradual Re-enablement**
   ```typescript
   // Gradually restore functionality
   const recoverySteps = [
     'disable-maintenance-mode',
     'enable-authentication',
     'enable-api-access',
     'enable-full-functionality'
   ]
   
   for (const step of recoverySteps) {
     await executeRecoveryStep(step)
     await validateSystemHealth()
     await sleep(60000) // Wait 1 minute between steps
   }
   ```

### Contact Information

**Security Team Contacts:**
- Emergency: security-emergency@cinemini.com
- General: security@cinemini.com
- Phone: +1-555-SEC-RITY (24/7)

**Escalation Path:**
1. Security Engineer (immediate response)
2. Security Team Lead (within 15 minutes)
3. CTO (within 30 minutes)
4. CEO (within 1 hour for critical incidents)

---

For additional troubleshooting support, consult the [Security Guide](SECURITY_GUIDE.md) or contact the security team.