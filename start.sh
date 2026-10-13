#!/bin/bash
set -e

echo ""
echo "  FinFlow — Personal Finance Intelligence"
echo "  ─────────────────────────────────────────"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "❌ Python 3 is required. Install from https://python.org"
  exit 1
fi

# Check Node
if ! command -v node &>/dev/null; then
  echo "❌ Node.js is required. Install from https://nodejs.org"
  exit 1
fi

# Setup backend
echo "📦 Setting up backend..."
cd backend
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
pip install -q -r requirements.txt
cd ..

# Setup frontend
echo "📦 Setting up frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
  npm install --silent
fi
cd ..

# Create data directory
mkdir -p data

echo ""
echo "✅ Setup complete. Starting servers..."
echo ""
echo "  Backend  → http://localhost:8000"
echo "  Frontend → http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo ""

# Start backend
(cd backend && source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null && uvicorn main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

# Wait for backend
sleep 2

# Start frontend
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Trap Ctrl+C
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

wait
