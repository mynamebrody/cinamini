# Production Security Deployment Guide

This guide provides step-by-step instructions for securely deploying CineMini to production with comprehensive security measures.

## Table of Contents

1. [Pre-Deployment Security Checklist](#pre-deployment-security-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Infrastructure Security Setup](#infrastructure-security-setup)
4. [Database Security Configuration](#database-security-configuration)
5. [Application Security Configuration](#application-security-configuration)
6. [Monitoring and Logging Setup](#monitoring-and-logging-setup)
7. [SSL/TLS Certificate Configuration](#ssltls-certificate-configuration)
8. [Content Security Policy Setup](#content-security-policy-setup)
9. [Security Testing in Production](#security-testing-in-production)
10. [Post-Deployment Verification](#post-deployment-verification)
11. [Incident Response Setup](#incident-response-setup)
12. [Maintenance and Updates](#maintenance-and-updates)

## Pre-Deployment Security Checklist

Before deploying to production, complete this comprehensive security checklist:

### Code Security
- [ ] All dependencies are up to date and free of known vulnerabilities
- [ ] No hardcoded secrets, API keys, or passwords in source code
- [ ] All user inputs are validated and sanitized
- [ ] SQL injection protection implemented (parameterized queries)
- [ ] XSS protection implemented (input sanitization and CSP)
- [ ] CSRF protection enabled for all state-changing operations
- [ ] Authentication and authorization properly implemented
- [ ] Rate limiting configured for all public endpoints
- [ ] Error handling doesn't leak sensitive information
- [ ] Security headers configured correctly

### Infrastructure Security
- [ ] Production environment is isolated from development
- [ ] Network access is restricted using firewalls and security groups
- [ ] SSH access is secured with key-based authentication
- [ ] Database access is restricted to application servers only
- [ ] Load balancer is configured with security best practices
- [ ] CDN is configured with appropriate security settings
- [ ] Backup systems are secure and tested
- [ ] Monitoring and alerting systems are configured

### Compliance and Documentation
- [ ] Security policies are documented and up to date
- [ ] Incident response procedures are in place
- [ ] Data retention policies are implemented
- [ ] GDPR compliance measures are active
- [ ] Security team contacts are documented
- [ ] Emergency procedures are documented

## Environment Configuration

### Required Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://cinemini.com
PORT=3000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# TMDB API Configuration
TMDB_API_KEY=your-tmdb-api-key
TMDB_BASE_URL=https://api.themoviedb.org/3

# Security Configuration
CSRF_SECRET=your-strong-csrf-secret-256-bits
SESSION_SECRET=your-strong-session-secret-256-bits
RATE_LIMIT_REDIS_URL=redis://your-redis-cluster:6379
RATE_LIMIT_ENABLED=true

# Monitoring and Logging
LOG_LEVEL=info
AUDIT_LOGGING_ENABLED=true
SECURITY_WEBHOOK_URL=https://your-monitoring-service.com/webhook
ERROR_REPORTING_URL=https://your-error-tracking.com/api

# External Services
CDN_URL=https://cdn.cinemini.com
ANALYTICS_API_KEY=your-analytics-key

# Email Configuration (for security notifications)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=noreply@cinemini.com
SMTP_PASS=your-email-password

# Backup Configuration
BACKUP_ENCRYPTION_KEY=your-backup-encryption-key
BACKUP_S3_BUCKET=cinemini-backups
BACKUP_S3_REGION=us-east-1
```

### Environment Variable Security

1. **Use a secure secret management system:**
   ```bash
   # Example using AWS Systems Manager Parameter Store
   aws ssm put-parameter \
     --name "/cinemini/production/database_url" \
     --value "your-database-url" \
     --type "SecureString" \
     --description "Production database URL"
   ```

2. **Rotate secrets regularly:**
   ```bash
   # Create rotation script
   #!/bin/bash
   # rotate-secrets.sh
   
   echo "Rotating production secrets..."
   
   # Generate new CSRF secret
   NEW_CSRF_SECRET=$(openssl rand -hex 32)
   aws ssm put-parameter --name "/cinemini/production/csrf_secret" --value "$NEW_CSRF_SECRET" --type "SecureString" --overwrite
   
   # Generate new session secret  
   NEW_SESSION_SECRET=$(openssl rand -hex 32)
   aws ssm put-parameter --name "/cinemini/production/session_secret" --value "$NEW_SESSION_SECRET" --type "SecureString" --overwrite
   
   echo "Secrets rotated successfully"
   ```

3. **Validate environment configuration:**
   ```typescript
   // scripts/validate-env.ts
   import { z } from 'zod'
   
   const envSchema = z.object({
     NODE_ENV: z.literal('production'),
     NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
     SUPABASE_SERVICE_ROLE_KEY: z.string().min(60),
     CSRF_SECRET: z.string().min(32),
     SESSION_SECRET: z.string().min(32),
     RATE_LIMIT_REDIS_URL: z.string().url(),
     TMDB_API_KEY: z.string().min(20),
   })
   
   try {
     envSchema.parse(process.env)
     console.log('✅ Environment configuration is valid')
   } catch (error) {
     console.error('❌ Environment configuration errors:', error.errors)
     process.exit(1)
   }
   ```

## Infrastructure Security Setup

### 1. Network Security Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    networks:
      - app-network
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=512m

  redis:
    image: redis:7-alpine
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis.conf:/etc/redis/redis.conf:ro
      - redis-data:/data
    networks:
      - app-network
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
    networks:
      - app-network
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true

networks:
  app-network:
    driver: bridge
    internal: true

volumes:
  redis-data:
```

### 2. Nginx Security Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Hide nginx version
    server_tokens off;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    server {
        listen 80;
        server_name cinemini.com www.cinemini.com;
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name cinemini.com www.cinemini.com;
        
        ssl_certificate /etc/ssl/certs/cinemini.crt;
        ssl_certificate_key /etc/ssl/certs/cinemini.key;
        
        # CSP Header
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://trusted-cdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.themoviedb.org https://your-project.supabase.co; frame-ancestors 'none';" always;
        
        # API rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Auth endpoints with stricter rate limiting
        location /api/auth/ {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Static files
        location /_next/static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            proxy_pass http://app:3000;
        }
        
        # Main application
        location / {
            proxy_pass http://app:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 3. Redis Security Configuration

```conf
# redis.conf
# Network security
bind 127.0.0.1
protected-mode yes
port 0
unixsocket /var/run/redis/redis.sock
unixsocketperm 770

# Authentication
requirepass your-strong-redis-password

# Security settings
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
rename-command CONFIG "CONFIG_b835f4c8d5a9e8f7"

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Memory and persistence
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## Database Security Configuration

### 1. Supabase Security Settings

```sql
-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE retitled_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE retitled_guesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_bracket_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_bracket_guesses ENABLE ROW LEVEL SECURITY;

-- Create secure RLS policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own guesses" ON retitled_guesses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own guesses" ON retitled_guesses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create audit log table
CREATE TABLE security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create security monitoring views
CREATE VIEW security_events_summary AS
SELECT 
    date_trunc('hour', created_at) as hour,
    event_type,
    COUNT(*) as event_count
FROM security_audit_log 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY date_trunc('hour', created_at), event_type
ORDER BY hour DESC;

-- Create function for failed login tracking
CREATE OR REPLACE FUNCTION track_failed_login()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_sign_in_at IS NULL AND OLD.last_sign_in_at IS NULL THEN
        INSERT INTO security_audit_log (event_type, user_id, event_data, ip_address)
        VALUES (
            'failed_login_attempt',
            NEW.id,
            jsonb_build_object('email', NEW.email),
            inet_client_addr()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for failed login tracking
CREATE TRIGGER track_failed_login_trigger
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION track_failed_login();
```

### 2. Database Connection Security

```typescript
// lib/supabase/secure-client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'cinemini-production'
    }
  }
})

// Connection pool configuration for high availability
export const createSecureSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    db: {
      schema: 'public'
    },
    auth: {
      detectSessionInUrl: false,
      persistSession: false,
      autoRefreshToken: false
    },
    realtime: {
      params: {
        eventsPerSecond: 2 // Rate limit for realtime connections
      }
    }
  })
}
```

## Application Security Configuration

### 1. Next.js Security Configuration

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          }
        ]
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ]
      }
    ]
  },
  
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/security',
        permanent: false,
      }
    ]
  },
  
  // Security-focused webpack configuration
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Production client-side optimizations
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      }
    }
    
    return config
  },
  
  experimental: {
    serverComponentsExternalPackages: ['bcrypt', 'crypto']
  }
}

export default nextConfig
```

### 2. Middleware Security Configuration

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { applySecurity } from './lib/security'

export async function middleware(request: NextRequest) {
  const response = await applySecurity(request, {
    enableCSRF: true,
    enableRateLimit: true,
    enableSecurityHeaders: true,
    enableAuthentication: true,
    enableLogging: true
  })

  // Add additional security measures for production
  if (process.env.NODE_ENV === 'production') {
    // Block requests from known malicious IPs
    const clientIP = request.ip || request.headers.get('x-forwarded-for')
    if (await isBlockedIP(clientIP)) {
      return new NextResponse('Access Denied', { status: 403 })
    }

    // Additional rate limiting for sensitive endpoints
    if (request.nextUrl.pathname.startsWith('/api/admin')) {
      const adminRateLimit = await checkAdminRateLimit(clientIP)
      if (!adminRateLimit.allowed) {
        return new NextResponse('Rate Limit Exceeded', { status: 429 })
      }
    }
  }

  return response
}

async function isBlockedIP(ip: string | null): Promise<boolean> {
  if (!ip) return false
  
  // Check against blocklist (implement with Redis or database)
  const blockedIPs = await getBlockedIPs()
  return blockedIPs.includes(ip)
}

async function checkAdminRateLimit(ip: string | null): Promise<{ allowed: boolean; resetTime: number }> {
  // Implement stricter rate limiting for admin endpoints
  // Allow only 10 requests per minute for admin endpoints
  return { allowed: true, resetTime: Date.now() + 60000 }
}

async function getBlockedIPs(): Promise<string[]> {
  // Implement IP blocklist retrieval
  return []
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
```

## Monitoring and Logging Setup

### 1. Security Event Monitoring

```typescript
// lib/monitoring/production-monitor.ts
import { SecurityMonitor } from '../security/monitoring'

class ProductionSecurityMonitor extends SecurityMonitor {
  static async sendCriticalAlert(alert: any) {
    // Send to multiple channels for critical alerts
    await Promise.all([
      this.sendSlackAlert(alert),
      this.sendEmailAlert(alert),
      this.sendPagerDutyAlert(alert),
      this.sendWebhookAlert(alert)
    ])
  }

  static async sendSlackAlert(alert: any) {
    if (!process.env.SLACK_WEBHOOK_URL) return

    const payload = {
      text: `🚨 Critical Security Alert: ${alert.title}`,
      attachments: [
        {
          color: 'danger',
          fields: [
            { title: 'Description', value: alert.description, short: false },
            { title: 'IP Address', value: alert.ipAddress, short: true },
            { title: 'User ID', value: alert.userId || 'N/A', short: true },
            { title: 'Timestamp', value: alert.timestamp, short: true }
          ]
        }
      ]
    }

    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }

  static async sendEmailAlert(alert: any) {
    // Implement email alerting
    const emailPayload = {
      to: process.env.SECURITY_TEAM_EMAIL,
      subject: `[CRITICAL] Security Alert: ${alert.title}`,
      html: `
        <h2>Critical Security Alert</h2>
        <p><strong>Title:</strong> ${alert.title}</p>
        <p><strong>Description:</strong> ${alert.description}</p>
        <p><strong>IP Address:</strong> ${alert.ipAddress}</p>
        <p><strong>User ID:</strong> ${alert.userId || 'N/A'}</p>
        <p><strong>Timestamp:</strong> ${alert.timestamp}</p>
        <p><strong>Metadata:</strong> <pre>${JSON.stringify(alert.metadata, null, 2)}</pre></p>
      `
    }

    // Send email using your preferred service
    await sendEmail(emailPayload)
  }

  static async sendPagerDutyAlert(alert: any) {
    if (!process.env.PAGERDUTY_INTEGRATION_KEY) return

    const payload = {
      routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
      event_action: 'trigger',
      payload: {
        summary: `Critical Security Alert: ${alert.title}`,
        source: 'cinemini-security',
        severity: 'critical',
        custom_details: alert
      }
    }

    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }
}

async function sendEmail(payload: any) {
  // Implement with your email service (SendGrid, AWS SES, etc.)
}
```

### 2. Structured Logging Configuration

```typescript
// lib/logging/production-logger.ts
import winston from 'winston'
import { SecurityLogger } from '../validation/logging'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'cinemini',
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version
  },
  transports: [
    // File transport for all logs
    new winston.transports.File({ 
      filename: '/var/log/cinemini/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: '/var/log/cinemini/combined.log' 
    }),
    
    // Console transport for development
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ] : []),
    
    // External logging service (e.g., Datadog, LogRocket)
    ...(process.env.DATADOG_API_KEY ? [
      new winston.transports.Http({
        host: 'http-intake.logs.datadoghq.com',
        path: `/v1/input/${process.env.DATADOG_API_KEY}`,
        ssl: true
      })
    ] : [])
  ]
})

// Override SecurityLogger for production
export class ProductionSecurityLogger extends SecurityLogger {
  static writeLogEntry(entry: any): void {
    logger.info('security_event', entry)
    
    // Also send to external security monitoring
    if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
      this.sendToSIEM(entry)
    }
  }

  static writeSecurityLogEntry(entry: any): void {
    logger.error('security_alert', entry)
    
    // Send to SIEM immediately
    this.sendToSIEM(entry)
    
    // Trigger alert for critical events
    if (entry.severity === 'critical') {
      ProductionSecurityMonitor.sendCriticalAlert(entry)
    }
  }

  static sendToSIEM(entry: any): void {
    // Send to Security Information and Event Management system
    if (process.env.SIEM_ENDPOINT) {
      fetch(process.env.SIEM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SIEM_API_KEY}`
        },
        body: JSON.stringify(entry)
      }).catch(error => {
        logger.error('Failed to send to SIEM', { error: error.message })
      })
    }
  }
}
```

## SSL/TLS Certificate Configuration

### 1. Certificate Generation and Installation

```bash
#!/bin/bash
# scripts/setup-ssl.sh

echo "Setting up SSL certificates for production..."

# Using Certbot with Let's Encrypt
certbot certonly \
  --nginx \
  --email security@cinemini.com \
  --agree-tos \
  --no-eff-email \
  --domains cinemini.com,www.cinemini.com

# Set up automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# Verify certificate installation
echo "Verifying SSL certificate..."
openssl x509 -in /etc/letsencrypt/live/cinemini.com/fullchain.pem -text -noout

echo "SSL setup completed successfully"
```

### 2. SSL Configuration Validation

```bash
#!/bin/bash
# scripts/validate-ssl.sh

echo "Validating SSL configuration..."

# Test SSL Labs rating
curl -s "https://api.ssllabs.com/api/v3/analyze?host=cinemini.com&publish=off&startNew=on" | jq -r '.status'

# Test certificate chain
openssl s_client -connect cinemini.com:443 -servername cinemini.com < /dev/null 2>/dev/null | openssl x509 -text -noout | grep -A 1 "Validity"

# Test TLS versions
echo "Testing TLS 1.2..."
openssl s_client -connect cinemini.com:443 -tls1_2 < /dev/null 2>/dev/null && echo "TLS 1.2: OK" || echo "TLS 1.2: FAILED"

echo "Testing TLS 1.3..."
openssl s_client -connect cinemini.com:443 -tls1_3 < /dev/null 2>/dev/null && echo "TLS 1.3: OK" || echo "TLS 1.3: FAILED"

# Test weak TLS versions (should fail)
echo "Testing TLS 1.0 (should fail)..."
openssl s_client -connect cinemini.com:443 -tls1 < /dev/null 2>/dev/null && echo "TLS 1.0: VULNERABLE" || echo "TLS 1.0: BLOCKED (Good)"

echo "SSL validation completed"
```

## Security Testing in Production

### 1. Automated Security Testing Pipeline

```yaml
# .github/workflows/security-tests.yml
name: Production Security Tests

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run OWASP ZAP Security Scan
        uses: zaproxy/action-full-scan@v0.4.0
        with:
          target: 'https://cinemini.com'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
          
      - name: Run Nuclei Vulnerability Scanner
        run: |
          docker run --rm -v $(pwd):/app projectdiscovery/nuclei:latest \
            -target https://cinemini.com \
            -templates /app/.nuclei-templates \
            -output /app/nuclei-results.txt
            
      - name: Run Custom Security Tests
        run: |
          npm install
          npm run security:test:production
          
      - name: Upload Security Report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: security-report.json
```

### 2. Production Security Test Script

```bash
#!/bin/bash
# scripts/production-security-test.sh

echo "Running production security tests..."

# Test 1: SSL Configuration
echo "1. Testing SSL configuration..."
testssl.sh --protocols --ciphers --server-defaults https://cinemini.com

# Test 2: Security Headers
echo "2. Testing security headers..."
curl -I https://cinemini.com | grep -E "(X-Frame-Options|X-XSS-Protection|X-Content-Type-Options|Strict-Transport-Security|Content-Security-Policy)"

# Test 3: Rate Limiting
echo "3. Testing rate limiting..."
for i in {1..30}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" https://cinemini.com/api/health)
  echo "Request $i: $response"
  if [ "$response" == "429" ]; then
    echo "Rate limiting is working correctly"
    break
  fi
done

# Test 4: Authentication
echo "4. Testing authentication endpoints..."
curl -X POST https://cinemini.com/api/admin/security/dashboard \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "%{http_code}\n"

# Test 5: CSRF Protection
echo "5. Testing CSRF protection..."
curl -X POST https://cinemini.com/api/user/profile \
  -H "Content-Type: application/json" \
  -d '{"displayName": "test"}' \
  -w "%{http_code}\n"

echo "Production security tests completed"
```

## Post-Deployment Verification

### 1. Security Verification Checklist

Create and run this verification script after deployment:

```bash
#!/bin/bash
# scripts/post-deployment-security-check.sh

echo "🔒 Post-Deployment Security Verification"
echo "========================================"

# Test 1: Application Health
echo "1. Checking application health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://cinemini.com/api/health)
if [ "$HEALTH_STATUS" == "200" ]; then
  echo "✅ Application is healthy"
else
  echo "❌ Application health check failed: $HEALTH_STATUS"
  exit 1
fi

# Test 2: Security Headers
echo "2. Verifying security headers..."
HEADERS=$(curl -s -I https://cinemini.com)

check_header() {
  local header=$1
  local expected=$2
  if echo "$HEADERS" | grep -i "$header" | grep -q "$expected"; then
    echo "✅ $header header is correctly set"
  else
    echo "❌ $header header is missing or incorrect"
  fi
}

check_header "Strict-Transport-Security" "max-age"
check_header "X-Frame-Options" "DENY"
check_header "X-Content-Type-Options" "nosniff"
check_header "X-XSS-Protection" "1; mode=block"
check_header "Content-Security-Policy" "default-src"

# Test 3: Authentication
echo "3. Testing authentication protection..."
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://cinemini.com/admin/security)
if [ "$AUTH_STATUS" == "401" ] || [ "$AUTH_STATUS" == "403" ]; then
  echo "✅ Admin routes are protected"
else
  echo "❌ Admin routes may not be properly protected: $AUTH_STATUS"
fi

# Test 4: Rate Limiting
echo "4. Testing rate limiting..."
RATE_LIMIT_HIT=false
for i in {1..20}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://cinemini.com/api/games)
  if [ "$STATUS" == "429" ]; then
    RATE_LIMIT_HIT=true
    break
  fi
  sleep 0.1
done

if [ "$RATE_LIMIT_HIT" = true ]; then
  echo "✅ Rate limiting is active"
else
  echo "⚠️  Rate limiting may not be working"
fi

# Test 5: Database Security
echo "5. Testing database security..."
DB_TEST=$(curl -s -X POST https://cinemini.com/api/test-db \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM auth.users;"}' \
  -w "%{http_code}")

if [ "$DB_TEST" != "200" ]; then
  echo "✅ Database is protected from direct queries"
else
  echo "❌ Database security may be compromised"
fi

# Test 6: File Upload Security
echo "6. Testing file upload security..."
UPLOAD_TEST=$(curl -s -X POST https://cinemini.com/api/upload \
  -F "file=@/etc/passwd" \
  -w "%{http_code}")

if [ "$UPLOAD_TEST" == "400" ] || [ "$UPLOAD_TEST" == "403" ]; then
  echo "✅ File upload is secured"
else
  echo "❌ File upload security needs review: $UPLOAD_TEST"
fi

echo ""
echo "🎉 Security verification completed!"
echo "Please review any failed checks before proceeding."
```

### 2. Monitoring Setup Verification

```typescript
// scripts/verify-monitoring.ts
import { SecurityMonitor } from '../lib/security/monitoring'
import { AuditLogger } from '../lib/security/audit-logger'

async function verifyMonitoringSetup() {
  console.log('🔍 Verifying monitoring setup...')

  try {
    // Test security monitoring
    const dashboardData = await SecurityMonitor.getDashboardData()
    console.log('✅ Security monitoring is active')
    console.log(`   - Active alerts: ${dashboardData.alerts.length}`)
    console.log(`   - System status: ${dashboardData.systemHealth.status}`)

    // Test audit logging
    const auditStats = await AuditLogger.getAuditStatistics('day')
    console.log('✅ Audit logging is active')
    console.log(`   - Events today: ${auditStats.totalEvents}`)
    console.log(`   - Categories: ${Object.keys(auditStats.eventsByCategory).length}`)

    // Test alerting
    console.log('📧 Testing alert system...')
    await SecurityMonitor.createAlert('SYSTEM_TEST', {
      url: 'https://cinemini.com/test',
      method: 'GET',
      headers: new Map([['user-agent', 'monitoring-test']])
    } as any, {
      severity: 'low',
      title: 'Monitoring System Test',
      description: 'This is a test alert to verify the monitoring system',
      metadata: { test: true }
    })
    console.log('✅ Alert system test completed')

    console.log('\n🎉 All monitoring systems are operational!')

  } catch (error) {
    console.error('❌ Monitoring verification failed:', error)
    process.exit(1)
  }
}

verifyMonitoringSetup()
```

## Incident Response Setup

### 1. Automated Incident Response

```typescript
// lib/incident-response/automated-response.ts
import { SecurityMonitor, SecurityEventType } from '../security/monitoring'

export class AutomatedIncidentResponse {
  static async handleSecurityIncident(alert: any) {
    const responseActions = this.getResponseActions(alert.eventType, alert.severity)
    
    for (const action of responseActions) {
      try {
        await this.executeAction(action, alert)
        console.log(`✅ Executed action: ${action.name}`)
      } catch (error) {
        console.error(`❌ Failed to execute action: ${action.name}`, error)
      }
    }
  }

  static getResponseActions(eventType: SecurityEventType, severity: string) {
    const actions = []

    // Critical incidents
    if (severity === 'critical') {
      actions.push(
        { name: 'block_ip', priority: 1 },
        { name: 'revoke_sessions', priority: 2 },
        { name: 'enable_maintenance_mode', priority: 3 },
        { name: 'notify_security_team', priority: 4 }
      )
    }

    // High severity incidents
    if (severity === 'high') {
      actions.push(
        { name: 'rate_limit_ip', priority: 1 },
        { name: 'notify_security_team', priority: 2 }
      )
    }

    // Event-specific actions
    switch (eventType) {
      case SecurityEventType.BRUTE_FORCE_ATTEMPT:
        actions.push({ name: 'block_ip_temporary', priority: 1 })
        break
      
      case SecurityEventType.SQL_INJECTION_ATTEMPT:
        actions.push(
          { name: 'block_ip', priority: 1 },
          { name: 'log_request_details', priority: 2 }
        )
        break
        
      case SecurityEventType.XSS_ATTEMPT:
        actions.push({ name: 'sanitize_input', priority: 1 })
        break
    }

    return actions.sort((a, b) => a.priority - b.priority)
  }

  static async executeAction(action: any, alert: any) {
    switch (action.name) {
      case 'block_ip':
        await this.blockIP(alert.ipAddress, 'permanent')
        break
        
      case 'block_ip_temporary':
        await this.blockIP(alert.ipAddress, '1h')
        break
        
      case 'rate_limit_ip':
        await this.rateLimitIP(alert.ipAddress)
        break
        
      case 'revoke_sessions':
        await this.revokeUserSessions(alert.userId)
        break
        
      case 'enable_maintenance_mode':
        await this.enableMaintenanceMode()
        break
        
      case 'notify_security_team':
        await this.notifySecurityTeam(alert)
        break
        
      case 'log_request_details':
        await this.logDetailedRequest(alert)
        break
    }
  }

  static async blockIP(ip: string, duration: string) {
    // Implement IP blocking (firewall rules, load balancer, etc.)
    console.log(`Blocking IP ${ip} for ${duration}`)
  }

  static async rateLimitIP(ip: string) {
    // Implement stricter rate limiting for specific IP
    console.log(`Applying rate limit to IP ${ip}`)
  }

  static async revokeUserSessions(userId?: string) {
    if (userId) {
      // Revoke all sessions for specific user
      console.log(`Revoking sessions for user ${userId}`)
    } else {
      // Revoke all active sessions (nuclear option)
      console.log('Revoking all active sessions')
    }
  }

  static async enableMaintenanceMode() {
    // Enable maintenance mode
    process.env.MAINTENANCE_MODE = 'true'
    console.log('Maintenance mode enabled')
  }

  static async notifySecurityTeam(alert: any) {
    // Send immediate notification to security team
    console.log('Notifying security team of incident')
  }

  static async logDetailedRequest(alert: any) {
    // Log detailed request information for forensic analysis
    console.log('Logging detailed request information')
  }
}
```

### 2. Manual Incident Response Procedures

```markdown
# Security Incident Response Procedures

## Incident Classification

### P0 - Critical (Response time: Immediate)
- Active data breach
- System compromise with admin access
- Ongoing attack affecting multiple users
- Service completely unavailable due to security incident

### P1 - High (Response time: 15 minutes)
- Suspected data breach
- Privilege escalation attempt
- Multiple failed security controls
- Significant service disruption

### P2 - Medium (Response time: 1 hour)
- Security policy violations
- Suspicious activity patterns
- Single failed security control
- Minor service disruption

### P3 - Low (Response time: 4 hours)
- Security configuration issues
- Informational security events
- Compliance violations

## Emergency Response Actions

### Immediate Actions (0-5 minutes)
1. Assess the severity and scope of the incident
2. Activate incident response team
3. Isolate affected systems if necessary
4. Preserve evidence and logs
5. Document all actions taken

### Short-term Actions (5-30 minutes)
1. Contain the incident to prevent further damage
2. Identify the root cause
3. Implement temporary fixes or workarounds
4. Communicate with stakeholders
5. Continue evidence collection

### Medium-term Actions (30 minutes - 4 hours)
1. Develop and implement permanent fixes
2. Verify system integrity
3. Restore normal operations
4. Monitor for recurring issues
5. Update security controls

### Long-term Actions (4+ hours)
1. Conduct post-incident review
2. Update policies and procedures
3. Implement preventive measures
4. Provide security awareness training
5. Test incident response procedures
```

## Maintenance and Updates

### 1. Security Update Schedule

```bash
#!/bin/bash
# scripts/security-maintenance.sh

echo "🔧 Running security maintenance tasks..."

# Daily tasks
if [ "$1" == "daily" ]; then
  echo "Running daily security maintenance..."
  
  # Update dependency vulnerability database
  npm audit --audit-level=moderate
  
  # Rotate log files
  logrotate /etc/logrotate.d/cinemini
  
  # Clean old audit logs (keep 90 days)
  find /var/log/cinemini/audit -name "*.log" -mtime +90 -delete
  
  # Update IP blocklist
  curl -s https://lists.blocklist.de/lists/all.txt > /tmp/blocklist.txt
  # Process and update firewall rules
  
  # Run basic security health check
  npm run security:health-check
fi

# Weekly tasks
if [ "$1" == "weekly" ]; then
  echo "Running weekly security maintenance..."
  
  # Update all dependencies
  npm update
  npm audit fix
  
  # Run comprehensive security scan
  npm run security:scan:full
  
  # Generate security report
  npm run security:report:weekly
  
  # Backup security configurations
  tar -czf "/backup/security-config-$(date +%Y%m%d).tar.gz" \
    /etc/nginx/nginx.conf \
    /etc/redis/redis.conf \
    .env.production
fi

# Monthly tasks
if [ "$1" == "monthly" ]; then
  echo "Running monthly security maintenance..."
  
  # Rotate secrets
  ./scripts/rotate-secrets.sh
  
  # Review and update security policies
  echo "Review security policies and update if necessary"
  
  # Conduct security assessment
  npm run security:assessment
  
  # Generate compliance report
  npm run security:compliance-report
  
  # Update security documentation
  echo "Review and update security documentation"
fi

echo "Security maintenance completed for: $1"
```

### 2. Automated Security Updates

```yaml
# .github/workflows/security-updates.yml
name: Automated Security Updates

on:
  schedule:
    - cron: '0 6 * * 1' # Weekly on Monday at 6 AM
  workflow_dispatch:

jobs:
  security-updates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run security audit
        run: npm audit --audit-level=moderate
        
      - name: Update dependencies
        run: |
          npm update
          npm audit fix --audit-level=moderate
          
      - name: Run security tests
        run: npm run security:test
        
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'security: automated dependency updates'
          title: 'Automated Security Updates'
          body: |
            This PR contains automated security updates:
            - Updated dependencies to latest secure versions
            - Fixed security vulnerabilities
            - Passed all security tests
          branch: security/automated-updates
```

---

## Final Deployment Command

Once all security measures are in place, use this command to deploy:

```bash
#!/bin/bash
# scripts/secure-deploy.sh

echo "🚀 Starting secure production deployment..."

# Pre-deployment checks
echo "1. Running pre-deployment security checks..."
./scripts/pre-deployment-security-check.sh

# Validate environment
echo "2. Validating environment configuration..."
node scripts/validate-env.js

# Build application
echo "3. Building application..."
NODE_ENV=production npm run build

# Deploy to production
echo "4. Deploying to production..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "5. Waiting for services to start..."
sleep 30

# Post-deployment verification
echo "6. Running post-deployment verification..."
./scripts/post-deployment-security-check.sh

# Start monitoring
echo "7. Activating monitoring systems..."
npm run monitoring:start

echo "✅ Secure deployment completed successfully!"
echo "📊 Access security dashboard at: https://cinemini.com/admin/security"
echo "🔍 Monitor logs at: /var/log/cinemini/"
echo "📧 Security alerts will be sent to: $SECURITY_TEAM_EMAIL"
```

This comprehensive deployment guide ensures that CineMini is deployed with enterprise-grade security measures, comprehensive monitoring, and automated incident response capabilities.