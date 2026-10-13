from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import json
import csv
import io
import httpx
from datetime import datetime, date
import os

app = FastAPI(title="Expense Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "expenses.db")

# ── Hardcoded SambaNova / OpenAI-compatible cloud key ──────────────────────
CLOUD_AI_BASE = "https://api.sambanova.ai/v1"
CLOUD_AI_KEY  = "f2875895fce843c68c55a59c02317cb2.hfvc9Ea5NkgEV3xGl7nh-Dmt"
CLOUD_AI_MODEL = "Meta-Llama-3.1-8B-Instruct"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'INR',
            category TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            notes TEXT,
            tags TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT UNIQUE NOT NULL,
            monthly_limit REAL NOT NULL,
            month TEXT NOT NULL
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)
    c.executemany(
        "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
        [
            ("default_currency", "INR"),
            ("ai_provider", "cloud"),
            ("ai_api_key", CLOUD_AI_KEY),
            ("ollama_endpoint", "http://localhost:11434"),
            ("theme", "dark"),
        ]
    )
    conn.commit()
    conn.close()

init_db()


class Expense(BaseModel):
    date: str
    title: str
    amount: float
    currency: str = "INR"
    category: str
    payment_method: str
    notes: Optional[str] = None
    tags: Optional[str] = None

class Budget(BaseModel):
    category: str
    monthly_limit: float
    month: str

