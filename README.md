# Registration System with Supabase

A production-ready registration system using Supabase (PostgreSQL + Auth) with vanilla HTML/CSS/JavaScript.

## Features

- Email OTP verification (Supabase Auth)
- Full name validation (English letters only, 3-50 characters)
- Duplicate prevention (case-insensitive)
- Row Level Security (RLS) enabled
- Admin CSV export
- Mobile responsive

## Project Structure

```
FormForm/
├── public/
│   ├── index.html          # Main registration page
│   ├── style.css           # Styles
│   ├── app.js              # Frontend logic
│   └── admin.html          # Admin export page
├── supabase/
│   └── migrations/
│       └── 20260217_create_registrations.sql
└── README.md
```

## Setup Instructions

### 1. Install Supabase CLI

```powershell
# Using npm
npm install -g supabase

# Or using Scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2. Create Supabase Account & Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new account (free tier available)
3. Create a new project
4. Wait for database provisioning (~2 minutes)

### 3. Initialize Supabase in Project

```powershell
cd d:\mounir\FormForm

# Initialize Supabase (if not already done)
supabase init

# Login to Supabase
supabase login

# Link to your project (get project ref from dashboard URL)
# Dashboard URL: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Run Database Migration

```powershell
# Push migrations to your Supabase database
supabase db push
```

This creates:
- `registrations` table
- Unique indexes for email and full_name (case-insensitive)
- RLS policies for authenticated users

### 5. Configure Frontend

Get your API keys from Supabase Dashboard:
**Settings > API**

Edit `public/app.js` and `public/admin.html`:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbG...'; // anon/public key
```

### 6. Configure Email Templates (Optional)

Go to **Authentication > Email Templates** in Supabase Dashboard.

Customize the OTP email template:
```html
<h2>Your Verification Code</h2>
<p>Enter this code to complete your registration:</p>
<h1>{{ .Token }}</h1>
<p>This code expires in 1 hour.</p>
```

### 7. Run with Live Server

#### Option A: VS Code Live Server Extension

1. Install "Live Server" extension in VS Code
2. Right-click `public/index.html`
3. Select "Open with Live Server"

#### Option B: Using npx

```powershell
cd public
npx serve
```

#### Option C: Using Python

```powershell
cd public
python -m http.server 5500
```

Then open: `http://localhost:5500`

## Admin CSV Export

1. Open `http://localhost:5500/admin.html`
2. Get your **Service Role Key** from Supabase Dashboard:
   **Settings > API > service_role (secret)**
3. Enter the key and click "Connect"
4. Click "Export CSV" to download all registrations

⚠️ **Security Warning**: Never expose the service role key publicly.

## Database Schema

```sql
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Case-insensitive unique constraints
CREATE UNIQUE INDEX idx_registrations_email_lower ON registrations (lower(email));
CREATE UNIQUE INDEX idx_registrations_full_name_lower ON registrations (lower(full_name));
```

## RLS Policies

| Policy | Action | Who | Condition |
|--------|--------|-----|-----------|
| Allow authenticated users to insert | INSERT | authenticated | Email matches JWT |
| Allow authenticated users to read own | SELECT | authenticated | Email matches JWT |

## Validation Rules

| Field | Rule |
|-------|------|
| Email | Valid email format, verified via OTP |
| Full Name | `^[A-Za-z ]{3,50}$` - English letters only |

## Error Handling

The app handles:
- Duplicate email registration
- Duplicate name registration
- Invalid OTP codes
- Expired OTP codes
- Rate limiting
- Session expiration

## Environment

- Expected users: ~200 max
- Supabase free tier is sufficient
- No backend server required

## Troubleshooting

### OTP email not received
1. Check spam folder
2. Verify SMTP settings in Supabase Dashboard
3. Check rate limits (Supabase limits OTP emails)

### Duplicate error when registering
- Email or name already exists (case-insensitive)
- User will see a clear error message

### RLS policy errors
- Ensure user is authenticated
- Check that email in request matches session email

## Security Checklist

- [x] RLS enabled on registrations table
- [x] Only authenticated users can insert
- [x] Users can only insert their own email
- [x] Unique constraints prevent duplicates
- [x] Email verified via OTP before form access
- [x] Service role key used only for admin export
- [x] Anon key safe to expose (limited by RLS)

## License

MIT
