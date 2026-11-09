# Grade 9 Marks Dashboard

React + Vite + Supabase (free database and login), hosted on Vercel (free).

Features: teacher logins, books/subjects assigned to teachers, marks entry per test, automatic percentages,
highest/lowest highlighting, charts, student profiles, rankings, Excel and PDF exports, result cards.
Only the teacher who created a test can edit or delete it (enforced by database row-level security); everyone else can view.

## 1. Supabase (database and login)
1. Go to https://supabase.com, sign up and create a **New project**. Save the database password.
2. **SQL Editor → New query**: paste the full contents of `supabase/schema.sql` and click **Run**.
3. **Authentication → Users → Add user → Create new user**: enter your email and password, and turn on "Auto Confirm User".
4. In the SQL Editor, make yourself admin:
   ```sql
   update profiles set role = 'admin' where email = 'your-email@example.com';
   ```
5. **Project Settings → API Keys**: copy the **Project URL** (from Connect or Data API) and the **publishable** (or legacy `anon`) key.
   Never use the secret / service_role key in this app.

## 2. Run locally
```
copy .env.example .env      # then put your URL and key in .env
npm install
npm run dev
```
Open http://localhost:5173

## 3. Push to GitHub
```
git init
git add .
git commit -m "Grade 9 dashboard"
git branch -M main
git remote add origin https://github.com/<username>/grade-9-dashboard.git
git push -u origin main
```
`.env` is git-ignored, so your keys are not uploaded.

## 4. Deploy on Vercel
1. Go to https://vercel.com, log in with GitHub, then **Add New → Project** and import the repo.
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. Add **Environment Variables**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Click **Deploy** and share the link with your teachers.

Every `git push` to `main` redeploys automatically.
After deploying, add your Vercel URL in Supabase under **Authentication → URL Configuration → Site URL**.

## 5. Daily use
- Admin → **Books**: add books (Physics, Chemistry, Maths, ...).
- Admin → **Students**: add one by one or paste in bulk.
- New teacher: Supabase → Authentication → Add user, then Admin → **Teachers** to assign books.
- Teacher: Tests → New test → enter marks → Save.
