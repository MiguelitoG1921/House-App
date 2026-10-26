# Project rules

## Who you're working with
The person you're talking to is a beginner who has never coded before.
- Explain what you're about to do in plain English before doing it. No jargon without a one-line definition.
- After each change, tell them exactly what to look at in the browser to confirm it worked.
- Keep changes small. One feature at a time. Ask before starting anything that touches more than a few files.
- If their request is vague, ask one clarifying question about what the user sees, not about code.
- Never make them feel dumb. If they ask the same thing twice, answer it twice.

## Git handholding
- When a feature works, suggest saving it: "Want me to make a save point (commit) for this?"
- Run git commands for them, and say in one line what each one does (e.g. "git push: uploading your save to GitHub").
- Before starting a new feature, check that there are no unsaved changes, and offer to commit first.
- Run git pull at the start of each session and explain why.
- If anything goes wrong with git, stop and explain the situation in plain words before fixing it. Never force-push or delete history.

## Stack (do not change)
- Next.js + React + TypeScript for both frontend and backend (API routes and server actions).
- Better Auth for login. Use its built-in methods; never write custom auth logic.
- Supabase (Postgres) for the database, accessed with Drizzle over the transaction pooler (port 6543, prepare: false). All database access happens in server code, never from the browser. Do not use the Supabase JS client.
- Run migrations over the session pooler (port 5432), never the transaction pooler.
- Vercel for hosting.
- Do not add new packages without asking and explaining what the package does.

## Database migrations (codebase first)
The TypeScript Drizzle schema is the single source of truth for the database. Drizzle generates SQL migration files from it, and those files are applied to the database.
- To change the database, edit the Drizzle schema file in the code. Never change tables by hand in the Supabase dashboard or with raw SQL.
- After a schema change, run `npx drizzle-kit generate` to create a new SQL migration file in the `drizzle/` folder. Explain in plain words what the generated SQL will do before applying it.
- Apply migrations with `npx drizzle-kit migrate`, connected through the session pooler (port 5432, `DATABASE_URL_SESSION`).
- Never use `drizzle-kit push`. It changes the database without leaving a migration file behind.
- If `drizzle-kit generate` asks whether something was renamed or is new, stop and ask the user. A wrong answer can delete a column and its data.
- If a migration would drop or rename a table or column, or delete data, explain that and ask before generating or applying it.
- Commit the schema change and its migration file together in the same save point.
- Never edit or delete a migration file that has already been applied. Fix mistakes with a new migration instead.

## Safety rules
- Every server action and API route gets the session from Better Auth first, and only returns or changes that user's data.
- Never put secrets or API keys in code. They go in .env.local, which is never committed.
- The database URLs are only ever used in server code, never in a page or component that runs in the browser.
- Never delete data, tables, or files without asking first.

## When things break
- Read the full error before changing anything.
- Explain what went wrong in one plain sentence, then fix it.
- If a fix fails twice, stop and suggest undoing back to the last save point.
