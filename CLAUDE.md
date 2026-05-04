# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aiva is an AI-powered healthcare appointment management system built with Next.js 16. It features an AI receptionist for handling patient calls, appointment scheduling, patient management, and analytics dashboards.

## Development Commands

```bash
# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Architecture

### App Router Structure

The application uses Next.js App Router with route groups for organization:

- **Root (`app/page.tsx`)**: Redirects to `/login`
- **`(auth)` group**: Contains authentication pages (login)
- **`(dashboard)` group**: Contains all authenticated application pages with shared layout

### Route Groups and Layouts

The `(dashboard)` route group (`app/(dashboard)/layout.tsx`) wraps all authenticated pages with:
- `NewSidebar` component for navigation
- Client-side routing using Next.js router
- Shared background styling (`bg-[#F7F9FB]`)

All dashboard routes are client components (`'use client'`) and follow this pattern:
1. Import corresponding page component from `components/pages/`
2. Handle navigation via `useRouter` hook
3. Pass `onNavigate` handler to page component

### Component Organization

```
components/
├── layout/          # Layout components (NewSidebar, Sidebar)
├── pages/           # Page-level components (one per route)
│   ├── New*.tsx     # Current/active page components
│   └── *.tsx        # Legacy page components
├── ui/              # Reusable UI components (shadcn/ui + custom)
└── figma/           # Figma design references
```

**Important**: Page components live in `components/pages/`, NOT in `app/` routes. Route files in `app/` are thin wrappers that import from `components/pages/`.

### Data Layer

- **Mock Data**: All data is currently mocked in `data/mockData.ts`
- **Key Types**: `CallRecording`, `Appointment`, `Patient` (all defined in mockData.ts)
- **No Backend**: This is a frontend-only application using static mock data

### Naming Convention

- **New vs Legacy**: Components prefixed with `New` (e.g., `NewDashboardPage.tsx`) are the current active versions. Non-prefixed versions are legacy/deprecated.
- When modifying pages, always update the `New*` version unless specifically working on legacy code.

### Path Aliases

- `@/*` maps to the root directory (configured in `tsconfig.json`)
- Example: `@/components/ui/button` → `<root>/components/ui/button`

### Available Routes

- `/login` - Authentication page
- `/dashboard` - Main dashboard overview
- `/appointments` - Appointment management
- `/patients` - Patient records
- `/ai-receptionist` - AI call handling interface
- `/analytics` - Analytics and reporting
- `/settings` - Application settings
- `/ui-kit` - Component library showcase

### UI Component Library

The project uses shadcn/ui components (Radix UI primitives + Tailwind CSS):
- All UI components are in `components/ui/`
- Custom components: `AivaLogo`, `StatsBar`, `TopBar`, `PaginationBar`, `AppointmentToast`
- Uses `class-variance-authority` for component variants
- Tailwind CSS v4 with custom configuration

### Styling

- **Framework**: Tailwind CSS v4 (PostCSS-based)
- **Global Styles**: `app/globals.css` (82KB - includes extensive Tailwind utilities)
- **Fonts**: Geist Sans and Geist Mono (loaded via `next/font/google`)
- **Theme**: Light theme with primary color scheme around `#F7F9FB` background

### Toast Notifications

- Uses `sonner` library via `@/components/ui/sonner`
- Toaster positioned at `top-right` in root layout
- Import: `import { toast } from 'sonner'`

## Key Architectural Patterns

1. **Separation of Concerns**: Route files are minimal - they only handle routing and pass navigation handlers. All UI logic lives in page components.

2. **Navigation Pattern**: Navigation is handled via callbacks:
   ```tsx
   const handleNavigate = (page: string, subPage?: string) => {
     if (page === 'settings' && subPage) {
       router.push(`/settings?tab=${subPage}`);
     } else {
       router.push(`/${page}`);
     }
   };
   ```

3. **Client-Side State**: All dashboard pages use client components with React hooks for state management. No server components in dashboard routes.

4. **Type Safety**: TypeScript strict mode enabled. Core types defined in `types/index.ts` (e.g., `PageType`).

## Important Notes

- The application is currently frontend-only with no backend API
- All data comes from `data/mockData.ts`
- Authentication is not implemented - login redirects to dashboard without validation
- The project uses React 19 and Next.js 16 (latest versions)
