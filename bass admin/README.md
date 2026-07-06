# BASS Admin — Deployment Guide

The team hub for Bhangra All Stars Sydney: content tasks, calendar, money owed, and team logins.

Follow these four parts in order. Total time: roughly 30–45 minutes. Everything except the GoDaddy domain is free.

---

## Part 1 — Set up the database (Supabase, free)

This is where tasks, money entries, and team members get saved so everyone sees the same data.

1. Go to https://supabase.com and sign up (free).
2. Click **New project**. Name it `bass-admin`, set any database password (save it somewhere), choose the Sydney region, and create it.
3. Once it loads, open the **SQL Editor** (left sidebar) and run this:

```sql
create table bass_store (
  key text primary key,
  value jsonb
);

alter table bass_store enable row level security;

create policy "public read" on bass_store for select using (true);
create policy "public insert" on bass_store for insert with check (true);
create policy "public update" on bass_store for update using (true);
```

4. Go to **Project Settings → API** and copy two things:
   - **Project URL** (looks like `https://abcdefg.supabase.co`)
   - **anon public** key (a long string)

You'll paste these into Vercel in Part 3.

---

## Part 2 — Put the code on GitHub

Vercel deploys straight from GitHub, and future updates become as easy as uploading new files.

1. Sign up at https://github.com (free).
2. Click **New repository**, name it `bass-admin`, keep it **Private**, and create it.
3. On the repo page, click **uploading an existing file** and drag in everything from this folder **except** `node_modules` and `dist` (if they exist). Make sure `src`, `public`, `index.html`, `package.json`, and `vite.config.js` all go up, keeping the folder structure.
4. Commit the upload.

---

## Part 3 — Host it (Vercel, free)

1. Sign up at https://vercel.com — choose **Continue with GitHub**.
2. Click **Add New → Project** and import your `bass-admin` repo.
3. Vercel auto-detects Vite. Before deploying, expand **Environment Variables** and add:
   - `VITE_SUPABASE_URL` → your Project URL from Part 1
   - `VITE_SUPABASE_ANON_KEY` → your anon public key from Part 1
4. Click **Deploy**. In about a minute you'll get a live URL like `bass-admin.vercel.app`.
5. Open it and log in as `Rijul` / `Ahluwalia` to test. Add a task, refresh the page — if it's still there, the database is wired up.

---

## Part 4 — Connect your GoDaddy domain

1. Buy just the domain on GoDaddy (skip their hosting/website builder upsells).
2. In Vercel: your project → **Settings → Domains** → add your domain (e.g. `bassadmin.com.au`).
3. Vercel shows you DNS records to add. In GoDaddy: **My Products → your domain → DNS**, then:
   - Edit the **A record** with name `@` to point to the IP Vercel shows (usually `76.76.21.21`).
   - Add/edit a **CNAME** record with name `www` pointing to `cname.vercel-dns.com`.
4. Wait 10–60 minutes for DNS to update. Vercel automatically adds free HTTPS.

Done — your site is live on your own domain.

---

## Updating the site later

Edit files in the GitHub repo (or re-upload changed ones). Vercel redeploys automatically within a minute of every commit.

## Running it locally (optional)

```bash
npm install
cp .env.example .env   # then fill in your Supabase details
npm run dev
```

Without a `.env`, it falls back to saving in the browser only (fine for testing, but data won't be shared).

## A note on security

The first-name/last-name login keeps casual visitors out but isn't real security — treat this as a team noticeboard, not a vault. Don't store anything sensitive (bank details, addresses, passwords). If you outgrow this, the upgrade path is Supabase Auth with real passwords.
