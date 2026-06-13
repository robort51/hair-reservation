# YJMF Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js frontend with a polished YJMF customer booking flow and a practical admin appointment workspace.

**Architecture:** Create a standalone `web/` Next.js app that talks to the existing NestJS backend through a typed API client. Keep booking-specific components under `components/booking`, admin components under `components/admin`, and shared primitives under `components/ui`.

**Tech Stack:** Next.js, React, TypeScript, CSS variables/global CSS, Bun, existing NestJS API at `http://localhost:3000`.

---

## File Structure

```text
web/
  .env.example
  next.config.ts
  package.json
  tsconfig.json
  app/
    globals.css
    layout.tsx
    page.tsx
    book/page.tsx
    admin/page.tsx
    admin/appointments/page.tsx
  components/
    admin/AdminAppointments.tsx
    booking/BookingFlow.tsx
    ui/EmptyState.tsx
    ui/StatusPill.tsx
  lib/
    api.ts
    format.ts
    types.ts
```

## Task 1: Create Frontend Project Shell

**Files:**
- Create: `web/package.json`
- Create: `web/next.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/.env.example`
- Create: `web/app/layout.tsx`
- Create: `web/app/globals.css`

- [ ] **Step 1: Create package and config files**

Create `web/package.json`:

```json
{
  "name": "yjmf-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "check": "bun run typecheck && bun run build"
  },
  "dependencies": {
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "typescript": "latest"
  },
  "devDependencies": {}
}
```

Create `web/next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

Create `web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `web/.env.example`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
cd web
bun install
```

Expected: dependencies installed and `web/bun.lock` created.

## Task 2: Shared Styling and Layout

**Files:**
- Create: `web/app/layout.tsx`
- Create: `web/app/globals.css`

- [ ] **Step 1: Add global layout**

Create `web/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YJMF 预约',
  description: 'YJMF 单门店美发预约系统',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Add global CSS**

Create `web/app/globals.css` with CSS variables, typography, shared buttons, grid texture, responsive layout helpers, booking cards, and admin table styles.

- [ ] **Step 3: Verify shell**

Run:

```bash
cd web
bun run typecheck
```

Expected: exit code 0.

## Task 3: API Client and Types

**Files:**
- Create: `web/lib/types.ts`
- Create: `web/lib/format.ts`
- Create: `web/lib/api.ts`

- [ ] **Step 1: Define API types**

Create `web/lib/types.ts` for service items, staff, availability, appointments, and unified API response.

- [ ] **Step 2: Define format helpers**

Create `web/lib/format.ts` with `formatPrice`, `formatDateLabel`, `formatTime`, and `toDateKey`.

- [ ] **Step 3: Define API client**

Create `web/lib/api.ts` with `apiGet`, `apiPost`, `apiPatch`, and typed endpoint helpers:

```ts
getServiceItems()
getStaff()
getAvailability(params)
createAppointment(payload)
getAppointments()
completeAppointment(id)
cancelAppointment(id, cancelReason)
```

- [ ] **Step 4: Verify types**

Run:

```bash
cd web
bun run typecheck
```

Expected: exit code 0.

## Task 4: YJMF Home Page

**Files:**
- Create: `web/app/page.tsx`

- [ ] **Step 1: Implement home page**

Create a polished brand landing page with:

- YJMF brand hero.
- Primary CTA to `/book`.
- Secondary CTA to `/admin`.
- Service overview for 洗吹、洗剪吹、基础护理、染发、烫发.
- Booking steps and store notes.

- [ ] **Step 2: Verify page**

Run:

```bash
cd web
bun run typecheck
```

Expected: exit code 0.

## Task 5: Customer Booking Flow

**Files:**
- Create: `web/components/booking/BookingFlow.tsx`
- Create: `web/app/book/page.tsx`

- [ ] **Step 1: Implement booking flow component**

Create a client component that:

- Loads services and staff.
- Lets the user choose service, staff, date, slot, name, phone, and remark.
- Loads availability when service/date changes.
- Posts appointments.
- Shows success and conflict states.

- [ ] **Step 2: Add booking page**

Create `web/app/book/page.tsx` to render `BookingFlow`.

- [ ] **Step 3: Verify page**

Run:

```bash
cd web
bun run typecheck
```

Expected: exit code 0.

## Task 6: Admin Appointment Workspace

**Files:**
- Create: `web/components/ui/StatusPill.tsx`
- Create: `web/components/ui/EmptyState.tsx`
- Create: `web/components/admin/AdminAppointments.tsx`
- Create: `web/app/admin/page.tsx`
- Create: `web/app/admin/appointments/page.tsx`

- [ ] **Step 1: Create shared UI**

Create status pill and empty state components.

- [ ] **Step 2: Create admin appointments component**

Create a client component that:

- Loads appointments.
- Shows summary cards.
- Shows appointment timeline/table.
- Can complete appointments.
- Can cancel appointments with a reason.

- [ ] **Step 3: Add admin pages**

Create `/admin` and `/admin/appointments` pages that render the shared admin component.

- [ ] **Step 4: Verify page**

Run:

```bash
cd web
bun run typecheck
```

Expected: exit code 0.

## Task 7: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run frontend check**

Run:

```bash
cd web
bun run check
```

Expected: typecheck and build pass.

- [ ] **Step 2: Run backend check**

Run:

```bash
cd server
bun run check
```

Expected: lint, typecheck, tests, e2e, build, and Prisma validation pass.

- [ ] **Step 3: Start dev servers for manual preview**

Run backend:

```bash
cd server
bun run start:dev
```

Run frontend:

```bash
cd web
bun run dev
```

Expected:

```text
Frontend: http://localhost:3001
Backend: http://localhost:3000
```
