# FinFlow — Personal Finance Intelligence

A self-hosted, full-stack expense tracker with AI-powered financial insights. Runs entirely on your local machine. No cloud accounts, no subscriptions, no data leaving your device.

---

## What's Inside

- **Dashboard** — Financial health score, spend overview, category breakdown, AI insights
- **Transactions** — Full-text search, multi-filter, inline edit/delete, CSV/JSON export
- **Analytics** — 12-month trend, category deep-dive, payment method split, daily heatmap
- **Budgets** — Per-category monthly limits with visual burn rate and over-budget alerts
- **AI Advisor** — Chat with your finances. Works with Claude, OpenAI, or a local Ollama model

---

## Quick Start

### Option A — One-command script (macOS/Linux)

```bash
git clone <this-repo>  # or unzip the project folder
cd expense-tracker
chmod +x start.sh
./start.sh
```

Open **http://localhost:5173** in your browser.

### Option B — Windows

```bat
cd expense-tracker
start.bat
```

### Option C — Manual (Python + Node)

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend (new terminal):**
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

### Option D — Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Data persists in `./data/expenses.db`

---

## Project Structure

```
expense-tracker/
├── backend/
│   ├── main.py              # FastAPI app — all routes
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # Overview + health score + charts
│   │   │   ├── Transactions.jsx # CRUD table with filters
│   │   │   ├── Analytics.jsx    # Charts and deep-dive
│   │   │   ├── Budgets.jsx      # Budget vs actual tracker
│   │   │   └── Settings.jsx     # AI config + data import/export
│   │   ├── components/
│   │   │   ├── ExpenseForm.jsx  # Add/edit expense modal
│   │   │   └── AIAdvisor.jsx    # AI chat sidebar
│   │   ├── utils/
│   │   │   ├── api.js           # API client
│   │   │   └── constants.js     # Categories, currencies, helpers
│   │   └── styles/globals.css
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── data/
│   └── expenses.db          # Auto-created SQLite database
├── docker-compose.yml
├── start.sh                 # macOS/Linux launcher
└── start.bat                # Windows launcher
```

---

## AI Advisor Setup

Go to **Settings → AI Financial Advisor** and choose your provider:

### Claude (Anthropic)
1. Get a key at https://console.anthropic.com
2. Paste it into the API Key field
3. Select "Claude (Anthropic)" as provider

### OpenAI
1. Get a key at https://platform.openai.com/api-keys
2. Paste it and select "OpenAI GPT-4o"

### Ollama (100% Local, no API key)
1. Install Ollama: https://ollama.com
2. Run: `ollama pull llama3`
3. Run: `ollama serve`
4. Select "Ollama (Local LLM)" in Settings
5. Set endpoint to `http://localhost:11434` and model to `llama3`

Your financial data is only sent to the AI provider when you actively use the chat. The API key is stored locally in SQLite and never transmitted anywhere else.

---

## Data

- **Database**: `data/expenses.db` (SQLite, auto-created on first run)
- **Export**: Settings → Export CSV or JSON
- **Import**: Settings → Import JSON (restore from backup)
- **Backup**: Copy `data/expenses.db` to keep a full backup

---

## Categories

Food & Dining · Rent & Utilities · Travel & Fuel · Tech & Gadgets · Entertainment · Health & Fitness · Shopping · Subscriptions · Education · Miscellaneous

## Payment Methods

UPI · Credit Card · Debit Card · Cash · Net Banking · Wallet

## Supported Currencies

INR · USD · EUR · GBP · JPY · AED · SGD

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Charts | Chart.js 4 |
| Icons | Lucide React |
| Backend | Python FastAPI |
| Database | SQLite (via Python stdlib) |
| AI | Claude / OpenAI / Ollama (BYOK) |
| Deployment | Docker Compose or native scripts |

---

## Requirements

- Python 3.10+
- Node.js 18+
- (Optional) Docker & Docker Compose
- (Optional) Ollama for local AI
