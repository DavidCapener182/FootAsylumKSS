# KSS x Footasylum Audit & Fire Safety Platform (KSS Internal)

A standalone internal web application for KSS NW (KSS x Footasylum's security/assurance partner). The system serves as a single source of truth for audits, fire risk assessments, action tracking, store compliance visits, and compliance reporting.

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
- `fa_incidents` - Legacy incident records
- `fa_investigations` - Legacy investigation details
- `fa_actions` - Action items
- `fa_attachments` - File attachments
- `fa_activity_log` - Audit trail

### Row Level Security (RLS)

RLS is enabled on all tables with role-based access:
- **Admin**: Full access (read/write all, manage users/stores)
- **Ops**: Read/write audit, fire risk assessment, action, and compliance visit workflows. Cannot manage users
- **Readonly**: View only (internal KSS users)
- **Client**: Read-only access to actions, audits, fire risk assessments, reports, and stores. No access to route planning or activity logs (KSS x Footasylum client portal)

## Features

- **Compliance Audits**: Track store audit progress, second-audit requirements, and completion status
- **Fire Risk Assessments**: Manage FRA status, due dates, uploads, and reports
- **Actions**: Assign and track audit/FRA action items with overdue detection
- **Attachments**: Upload and manage file attachments
- **Dashboard**: KPIs, attention cards, regional compliance, and activity feed with summary generation
- **Reports**: Compliance reporting and exports
- **Print View**: Printable audit and FRA reports
- **Audit Trail**: Complete activity logging for all changes

## Project Structure

```
/app
  /(auth)          - Authentication pages
  /(protected)     - Protected routes
    /dashboard     - Dashboard with KPIs
    /incidents     - Legacy incident records
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

**Public sign up is disabled.** All user accounts must be invited by an authorised platform administrator.

#### Creating New Users

- Open **Admin → User Management** in the platform.
- Enter the user's work email and select the approved initial role.
- The server creates the protected profile and sends an invitation link.
- The user follows that link to set their password.
- If profile provisioning fails, the administrator must retry setup before the user signs in.

**Setting user roles**
- Use **Admin → User Management** for invitations and role changes.
- Assign one of the approved roles:
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

- **KSS x Footasylum Client**: Set role to `'client'` for read-only access to actions, audits, fire risk assessments, reports, and stores
- **KSS Managers**: Set role to `'admin'` for full access (same as David Capener)
- **KSS Operations Staff**: Set role to `'ops'` for audit, FRA, action, and route-planning management
- **KSS Read-only Staff**: Leave as `'readonly'` (default)

### Invitation Delivery Settings

Supabase Auth must remain configured so that public email sign-ups are disabled. Administrators
send first-time access links through **Admin → User Management**; users cannot choose their own
role or create an application profile from the public login routes.

## FRA report printing and exports

Fire Risk Assessments (FRA) support A4 print, PDF download, and DOCX download.

- **Print**: FRA is designed to be printed from the standalone `/print/fra-report` page (or after “Print preview”). The scroll container on the main view page is expanded in `@media print` so printing from the view page still includes all content; for best results, use “Print preview”, which uses the print-document body class and A4 section layout.
- **PDF**: Generated server-side via Puppeteer loading `/print/fra-report` with print media and exporting to PDF; margins and page size match A4 and `@page` (15mm).
- **DOCX**: Generated server-side from the same FRA structured data (`mapHSAuditToFRAData`) using the `docx` library; page breaks are inserted between major sections; filename format is timestamped `FRA-{StoreName}-{ISO}.docx`.

Download filenames follow: `FRA - (Store Name) (DD-MMM-YYYY).pdf` or `FRA-{StoreName}-{timestamp}.docx`.

### Verifying DOCX in DevTools

To confirm the DOCX download is correctly generated and served (no stale cache, no HTML error page):

1. Open DevTools → Network tab, trigger "Download DOCX"
2. **Content-Type**: Response header should be `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
3. **Response**: Binary; first bytes should be `PK` (ZIP/DOCX magic)
4. **Size**: Response body > 10 KB (HTML error pages are typically smaller)
5. **Content-Disposition**: Header includes `attachment; filename="FRA-...-...docx"`; filename changes each download (timestamp)
6. **Build stamp**: Open the DOCX in Microsoft Word and scroll to the end; the document includes a final line `Generated: {ISO} | Instance: {id} | Build: {hash}` that updates on each generation

## Notes

- All database operations use server actions or route handlers
- Activity logging is automatic via database triggers
- Storage bucket policies must be configured in Supabase Dashboard
- User profiles are provisioned by an administrator before protected access is granted
- Roles are assigned from trusted server input when an administrator invites or updates a user
- Client role users have restricted access (no route planning or activity logs)
