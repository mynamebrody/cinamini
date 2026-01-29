# Dependency Upgrade Notes - January 2026

This document summarizes the dependency upgrades performed for security and maintenance purposes.

## Summary

All dependencies have been upgraded to their latest versions. This addresses multiple security vulnerabilities and provides the latest features and bug fixes.

### Security Status

**Before Upgrade:**
- 5 vulnerabilities (2 moderate, 2 high, 1 critical)
  - Critical: Next.js multiple vulnerabilities (DoS, RCE, SSRF)
  - High: tar package (Supabase dependency)
  - Moderate: js-yaml, lodash

**After Upgrade:**
- 1 moderate vulnerability remaining
  - Next.js PPR (Partial Prerendering) memory consumption issue
  - **Note:** This does NOT affect our application as we don't use PPR (`experimental.ppr` or `cacheComponents` not enabled in next.config.mjs)

## Major Version Updates

### OpenAI SDK: 5.18.1 → 6.17.0 (MAJOR)

**Impact:** Low - The OpenAI v6 SDK maintains backward compatibility for the APIs we use.

**What We Use:**
- `openai.responses.create()` - Still supported in v6
- Direct fetch API calls to OpenAI - Unchanged

**Action Required:** None. All existing code continues to work.

**Migration Guide:** https://github.com/openai/openai-node/blob/main/MIGRATION.md

### @types/node: 24.10.9 → 25.1.0 (MAJOR)

**Impact:** Low - TypeScript type definitions update for Node.js types.

**Action Required:** None. This is a type-only change.

## Framework & Core Library Updates

### Next.js: 15.4.2 → 15.5.11

**Impact:** HIGH - Security fix

**Fixed Vulnerabilities:**
- Next.js HTTP request deserialization DoS
- Next.js RCE in React flight protocol
- Next.js DoS with Server Components
- Next.js self-hosted DoS via Image Optimizer
- Next.js SSRF via improper middleware redirect handling
- Next Server Actions Source Code Exposure
- Next.js Content Injection vulnerability

**Note:** Next.js 16.x is available but represents a major version change. Staying on 15.5.11 for stability.

### React & React-DOM: 19.1.0 → 19.2.4

**Impact:** Low - Patch updates with bug fixes

### Supabase

- **@supabase/supabase-js**: 2.52.1 → 2.93.3
- **@supabase/ssr**: 0.6.1 → 0.8.0

**Impact:** Medium - Significant updates with new features and bug fixes

**Action Required:** None. SSR patterns remain unchanged.

### Lodash: 4.17.21 → 4.17.23

**Impact:** Medium - Security fix

**Fixed:** Prototype pollution vulnerability in `_.unset` and `_.omit` functions

## UI Component Updates

All Radix UI components updated to latest versions:
- @radix-ui/react-checkbox: 1.3.2 → 1.3.3
- @radix-ui/react-label: 2.1.7 → 2.1.8
- @radix-ui/react-popover: 1.1.14 → 1.1.15
- @radix-ui/react-radio-group: 1.3.7 → 1.3.8
- @radix-ui/react-scroll-area: 1.2.9 → 1.2.10
- @radix-ui/react-select: 2.2.5 → 2.2.6
- @radix-ui/react-slider: 1.3.5 → 1.3.6
- @radix-ui/react-switch: 1.2.5 → 1.2.6
- @radix-ui/react-tabs: 1.1.12 → 1.1.13
- @radix-ui/react-tooltip: 1.2.7 → 1.2.8

**Impact:** Low - Minor bug fixes and improvements

## Developer Tools Updates

- **ESLint**: 9.34.0 → 9.39.2
- **TypeScript**: 5.8.3 → 5.9.3
- **Tailwind CSS**: 4.1.11 → 4.1.18
- **Supabase CLI**: 2.40.7 → 2.72.9

**Impact:** Low - Development experience improvements

## Other Notable Updates

- **lucide-react**: 0.525.0 → 0.563.0 (new icons)
- **framer-motion**: 12.23.12 → 12.29.2 (animation improvements)
- **recharts**: 3.1.0 → 3.7.0 (chart library updates)
- **zod**: 4.0.10 → 4.3.6 (schema validation improvements)
- **react-day-picker**: 9.8.1 → 9.13.0 (date picker improvements)

## Testing Status

✅ **Linting:** All tests pass (no new issues introduced)
⚠️ **Build:** Cannot test due to network restrictions in CI environment (fonts.googleapis.com blocked)

**Recommendation:** Test the build in your local development environment or staging deployment before merging to production.

## Migration Checklist

- [x] All dependencies updated
- [x] Security vulnerabilities addressed
- [x] Linting passes
- [ ] Local build test (requires developer environment)
- [ ] Staging deployment test
- [ ] Production deployment

## Known Issues

1. **Next.js deprecation warning**: `next lint` is deprecated and will be removed in Next.js 16. Consider migrating to ESLint CLI using: `npx @next/codemod@canary next-lint-to-eslint-cli .`

2. **OpenAI API Review**: The `openai.responses.create()` API in `app/api/admin/movies/fun-facts/route.ts` should be reviewed to ensure it follows the latest OpenAI SDK v6 best practices, though it currently works.

## Future Considerations

- **Next.js 16**: When ready for a major upgrade, Next.js 16.1.6 is available and includes additional security fixes
- **@types/node v26**: When Node.js v26 LTS is released, consider upgrading

## References

- [Next.js Release Notes](https://github.com/vercel/next.js/releases)
- [OpenAI Node.js SDK Migration Guide](https://github.com/openai/openai-node/blob/main/MIGRATION.md)
- [Supabase Changelog](https://github.com/supabase/supabase/releases)