class AIQuery(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = []


# ─── Expenses ────────────────────────────────────────────────────────────────

@app.get("/api/expenses")
def list_expenses(
    search: Optional[str] = None,
    category: Optional[str] = None,
    payment_method: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: Optional[str] = "date",
    sort_order: Optional[str] = "desc",
    limit: int = 500,
    offset: int = 0,
):
    conn = get_db()
    c = conn.cursor()
    query = "SELECT * FROM expenses WHERE 1=1"
    params = []
    if search:
        query += " AND (title LIKE ? OR notes LIKE ? OR tags LIKE ?)"
        params += [f"%{search}%", f"%{search}%", f"%{search}%"]
    if category:
        query += " AND category = ?"
        params.append(category)
    if payment_method:
        query += " AND payment_method = ?"
        params.append(payment_method)
    if date_from:
        query += " AND date >= ?"
        params.append(date_from)
    if date_to:
        query += " AND date <= ?"
        params.append(date_to)
    col = sort_by if sort_by in ("date", "amount", "title", "category") else "date"
    direction = "DESC" if sort_order == "desc" else "ASC"
    query += f" ORDER BY {col} {direction} LIMIT ? OFFSET ?"
    params += [limit, offset]
    rows = c.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/expenses", status_code=201)
def create_expense(expense: Expense):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        """INSERT INTO expenses (date, title, amount, currency, category, payment_method, notes, tags)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (expense.date, expense.title, expense.amount, expense.currency,
         expense.category, expense.payment_method, expense.notes, expense.tags),
    )
    conn.commit()
    row_id = c.lastrowid
    row = c.execute("SELECT * FROM expenses WHERE id = ?", (row_id,)).fetchone()
    conn.close()
    return dict(row)


@app.put("/api/expenses/{expense_id}")
def update_expense(expense_id: int, expense: Expense):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        """UPDATE expenses SET date=?, title=?, amount=?, currency=?, category=?,
           payment_method=?, notes=?, tags=? WHERE id=?""",
        (expense.date, expense.title, expense.amount, expense.currency,
         expense.category, expense.payment_method, expense.notes, expense.tags, expense_id),
    )
    if c.rowcount == 0:
        conn.close()
        raise HTTPException(404, "Expense not found")
    conn.commit()
    row = c.execute("SELECT * FROM expenses WHERE id = ?", (expense_id,)).fetchone()
    conn.close()
    return dict(row)


@app.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    if c.rowcount == 0:
        conn.close()
        raise HTTPException(404, "Expense not found")
    conn.commit()
    conn.close()
    return {"deleted": True}


# ─── Analytics ───────────────────────────────────────────────────────────────

@app.get("/api/analytics/summary")
def analytics_summary():
    conn = get_db()
    c = conn.cursor()
    now = datetime.now()
    from datetime import timedelta
    first_day = now.replace(day=1).strftime("%Y-%m-%d")
    today = now.strftime("%Y-%m-%d")
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")
    last_week_start = (now - timedelta(days=now.weekday() + 7)).strftime("%Y-%m-%d")
    last_week_end = (now - timedelta(days=now.weekday() + 1)).strftime("%Y-%m-%d")
    last_month_dt = (now.replace(day=1) - timedelta(days=1))
    last_month_start = last_month_dt.replace(day=1).strftime("%Y-%m-%d")
    last_month_end = last_month_dt.strftime("%Y-%m-%d")

    total_month = c.execute(
        "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE date >= ? AND date <= ?",
        (first_day, today)
    ).fetchone()[0]

    total_last_month = c.execute(
        "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE date >= ? AND date <= ?",
        (last_month_start, last_month_end)
    ).fetchone()[0]

    total_week = c.execute(
        "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE date >= ? AND date <= ?",
        (week_start, today)
    ).fetchone()[0]

    total_last_week = c.execute(
        "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE date >= ? AND date <= ?",
        (last_week_start, last_week_end)
    ).fetchone()[0]

    days_elapsed = now.day
    daily_avg = total_month / days_elapsed if days_elapsed > 0 else 0

    category_rows = c.execute(
        """SELECT category, SUM(amount) as total, COUNT(*) as count
           FROM expenses WHERE date >= ? AND date <= ?
           GROUP BY category ORDER BY total DESC""",
        (first_day, today)
    ).fetchall()

    monthly_trend = c.execute(
        """SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
           FROM expenses GROUP BY month ORDER BY month DESC LIMIT 12"""
    ).fetchall()

    payment_breakdown = c.execute(
        """SELECT payment_method, SUM(amount) as total
           FROM expenses WHERE date >= ? AND date <= ?
           GROUP BY payment_method""",
        (first_day, today)
    ).fetchall()

    conn.close()

    wow_change = ((total_week - total_last_week) / total_last_week * 100) if total_last_week > 0 else 0
    mom_change = ((total_month - total_last_month) / total_last_month * 100) if total_last_month > 0 else 0

    return {
        "total_month": round(total_month, 2),
        "total_last_month": round(total_last_month, 2),
        "mom_change_pct": round(mom_change, 1),
        "total_week": round(total_week, 2),
        "total_last_week": round(total_last_week, 2),
        "wow_change_pct": round(wow_change, 1),
        "daily_avg": round(daily_avg, 2),
        "days_elapsed": days_elapsed,
        "category_breakdown": [dict(r) for r in category_rows],
        "monthly_trend": [dict(r) for r in reversed(monthly_trend)],
        "payment_breakdown": [dict(r) for r in payment_breakdown],
    }


@app.get("/api/analytics/budget-vs-actual")
def budget_vs_actual():
    conn = get_db()
    c = conn.cursor()
    now = datetime.now()
    first_day = now.replace(day=1).strftime("%Y-%m-%d")
    today = now.strftime("%Y-%m-%d")
    month_str = now.strftime("%Y-%m")

    budgets = c.execute(
        "SELECT category, monthly_limit FROM budgets WHERE month = ?", (month_str,)
    ).fetchall()

    result = []
    for b in budgets:
        actual = c.execute(
            "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE category=? AND date>=? AND date<=?",
            (b["category"], first_day, today)
        ).fetchone()[0]
        pct = (actual / b["monthly_limit"] * 100) if b["monthly_limit"] > 0 else 0
        result.append({
            "category": b["category"],
            "budget": b["monthly_limit"],
            "actual": round(actual, 2),
            "pct": round(pct, 1),
            "over_budget": actual > b["monthly_limit"],
            "warning": pct >= 80,
        })

    conn.close()
    return result


@app.get("/api/analytics/daily-spending")
def daily_spending():
    conn = get_db()
    c = conn.cursor()
    now = datetime.now()
    first_day = now.replace(day=1).strftime("%Y-%m-%d")
    today = now.strftime("%Y-%m-%d")
    rows = c.execute(
        """SELECT date, SUM(amount) as total FROM expenses
           WHERE date >= ? AND date <= ? GROUP BY date ORDER BY date""",
        (first_day, today)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ─── Budgets ─────────────────────────────────────────────────────────────────

@app.get("/api/budgets")
def list_budgets():
    conn = get_db()
    rows = conn.execute("SELECT * FROM budgets ORDER BY category").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/budgets", status_code=201)
def upsert_budget(budget: Budget):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        """INSERT INTO budgets (category, monthly_limit, month) VALUES (?, ?, ?)
           ON CONFLICT(category) DO UPDATE SET monthly_limit=excluded.monthly_limit, month=excluded.month""",
        (budget.category, budget.monthly_limit, budget.month)
    )
    conn.commit()
    row = c.execute("SELECT * FROM budgets WHERE category=?", (budget.category,)).fetchone()
    conn.close()
    return dict(row)


@app.delete("/api/budgets/{budget_id}")
def delete_budget(budget_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM budgets WHERE id=?", (budget_id,))
    conn.commit()
    conn.close()
    return {"deleted": True}


# ─── Settings ────────────────────────────────────────────────────────────────

@app.get("/api/settings")
def get_settings():
    conn = get_db()
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}


@app.put("/api/settings")
def update_settings(settings: dict):
    conn = get_db()
    c = conn.cursor()
    for key, value in settings.items():
        c.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, str(value))
        )
    conn.commit()
    conn.close()
    return {"updated": True}


# ─── Export / Import ──────────────────────────────────────────────────────────

@app.get("/api/export/csv")
def export_csv():
    conn = get_db()
    rows = conn.execute("SELECT * FROM expenses ORDER BY date DESC").fetchall()
    conn.close()
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["id","date","title","amount","currency","category","payment_method","notes","tags","created_at"])
    writer.writeheader()
    writer.writerows([dict(r) for r in rows])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=expenses.csv"}
    )


@app.get("/api/export/json")
def export_json():
    conn = get_db()
    rows = conn.execute("SELECT * FROM expenses ORDER BY date DESC").fetchall()
    conn.close()
    data = json.dumps([dict(r) for r in rows], indent=2)
    return StreamingResponse(
        io.BytesIO(data.encode()),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=expenses.json"}
    )


@app.post("/api/import/json")
async def import_json(data: list):
    conn = get_db()
    c = conn.cursor()
    imported = 0
    for item in data:
        try:
            c.execute(
                """INSERT INTO expenses (date, title, amount, currency, category, payment_method, notes, tags)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (item.get("date"), item.get("title"), item.get("amount"),
                 item.get("currency","INR"), item.get("category"), item.get("payment_method"),
                 item.get("notes"), item.get("tags"))
            )
            imported += 1
        except Exception:
            pass
    conn.commit()
    conn.close()
    return {"imported": imported}


