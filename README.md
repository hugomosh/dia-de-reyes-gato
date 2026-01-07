# Setting Up New Repository for GitHub Pages

## Option 1: Create New Repo Manually (Recommended)

### Step 1: Create the new repository on GitHub
1. Go to https://github.com/new
2. Name it something like: `tic-tac-toe-reyes` or `dia-de-reyes-gato`
3. Keep it **public** (required for free GitHub Pages)
4. Don't initialize with README (we'll push existing code)
5. Click "Create repository"

### Step 2: Prepare clean files in a new directory

```bash
# Create new directory
mkdir ../tic-tac-toe-reyes
cd ../tic-tac-toe-reyes

# Copy only the essential files
cp ../tic-tac-toe-states/ascii.html ./index.html
cp -r ../tic-tac-toe-states/src .
cp ../tic-tac-toe-states/package.json .
cp ../tic-tac-toe-states/vite.config.js .
cp ../tic-tac-toe-states/.gitignore .
cp ../tic-tac-toe-states/.env.example .
cp -r ../tic-tac-toe-states/.github .

# Initialize git
git init
git add .
git commit -m "Initial commit - Dia de Reyes tic-tac-toe claiming app"
```

**Note:** We renamed `ascii.html` to `index.html` so it loads at the root URL!

### Step 3: Push to GitHub

```bash
# Replace YOUR_USERNAME and REPO_NAME with your actual values
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 4: Set up GitHub Secrets

1. Go to your new repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these two secrets:
   - Name: `VITE_SUPABASE_URL`
     Value: Your Supabase URL
   - Name: `VITE_SUPABASE_ANON_KEY`
     Value: Your Supabase anon key

### Step 5: Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under "Source", select **GitHub Actions**
3. Push any change to trigger deployment:
   ```bash
   git commit --allow-empty -m "Trigger deployment"
   git push
   ```

### Step 6: Access Your App

Your app will be live at:
```
https://YOUR_USERNAME.github.io/REPO_NAME/
```

The `index.html` will load automatically!

---

## Option 2: Use a Script (Automated)

I can create a script that does all of this for you. Just let me know:
- Your GitHub username
- What you want to name the repo

And I'll generate a script that automates the whole process!
