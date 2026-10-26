# Greenhouse Cooperative Groceries

Shared grocery list and household price book built with Next.js and Postgres.

## Shared data across devices

Household sync uses a hosted Postgres database and a shared household access code. The database table is created automatically on first use. Members exchange the access code for a secure, HTTP-only browser session cookie.

The connected Supabase project already has a dedicated `public.greenhouse_household_state` table. Row-level security is enabled, and the `anon` and `authenticated` roles have no table access. The Next.js server connects with the database connection string.

To enable sync for this app:

1. In the Supabase dashboard, open the connected project and select **Connect → Transaction pooler**. Use that URI for `DATABASE_URL` (the project is in `us-east-1`). The password is the database password configured for the project; if it is unknown, set a new one in Supabase and update any other services that use it.
2. Set these server environment variables in `.env.local` and on the deployed app:
   - `DATABASE_URL`: the hosted Postgres connection URL.
   - `HOUSEHOLD_ACCESS_CODE`: a private code the cooperative members can share.
   - `HOUSEHOLD_SESSION_SECRET`: a random secret at least 32 characters long. Generate one with `openssl rand -base64 32`.
3. Add the variables to the app host’s server environment (for Vercel: Project → Settings → Environment Variables), then restart or redeploy. This workspace does not currently have a Supabase database password or deployment environment configured.
4. The first member to connect initializes shared data from that browser’s saved data. Connect first from the device with the most up-to-date list; later devices load the shared copy.
5. On each device, open the same deployed site and enter the household access code once. Changes sync automatically, with other devices refreshing within about five seconds.

The access code gives all members the same shared access; it does not provide individual accounts or identify who made each edit. Until the server variables are configured, the app marks data as saved on the current device only.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in real database and household secrets
npm run dev
```

Open http://localhost:3000.

Never commit `.env.local`. On Vercel, add the same variables under Project → Settings → Environment Variables.
