# ARTC Service Centre Booking System

A modern SaaS appointment booking system for service centres, built with Next.js, Supabase, and Tailwind CSS.

## Status

**Phase 1 (Foundation)** — ✅ Complete
- Authentication (email + Microsoft OAuth)
- User approval workflow
- Role-based access control
- Dark/light mode
- Admin user management panel

**Phase 2-4** — Coming in future sessions

## Quick Start

```bash
# 1. Set up Supabase (see PHASE1_SETUP.md)
# 2. Install dependencies
npm install

# 3. Create .env.local (copy from .env.example)
cp .env.example .env.local

# 4. Fill in Supabase credentials in .env.local
# 5. Run development server
npm run dev

# 6. Visit http://localhost:3000
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Supabase (Postgres + Auth)
- **Hosting**: Vercel
- **Language**: TypeScript
- **Theme**: next-themes (dark/light mode)

## Documentation

- **[PHASE1_SETUP.md](./PHASE1_SETUP.md)** — Complete setup guide
- **[PHASE1_COMPLETE.md](./PHASE1_COMPLETE.md)** — What's included, Phase 2 handoff
- **[supabase-schema.sql](./supabase-schema.sql)** — Database schema

## Features

### Phase 1 ✅
- Email & password authentication
- Microsoft Azure AD OAuth login
- User registration with approval workflow
- Super admin panel to approve/reject users
- Role management (super_admin, admin, crm_agent, advisor)
- Subscription date management
- Dark and light mode
- Fully responsive design
- Row-level security on all database tables

### Phase 2 (Next session)
- Branch management
- Service advisor management
- Appointment booking calendar
- Create/edit appointments
- Customer search
- Ghost records for cancelled/rescheduled

### Phase 3 (Future)
- Notifications (bell icon)
- Advisor confirmation/completion workflow
- No-show tracking
- Cross-month rescheduling
- Creator notifications
- WhatsApp confirmations (Twixor integration)

### Phase 4 (Final)
- Analytics dashboard
- Excel export
- Subscription model
- Capacity overrides
- SharePoint integration

## Project Structure

```
app/              # Next.js app directory
  (auth)/         # Authentication pages
  (app)/          # Protected application pages
    admin/        # Admin panel
    dashboard/    # User dashboard
components/       # Reusable React components
lib/              # Utility functions & Supabase clients
types/            # TypeScript type definitions
```

## Roles

- **Super Admin**: Full system access, user approval, all settings
- **Admin**: Branch/advisor management, analytics, exports
- **CRM Agent**: Create/edit appointments, customer search
- **Advisor**: View and confirm own appointments, mark no-shows

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<your-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000 (or your Vercel domain)
```

## Deployment

Deploy to Vercel with one click — see **PHASE1_SETUP.md** for instructions.

## Database

Supabase Postgres with 15 tables and row-level security:

- `profiles` — Users with roles and subscription dates
- `branches` — Service centre locations
- `service_advisors` — Staff members
- `appointments` — Bookings
- `appointment_edits` — Audit trail
- `no_shows` — No-show tracking
- `notifications` — Real-time alerts
- Plus support tables for holidays, capacity overrides, etc.

## Testing Users

After setting up:

1. **Register a new account** at `/auth/register`
2. **Go to admin panel** at `/admin/users` (as super_admin)
3. **Approve the account** — assign role and subscription dates
4. **Sign in** with the approved account

## Support

For issues or questions, see **PHASE1_SETUP.md** troubleshooting section.

---

Built with care. Ready for production. Made for growth.
