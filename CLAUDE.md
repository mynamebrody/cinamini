# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run Next.js linting

## Architecture Overview

This is a Next.js 15 application with Supabase authentication using the App Router. Key architectural elements:

### Tech Stack
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: Supabase with SSR support
- **Package Manager**: pnpm
- **UI Library**: Radix UI primitives via shadcn/ui

### Project Structure
- `app/` - Next.js App Router pages and layouts
  - `auth/login/` and `auth/sign-up/` - Authentication pages
- `components/` - React components
  - `ui/` - shadcn/ui component library
  - `login-form.tsx`, `signup-form.tsx` - Auth forms
- `lib/` - Utility functions and configurations
  - `supabase/` - Supabase client configurations for client/server
  - `actions.ts` - Server actions
- `hooks/` - Custom React hooks

### Authentication Setup
The app uses Supabase for authentication with conditional configuration:
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase client gracefully handles missing configuration (`lib/supabase/client.ts:4-8`)
- Server-side and client-side clients are properly separated

### UI Components
Built on shadcn/ui with extensive Radix UI components. The `components.json` configures:
- Path aliases for easy imports (`@/components`, `@/lib`, etc.)
- Tailwind integration with CSS variables
- Lucide icons as the icon library

### Styling
- Global styles in `app/globals.css`
- Tailwind configuration in `tailwind.config.ts`
- Uses Geist font family
- CSS variables for theming support