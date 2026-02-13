# CardSense — What You Need to Do Next

Follow these steps to get CardSense live. The app is already set up for Vercel (one project = frontend + API, no domain or CORS config needed).

---

## 1. Get a Gemini API key

- Go to [Google AI Studio](https://aistudio.google.com/apikey).
- Create an API key (free tier is enough to start).
- Keep it private; you’ll add it only in Vercel’s environment variables.

---

## 2. Push the project to GitHub

- Create a new repo on GitHub (e.g. `cardsense`).
- In your project folder, run:

```bash
git init
git add .
git commit -m "Launch ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

(Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name.)

---

## 3. Deploy on Vercel

- Go to [vercel.com](https://vercel.com) and sign in (GitHub is easiest).
- Click **Add New… → Project** and **import** your GitHub repo.
- Leave **Build Command** and **Output Directory** as in the repo (`npm run build`, `dist`).
- Before deploying, open **Environment Variables** and add:

  | Name            | Value              | Environment   |
  |-----------------|--------------------|---------------|
  | `GEMINI_API_KEY` | your Gemini key    | Production (and Preview if you want) |

- Click **Deploy**.

---

## 4. Test the live app

- When the deploy finishes, open the URL Vercel gives you (e.g. `https://cardsense-xxx.vercel.app`).
- Try **Quick Estimate**: enter some monthly amounts and click **Generate Optimization**. You should see results.
- Try **Direct Analysis**: upload a small CSV or `.txt` with transaction-like text. You should see “Calculating Reward Delta” then results (or a clear error if the file isn’t valid).

If anything fails, check the **Vercel → Project → Logs** (and **Functions** for `/api/analyze` errors).

---

## 5. (Optional) Add a custom domain

- In Vercel: **Project → Settings → Domains**.
- Add your domain and follow the DNS instructions. No code changes are required.

---

## Local development (reminder)

- Create a `.env` in the project root with:
  ```bash
  GEMINI_API_KEY=your_key_here
  ```
- Run:
  ```bash
  npm install
  npm run dev
  ```
- Open [http://localhost:5173](http://localhost:5173). The app will use the Express server on port 3001 for analysis.

---

That’s it. After step 4, CardSense is launched. Add a custom domain when you’re ready.
