# Foot Asylum Assurance Platform (KSS Internal)

A standalone internal web application for KSS NW (Foot Asylum's security/assurance partner). The system serves as a Single Source of Truth for managing incidents, accidents, investigations, and action tracking.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (Strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Icons**: lucide-react
- **Backend**: Supabase (Postgres, Auth, Storage)
- **Forms**: react-hook-form + zod
- **Tables**: @tanstack/react-table
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase project (ID: `fwnzpafwfaiynrclwtnh`)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://fwnzpafwfaiynrclwtnh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

3. Run database migrations:
   - Apply the migration file in `supabase/migrations/001_fa_schema.sql` to your Supabase project
   - Create the storage bucket `fa-attachments` in Supabase Storage

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

All tables and enums are prefixed with `fa_` to prevent collisions in the shared database.

### Key Tables

- `fa_profiles` - User profiles extending auth.users
- `fa_stores` - Store locations
- `fa_incidents` - Incident records
- `fa_investigations` - Investigation details
- `fa_actions` - Action items
- `fa_attachments` - File attachments
- `fa_activity_log` - Audit trail

### Row Level Security (RLS)

RLS is enabled on all tables with role-based access:
- **Admin**: Full access (read/write all, manage users/stores)
- **Ops**: Read/Write Incidents, Investigations, Actions. Cannot manage users/stores
- **Readonly**: View only

## Features

- **Incident Management**: Create, view, and manage incidents with full workflow
- **Investigations**: Track investigations with root cause analysis
- **Actions**: Assign and track action items with overdue detection
- **Attachments**: Upload and manage file attachments
- **Dashboard**: KPIs, charts, and activity feed
- **Reports**: CSV export for incidents and actions
- **Print View**: Printable incident reports
- **Audit Trail**: Complete activity logging for all changes

## Project Structure

```
/app
  /(auth)          - Authentication pages
  /(protected)     - Protected routes
    /dashboard     - Dashboard with KPIs
    /incidents     - Incident management
    /actions       - Actions list
    /stores        - Store management (admin only)
    /reports       - Reports and exports
/components        - React components
/lib               - Utilities and helpers
  /supabase        - Supabase client setup
  /activity-log.ts - Audit logging helper
/app/actions       - Server actions
/supabase/migrations - Database migrations
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Notes

- All database operations use server actions or route handlers
- Activity logging is automatic via database triggers
- Storage bucket policies must be configured in Supabase Dashboard
- User profiles are auto-created on first login with default 'readonly' role
- Admin users must be manually assigned via database

