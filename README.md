# KSS x Footasylum Assurance Platform (KSS Internal)

A standalone internal web application for KSS NW (KSS x Footasylum's security/assurance partner). The system serves as a Single Source of Truth for managing incidents, accidents, investigations, and action tracking.

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

Edit `.env.local` and add your Supabase credentials and OpenAI API key:
```
NEXT_PUBLIC_SUPABASE_URL=https://fwnzpafwfaiynrclwtnh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
OPENAI_API_KEY=your_openai_api_key_here
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
- **Readonly**: View only (internal KSS users)
- **Client**: Read-only access to incidents, actions, audits, and stores. No access to route planning or activity logs (KSS x Footasylum client portal)

## Features

- **Incident Management**: Create, view, and manage incidents with full workflow
- **Investigations**: Track investigations with root cause analysis
- **Actions**: Assign and track action items with overdue detection
- **Attachments**: Upload and manage file attachments
- **Dashboard**: KPIs, charts, and activity feed with AI-powered compliance reports
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

## User Management

### Account Creation

**Sign up is disabled** - All user accounts must be created by administrators via the Supabase Dashboard.

#### Creating New Users

**Option 1: Self-Registration (Recommended for most users)**
- Users can create their own accounts by clicking "Sign up" on the login page
- They enter their full name, email, and password
- KSS x Footasylum clients can check the "I am a KSS x Footasylum client" checkbox to get `'client'` role
- Other users default to `'readonly'` role
- If email confirmation is enabled in Supabase, users must confirm their email before signing in
- Profile is automatically created with the appropriate role

**Option 2: Admin-Invited Users**
- Go to Supabase Dashboard → Authentication → Users
- Click **"Invite User"** (recommended) or "Add User"
- **Option A - Invite User (Recommended)**:
  - Enter the user's email address
  - Click "Send Invitation"
  - User will receive an email with a link to set their own password
  - No temporary password needed - user sets their own password
- **Option B - Add User**:
  - Enter email address and set a temporary password
  - User must change password on first login or use "Forgot Password" link

**Setting User Roles (for admin-invited users or role changes)**
- After the user logs in for the first time, a profile is auto-created with default `'readonly'` role (or `'client'` if they signed up as KSS x Footasylum client)
- To change the role, go to Supabase Dashboard → Table Editor → `fa_profiles`
- Find the user by their email (or user ID from auth.users)
- Update the `role` field to one of:
  - `'admin'` - Full access (for managers like David Capener)
  - `'ops'` - Read/write access to incidents, investigations, actions
  - `'readonly'` - View-only access (default for new users)
  - `'client'` - Read-only access for KSS x Footasylum client portal (no route planning or activity logs)

#### Password Management

**Users can set/reset their own passwords:**

1. **First-time password setup** (when invited):
   - User receives an email invitation from Supabase
   - Clicks the link in the email
   - Sets their password on the reset password page

2. **Password reset** (forgot password):
   - User clicks "Forgot your password?" on the login page
   - Enters their email address
   - Receives a password reset email
   - Clicks the link and sets a new password

3. **Changing password** (while logged in):
   - Currently requires using Supabase Dashboard or API
   - Future enhancement: Add "Change Password" option in user profile

#### Role Assignment Examples

- **KSS x Footasylum Client**: Set role to `'client'` for read-only access to incidents, actions, and audits
- **KSS Managers**: Set role to `'admin'` for full access (same as David Capener)
- **KSS Operations Staff**: Set role to `'ops'` for incident/action management
- **KSS Read-only Staff**: Leave as `'readonly'` (default)

### Email Confirmation Settings

You can configure whether email confirmation is required for new sign-ups:

1. Go to Supabase Dashboard → Authentication → Settings
2. Under "Auth", find "Enable email confirmations"
3. **If enabled**: Users must confirm their email before they can sign in (more secure)
4. **If disabled**: Users can sign in immediately after creating an account (faster onboarding)

**Note**: The sign-up page handles both scenarios automatically.

## Notes

- All database operations use server actions or route handlers
- Activity logging is automatic via database triggers
- Storage bucket policies must be configured in Supabase Dashboard
- User profiles are auto-created on first login with default 'readonly' role
- Admin and client roles must be manually assigned via database after account creation
- Client role users have restricted access (no route planning or activity logs)


