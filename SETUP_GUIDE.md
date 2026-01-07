# Setup Guide - Tic Tac Toe Reyes

This guide will help you set up and deploy your Dia de Reyes tic-tac-toe state claiming app.

## Step 1: Get Supabase Credentials

1. Go to your Supabase project at https://app.supabase.com
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

## Step 2: Create Local .env File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and paste your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 3: Set Up Supabase Database

1. In your Supabase project, go to the **SQL Editor**
2. Copy and paste the contents of `src/oneoffs/initisupabase.sql`
3. Click **Run** to create the tables and functions

## Step 4: Load the 756 States

1. Get your Supabase **Service Role Key** (Settings → API → Service Role Secret)
2. Run the loading script:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co \
   SUPABASE_SERVICE_KEY=your-service-role-key \
   node src/oneoffs/loaddb-simple.js
   ```

This will generate and upload all 756 canonical tic-tac-toe states.

## Step 5: Test Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000/ascii.html
4. Click "Descubre tu propio estado" to test the claiming flow

## Step 6: Deploy to GitHub Pages

### Option A: From This Repository

1. Push your changes:
   ```bash
   git add .
   git commit -m "Add claiming functionality"
   git push
   ```

2. In GitHub, go to **Settings** → **Secrets and variables** → **Actions**
3. Add two secrets:
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your Anon key

4. Go to **Settings** → **Pages**
5. Set Source to **GitHub Actions**

6. The workflow will automatically deploy on push to main

### Option B: Create New Repository

1. Create a new GitHub repository (e.g., `tic-tac-toe-reyes`)

2. Copy only the essential files:
   ```bash
   mkdir ../tic-tac-toe-reyes
   cp -r ascii.html src/ .github/ package.json vite.config.js .gitignore .env.example ../tic-tac-toe-reyes/
   ```

3. Initialize and push:
   ```bash
   cd ../tic-tac-toe-reyes
   git init
   git add .
   git commit -m "Initial commit - Dia de Reyes claiming app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/tic-tac-toe-reyes.git
   git push -u origin main
   ```

4. Follow the same steps as Option A to add secrets and enable Pages

## Step 7: Share with Friends and Family

Once deployed, your app will be at:
- `https://YOUR_USERNAME.github.io/REPO_NAME/ascii.html`

Share this link with friends and family to claim their unique states!

## Troubleshooting

### States not loading
- Check browser console for errors
- Verify Supabase credentials in .env (local) or GitHub Secrets (deployed)
- Make sure you ran the SQL schema and loaded the states

### RPC function errors
- Re-run the SQL from `initisupabase.sql`
- Check that the policies allow anonymous access

### Build fails on GitHub Actions
- Verify both secrets are set correctly
- Check the Actions tab for detailed error messages

## What's Next?

- Share the link with friends and family
- Watch as states get claimed!
- Check the Supabase dashboard to see who claimed what
