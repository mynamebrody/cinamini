# Admin Implementation PR Checklist

## 🚨 CRITICAL SECURITY FIXES (Must Complete Before PR)

### ❌ 1. Fix SQL Injection Vulnerability
**File**: `/app/api/admin/puzzles/save/route.ts`
```typescript
// Add this validation before line 39
const ALLOWED_GAME_TYPES = ['retitled', 'budget_bracket', 'cast_climb'];
if (!ALLOWED_GAME_TYPES.includes(gameType)) {
  return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
}
```

### ❌ 2. Add Authentication to Analytics Endpoint
**File**: `/app/api/admin/analytics/overview/route.ts`
```typescript
// Add after line 6
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

// Check admin status
const { data: profile } = await supabase
  .from('cinamini_user_profiles')
  .select('is_super_admin')
  .eq('user_id', user.id)
  .single()

if (!profile?.is_super_admin) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

### ❌ 3. Remove Direct Supabase URL Exposure
**File**: `/app/admin/layout.tsx`
Replace line 41:
```typescript
// Remove: href: process.env.NEXT_PUBLIC_SUPABASE_URL + "/studio"
// Add: href: "/api/admin/redirect/supabase-studio"
```

Create redirect endpoint at `/app/api/admin/redirect/supabase-studio/route.ts`

## 🟠 HIGH PRIORITY FIXES (Should Complete)

### ❌ 4. Add Input Validation
Create `/lib/validators/admin.ts`:
```typescript
import { z } from 'zod'

export const savePuzzleSchema = z.object({
  gameType: z.enum(['retitled', 'budget_bracket', 'cast_climb']),
  puzzleData: z.object({
    // Add specific validation for each game type
  })
})
```

### ❌ 5. Implement Rate Limiting
Add middleware for all admin routes to prevent brute force attacks.

### ❌ 6. Fix N+1 Queries
**File**: `/app/api/admin/analytics/overview/route.ts`
Replace multiple queries with optimized database functions.

## 🟡 MEDIUM PRIORITY IMPROVEMENTS

### ❌ 7. Add XSS Protection
Sanitize all external content (TMDB data) before rendering.

### ❌ 8. Optimize Images
Replace direct image URLs with Next.js Image component.

### ❌ 9. Add Error Boundaries
Wrap admin sections to prevent full page crashes.

## ✅ COMPLETED ITEMS

- ✅ Admin authentication middleware
- ✅ Database migrations for admin features
- ✅ UI components with shadcn/ui
- ✅ TypeScript types throughout
- ✅ Responsive design

## 📋 Testing Checklist

### Manual Testing Required:
- [ ] Test all admin routes with non-admin user (should 403)
- [ ] Test all admin routes while logged out (should 401)
- [ ] Test puzzle creation/editing for all game types
- [ ] Test schedule drag-and-drop functionality
- [ ] Test movie search and selection
- [ ] Test analytics data accuracy
- [ ] Test on mobile devices
- [ ] Test with slow network connection

### Security Testing:
- [ ] Attempt SQL injection on all inputs
- [ ] Test for XSS vulnerabilities
- [ ] Verify no sensitive data in console logs
- [ ] Check network tab for exposed secrets

## 🚀 Performance Checklist

- [ ] Bundle size under 300KB for admin
- [ ] Initial load time under 2 seconds
- [ ] No console errors or warnings
- [ ] All images lazy loaded
- [ ] Database queries optimized

## 📝 Documentation Required

- [ ] Update README with admin setup instructions
- [ ] Document admin user creation process
- [ ] Add API endpoint documentation
- [ ] Create admin feature guide

## ⚠️ DO NOT MERGE UNTIL

1. **All CRITICAL security fixes are implemented**
2. **Analytics endpoint is secured**
3. **SQL injection vulnerability is patched**
4. **Manual security testing is complete**

## 🎯 Post-Merge Tasks

1. Run database migration: `npm run db:push`
2. Monitor error logs for 24 hours
3. Check performance metrics
4. Gather team feedback on admin UX

---

**Reviewer Notes**: This PR introduces significant admin functionality but has critical security vulnerabilities that must be addressed. Do not approve until all critical items are resolved.