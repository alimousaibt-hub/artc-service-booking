# ARTC Service Booking — Phase 1 Setup Guide

## What's included in Phase 1

✅ **Authentication**
- Email signup / login
- Microsoft Azure AD OAuth integration
- User approval workflow (super_admin must approve before access)

✅ **User Management**
- Role-based access control (super_admin, admin, crm_agent, advisor)
- Subscription date management
- Admin panel to approve/reject/edit users

✅ **UX**
- Dark / light mode toggle
- Responsive design (mobile, tablet, desktop)
- Protected routes (guests → login page)

✅ **Database**
- 15 tables with Row Level Security (RLS)
- Ready for Phases 2-4

## Setup Steps

### 1. Create Supabase project

1. Go to https://supabase.com
2. Sign up / log in
3. Create a new project
4. Copy your **Project URL** and **Anon Key** to a safe place

### 2. Set up database

In Supabase dashboard:

1. Go to **SQL Editor**
2. Click **New Query**
3. Copy the entire content of `supabase-schema.sql`
4. Paste it into the editor
5. Click **Run**
6. Wait for completion (you'll see green checkmarks)

**Important:** After schema runs, run this second query to promote your account:

```sql
UPDATE public.profiles
SET role = 'super_admin', status = 'active', subscription_expires_at = '2099-12-31'
WHERE email = 'your.actual.email@example.com';
```

Replace `your.actual.email@example.com` with your actual email.

### 3. Set up Microsoft OAuth (optional but recommended)

In Supabase dashboard:

1. Go to **Authentication > Providers**
2. Click **Azure**
3. You'll see a form asking for:
   - **Tenant ID**
   - **Client ID**
   - **Client Secret**

To get these:

1. Go to https://portal.azure.com
2. Search for **App registrations** and click it
3. Click **+ New registration**
4. Name: `ARTC Service Booking`
5. Supported account types: `Accounts in this organizational directory only`
6. Redirect URI: Paste the Supabase redirect URI from the form (it looks like `https://your-project.supabase.co/auth/v1/callback?provider=azure`)
7. Click **Register**
8. On the app page:
   - Copy **Application (client) ID** → paste into Supabase as **Client ID**
   - Copy **Directory (tenant) ID** → paste into Supabase as **Tenant ID**
   - Go to **Certificates & secrets > New client secret**
   - Copy the secret value → paste into Supabase as **Client Secret**
9. In Supabase, click **Save** and **Enable**

**Don't have access to Azure Portal?** That's fine — just use email/password login for now. Microsoft OAuth is optional.

### 4. Clone and set up Next.js locally

```bash
# If you haven't already, go into your Next.js project folder
cd service-booking

# Copy env example to .env.local
cp .env.example .env.local

# Edit .env.local and paste your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 5. Install dependencies

```bash
npm install
```

### 6. Run locally

```bash
npm run dev
```

Visit: http://localhost:3000

You should see the login page.

### 7. Test the flow

1. **Register a new account**
   - Click "Create one" link
   - Fill in name, email, password
   - You'll see "Account created" message
   - Redirects to "Pending approval" page

2. **Approve the account (as super_admin)**
   - Go to http://localhost:3000/auth/login
   - Sign in with YOUR email (the super_admin one you promoted in step 2)
   - Click "Admin Panel" in sidebar
   - You should see your new account in "Pending approval"
   - Click "Approve" button
   - The pending user will now be active

3. **Sign in as the new user**
   - Sign out
   - Log back in with the new account email
   - You should see the dashboard

## Deployment to Vercel

### 1. Push code to GitHub

```bash
git init
git add .
git commit -m "Initial Phase 1 setup"
git remote add origin https://github.com/YOUR_USERNAME/artc-booking.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to https://vercel.com
2. Click **Add new > Project**
3. Connect your GitHub repo
4. Click **Import**
5. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - `NEXT_PUBLIC_SITE_URL` = your Vercel domain (e.g., `https://artc-booking.vercel.app`)
6. Click **Deploy**

Done! Your app is live.

**Update Supabase auth redirects:**

In Supabase > Authentication > URL Configuration:

- Add Redirect URL: `https://your-vercel-domain/auth/callback`
- Add Site URL: `https://your-vercel-domain`

## File structure

```
artc-booking/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login page
│   │   ├── register/page.tsx       # Sign up page
│   │   └── pending/page.tsx        # Approval waiting screen
│   ├── (app)/
│   │   ├── dashboard/page.tsx      # Main dashboard
│   │   └── admin/users/page.tsx    # User management (super_admin only)
│   ├── auth/callback/route.ts      # OAuth callback handler
│   ├── layout.tsx                  # Root layout with theme
│   └── globals.css                 # Tailwind styles
├── components/
│   ├── app-layout.tsx              # Sidebar + navbar
│   └── providers.tsx               # Theme provider
├── lib/
│   └── supabase/
│       ├── client.ts               # Client-side Supabase
│       └── server.ts               # Server-side Supabase
├── types/
│   └── database.ts                 # TypeScript types
├── .env.example                    # Environment template
├── package.json
├── tailwind.config.ts
└── supabase-schema.sql             # Database schema
```

## What to test

Before moving to Phase 2, verify:

- [ ] Can register a new account
- [ ] Account shows as "pending" in admin panel
- [ ] Super admin can approve account
- [ ] Approved user can log in
- [ ] Dark mode toggle works
- [ ] Responsive layout works on mobile
- [ ] Signing out redirects to login
- [ ] Cannot access admin panel unless super_admin

## Common issues

**"NEXT_PUBLIC_SUPABASE_URL is required"**
→ Make sure your `.env.local` file exists and has the right values

**"User not found" after registering**
→ Check Supabase > Auth > Users to see if account was created. If not, check for email validation issues.

**Login redirects to pending forever**
→ Make sure you ran the SQL query to promote your account to super_admin + active status

**Dark mode not working**
→ Try hard refresh (Ctrl+F5 or Cmd+Shift+R)

## Next steps

Phase 2 (next session) will add:
- Branch management
- Service advisor management
- Appointment booking calendar
- Month switcher
- Customer search
- Ghost records for cancelled/rescheduled

Ready? Let me know when you want to start Phase 2!