# ─── AI — always uses the hardcoded SambaNova cloud key ──────────────────────

def build_financial_context(conn) -> str:
    now = datetime.now()
    from datetime import timedelta
    first_day = now.replace(day=1).strftime("%Y-%m-%d")
    today = now.strftime("%Y-%m-%d")
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")

    monthly_total = conn.execute(
        "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE date>=? AND date<=?",
        (first_day, today)
    ).fetchone()[0]

    categories = conn.execute(
        """SELECT category, SUM(amount) as total, COUNT(*) as count
           FROM expenses WHERE date>=? AND date<=?
           GROUP BY category ORDER BY total DESC""",
        (first_day, today)
    ).fetchall()

    recent = conn.execute(
        "SELECT date, title, amount, category FROM expenses ORDER BY date DESC LIMIT 20"
    ).fetchall()

    weekly = conn.execute(
        "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE date>=? AND date<=?",
        (week_start, today)
    ).fetchone()[0]

    context = f"""Current financial context:
- Today: {today}
- This month total: {monthly_total:.2f}
- This week total: {weekly:.2f}
- Days elapsed: {now.day}
- Daily average: {(monthly_total/max(now.day,1)):.2f}

Category breakdown this month:
"""
    for cat in categories:
        context += f"  - {cat['category']}: {cat['total']:.2f} ({cat['count']} transactions)\n"

    context += "\nRecent transactions (last 20):\n"
    for tx in recent:
        context += f"  - {tx['date']} | {tx['title']} | {tx['amount']:.2f} | {tx['category']}\n"

    return context


async def call_cloud_ai(messages: list, system: str, max_tokens: int = 1024) -> str:
    """Call SambaNova OpenAI-compatible endpoint."""
    payload_messages = [{"role": "system", "content": system}] + messages
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{CLOUD_AI_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {CLOUD_AI_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": CLOUD_AI_MODEL,
                "messages": payload_messages,
                "max_tokens": max_tokens,
                "temperature": 0.7,
            }
        )
        if resp.status_code != 200:
            raise HTTPException(resp.status_code, f"AI error: {resp.text}")
        data = resp.json()
        return data["choices"][0]["message"]["content"]


@app.post("/api/ai/chat")
async def ai_chat(query: AIQuery):
    conn = get_db()
    financial_context = build_financial_context(conn)
    conn.close()

    system_prompt = f"""You are a sharp, empathetic personal finance advisor embedded inside an expense tracker app.
You have real-time access to the user's actual spending data. Be specific, actionable, and data-driven.
Use bullet points and clear structure. Keep responses concise but insightful.

{financial_context}

When giving advice:
- Reference specific numbers from their data
- Give concrete, actionable steps
- Flag unusual patterns or areas of concern
- Be encouraging but honest about overspending
"""
    messages = list(query.conversation_history) + [{"role": "user", "content": query.message}]
    reply = await call_cloud_ai(messages, system_prompt)
    return {"reply": reply, "provider": "cloud"}


@app.get("/api/ai/insights")
async def ai_insights():
    conn = get_db()
    financial_context = build_financial_context(conn)
    conn.close()

    # Check if there's any spending data
    prompt = f"""Based on this spending data, generate 3-4 sharp financial insights as JSON.
Each insight has: type (warning/tip/positive/neutral), title (short), message (1-2 sentences with specific numbers).

{financial_context}

Return ONLY a valid JSON array, nothing else:
[{{"type":"warning","title":"...","message":"..."}}]"""

    try:
        text = await call_cloud_ai([{"role": "user", "content": prompt}], "You are a financial data analyst. Return only valid JSON arrays.", 512)
        start = text.find("[")
        end = text.rfind("]") + 1
        if start >= 0 and end > start:
            insights = json.loads(text[start:end])
            return {"insights": insights}
    except Exception as e:
        return {"insights": [], "error": str(e)}

    return {"insights": []}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
