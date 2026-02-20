# ArctiCalls — Setup Guide

## Prerequisites
- Node.js 18+ (check: `node -v`)
- Supabase account — https://supabase.com
- Twilio account — https://twilio.com
- Netlify account — https://netlify.com
- GitHub repo: https://github.com/EwanM-84/ArctiCalls

---

## 1. Supabase

1. Go to your Supabase project → **SQL Editor**
2. Paste the contents of `supabase/schema.sql` and click **Run**
3. Note your **Project URL** and **anon public key** (Settings → API)

---

## 2. Twilio

### 2a. API Key (for secure token generation)
1. Twilio Console → Account → **API Keys & Tokens** → **Create API Key**
2. Choose **Standard** type
3. Save the **SID** (`SK…`) and **Secret** — the secret is only shown once

### 2b. TwiML App (routes outbound calls)
1. Twilio Console → Voice → **TwiML Apps** → **Create new TwiML App**
2. Name: `ArctiCalls`
3. **Voice Request URL**: `https://YOUR-NETLIFY-SITE.netlify.app/.netlify/functions/twiml`
4. Method: `HTTP POST`
5. Save and copy the **TwiML App SID** (`AP…`)

### 2c. Phone Number
- Ensure you have a Twilio number with **Voice** capability
- Use E.164 format, e.g. `+447426799830`

---

## 3. Netlify Deployment

1. Push this repo to GitHub (see step 5)
2. Netlify → **Add new site** → **Import from GitHub** → select `ArctiCalls`
3. Build settings are auto-detected from `netlify.toml`
4. After the first deploy, go to **Site Settings → Environment Variables** and add:

### Server-side (Netlify functions — never exposed to browser):
| Key | Value |
|-----|-------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID (starts with `AC…`) |
| `TWILIO_API_KEY_SID` | `SK…` (from step 2a) |
| `TWILIO_API_KEY_SECRET` | Secret from step 2a |
| `TWILIO_TWIML_APP_SID` | `AP…` (from step 2b) |
| `TWILIO_PHONE_NUMBER` | `+447426799830` |
| `SITE_URL` | `https://YOUR-SITE.netlify.app` |

### Frontend (baked at build time — safe to expose):
| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://lsmobpdykxqfvcdbdzfv.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

5. Trigger a **redeploy** after setting env vars
6. Update your TwiML App's Voice URL with the real Netlify domain

---

## 4. Local Development

```bash
# Install dependencies
npm install

# Copy env example
cp .env.example .env.local
# Then fill in .env.local with real values

# Option A: Vite only (UI works, but /.netlify/functions/token won't respond)
npm run dev

# Option B: Full local dev with Netlify Functions
npm install -g netlify-cli
netlify dev
# Visit http://localhost:8888
```

> **Note**: Microphone access is required for calling. Allow it when the browser prompts.

---

## 5. GitHub + Git

```bash
cd "C:/Users/ewanm/OneDrive/Desktop/ArctiCalls"
git init
git remote add origin https://github.com/EwanM-84/ArctiCalls.git
git add .
git commit -m "Initial commit — ArctiCalls v1"
git branch -M main
git push -u origin main
```

---

## Architecture Notes

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18, Tailwind CSS, `@twilio/voice-sdk` |
| Auth | Supabase Auth (email/password) |
| Database | Supabase Postgres + Row Level Security |
| Calling | Twilio Voice (WebRTC in browser) |
| Token API | Netlify serverless function (`/netlify/functions/token.js`) |
| TwiML | Netlify serverless function (`/netlify/functions/twiml.js`) |

- All call audio is routed peer-to-peer via Twilio's WebRTC infrastructure
- No user data is stored on Twilio (only the call connection is routed there)
- Contacts and call history are stored in Supabase, scoped per authenticated user via RLS
- v1 is outbound-only; incoming call support is deferred to v2
