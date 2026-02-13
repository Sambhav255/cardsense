# CardSense

CardSense analyzes your recent spending and recommends a portfolio of credit cards to maximize your net annual rewards. Upload a CSV or text export of your transactions; the app summarizes your spend by category and ranks cards by estimated value.

## Features

- **Privacy-first:** Your statement is sent only to the AI API for analysis; no server storage.
- **Bias-free:** Recommendations are based on your actual spending and card multipliers, not affiliate deals.
- **Simple flow:** Upload → AI categorizes spend → See ranked cards with net annual value.
- **Modern UI:** Clean, minimalistic fintech design with smooth animations.
- **Comprehensive error handling:** User-friendly error messages and validation.

## Tech stack

- React 19 + Vite 7
- Node.js + Express backend
- Tailwind CSS 4 with PostCSS
- Lucide React (icons)
- [Google Gemini](https://ai.google.dev/) via `@google/genai`

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API key

Copy the example env file and add your [Gemini API key](https://aistudio.google.com/apikey):

```bash
cp .env.example .env
```

Edit `.env` and set:

```
GEMINI_API_KEY=your_key_here
```

The frontend calls the backend at `http://localhost:3001` by default; no frontend env vars are needed for local dev.

### 3. Run development servers

```bash
npm run dev
```

This starts both the frontend (Vite) and backend (Express) servers simultaneously.

Open [http://localhost:5173](http://localhost:5173) for the frontend.
The backend runs on [http://localhost:3001](http://localhost:3001).

## Production Deployment

### Deploy on Vercel (recommended — no domain needed)

The repo is set up so **frontend and API run on the same Vercel project**. You don’t need to set a domain or CORS.

1. Push the project to GitHub and [import it in Vercel](https://vercel.com/new).
2. In the Vercel project **Settings → Environment Variables**, add:
   - **Name:** `GEMINI_API_KEY`  
   - **Value:** your [Gemini API key](https://aistudio.google.com/apikey)
3. Deploy. Vercel will build the Vite app and deploy the `api/analyze.js` serverless function. Your app will be live at `https://your-project.vercel.app` (or your custom domain if you add one later).

No `VITE_API_URL` is needed: in production the app calls `/api/analyze` on the same host.

### Other setups (separate backend)

If you run the **Express backend** (`server.js`) elsewhere (e.g. Railway, Render):

1. Deploy `server.js`, set `GEMINI_API_KEY` and CORS for your frontend origin.
2. Build the frontend with `VITE_API_URL=https://your-backend-url.com`, then deploy the `dist/` folder to Vercel/Netlify/etc.

## Usage

1. Export recent transactions from your bank or card issuer as **CSV** or **plain text**.
2. Click **Choose File** and select the file (max 2 MB).
3. The app validates the file and sends it to Gemini for spend categorization.
4. Cards are scored by rewards minus annual fee; you see a ranked list with potential annual value.

## File Requirements

- **Formats:** CSV (.csv) and plain text (.txt) files
- **Size:** Maximum 2MB
- **Content:** Transaction data with dates, descriptions, and amounts
- **Categories:** AI analyzes for dining, grocery, travel, rent, and other spending

## Card Data

### Local Card Database

**`src/Data/cards.json`** contains the default card definitions. Each card includes:

```json
{
  "name": "Example Card",
  "issuer": "Bank Name",
  "annualFee": 95,
  "pointValue": 0.0125,
  "multipliers": {
    "dining": 3,
    "grocery": 2,
    "travel": 2,
    "rent": 1,
    "other": 1
  }
}
```

### Adding More Cards

1. Edit `src/Data/cards.json` to add cards
2. Use bank websites, NerdWallet, or other sources for accurate data
3. Ensure categories match AI output: `dining`, `grocery`, `travel`, `rent`, `other`

### AwardWallet Integration (Optional)

To merge AwardWallet card data:

1. Get API credentials from [AwardWallet](https://awardwallet.com/contact?API)
2. Add to `.env.local`:
   ```
   VITE_AWARDWALLET_AUTH=YourUserName:YourPassword
   ```
3. Cards from AwardWallet merge with local data (local cards take precedence)

**Note:** AwardWallet doesn't provide annual fees; API-sourced cards show $0 fees.

## Troubleshooting

### Common Issues

**API Key Problems:**
- Ensure `GEMINI_API_KEY` is set for backend
- Check key has access to Gemini models
- Regenerate key if quota exceeded

**Connection Issues:**
- Backend must run on port 3001 (or configured PORT)
- Check CORS settings for your domain
- Verify firewall isn't blocking requests

**File Upload Issues:**
- Only CSV and TXT files supported
- Max file size: 2MB
- Ensure file contains transaction data

**Analysis Errors:**
- Check server logs for detailed error messages
- Verify Gemini API quota and model availability
- Try smaller files if getting timeouts

### Error Codes

- `network`: Can't connect to analysis service
- `quota_exceeded`: API quota limit reached
- `validation_error`: File validation failed
- `invalid_api_key`: API key configuration error
- `model_unavailable`: AI service temporarily down
- `server_error`: Internal server error

## Development

### Project Structure

```
src/
├── App.jsx              # Main React component
├── utils/
│   └── aiHandler.js     # API client and validation
├── data/
│   ├── cards.json       # Card database
│   └── cardLoader.js    # Optional card loading (e.g. AwardWallet)
├── index.css            # Global styles
└── main.jsx             # React entry point
```

### Available Scripts

- `npm run dev` - Start development servers
- `npm run server` - Start backend only
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Variables

See `.env.example` for all available environment variables.

## Security Notes

- **Production:** Always use backend proxy for API calls
- **API Keys:** Never commit real API keys to version control
- **CORS:** Configure proper origins for your domain
- **File Upload:** Validate all file uploads on both client and server

## Limitations

- **File Types:** CSV and plain text only (no PDF support)
- **Geography:** Optimized for US credit cards and spending categories
- **Accuracy:** Depends on quality of card data and AI analysis
- **Real-time:** Not a financial advisor - for educational use only

## License

Private / unlicensed unless otherwise stated.

---

**Disclaimer:** CardSense provides educational insights and is not financial advice. Always consult with a financial professional before making credit card decisions.
