from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import json
import csv
import io
import httpx
import hashlib
import hmac
import base64
from datetime import datetime, date, timedelta, timezone
import os

app = FastAPI(title="FinFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "expenses.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

CLOUD_AI_BASE = "https://api.sambanova.ai/v1"
CLOUD_AI_KEY = os.getenv("VITE_AI_API_KEY", "f2875895fce843c68c55a59c02317cb2.hfvc9Ea5NkgEV3xGl7nh-Dmt")
CLOUD_AI_MODEL = "Meta-Llama-3.1-8B-Instruct"

SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-finflow-key-change-in-production-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    salt = "finflow_salt_"
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hmac.compare_digest(hash_password(plain_password), hashed_password)

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)

def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload.update({"exp": int(expire.timestamp())})
    header = {"alg": ALGORITHM, "typ": "JWT"}
    seg1 = base64url_encode(json.dumps(header).encode('utf-8'))
    seg2 = base64url_encode(json.dumps(payload).encode('utf-8'))
    sig = hmac.new(SECRET_KEY.encode('utf-8'), f"{seg1}.{seg2}".encode('utf-8'), hashlib.sha256).digest()
    seg3 = base64url_encode(sig)
    return f"{seg1}.{seg2}.{seg3}"

def decode_access_token(token: str) -> dict:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError()
        seg1, seg2, seg3 = parts
        expected_sig = base64url_encode(
            hmac.new(SECRET_KEY.encode('utf-8'), f"{seg1}.{seg2}".encode('utf-8'), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(seg3, expected_sig):
            raise ValueError()
        payload = json.loads(base64url_decode(seg2).decode('utf-8'))
        if datetime.now(timezone.utc).timestamp() > payload.get("exp", 0):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
        return payload
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    username = payload.get("sub")
    user_id = payload.get("id")
    role = payload.get("role")
    if not username or user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return {"id": user_id, "username": username, "role": role}

def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin full access required")
    return current_user

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            date TEXT NOT NULL,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL DEFAULT 'INR',
            category TEXT NOT NULL DEFAULT 'General',
            payment_method TEXT NOT NULL DEFAULT 'UPI',
            notes TEXT,
            tags TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    c.execute("PRAGMA table_info(expenses)")
    cols = [r[1] for r in c.fetchall()]
    if "user_id" not in cols:
        c.execute("ALTER TABLE expenses ADD COLUMN user_id INTEGER REFERENCES users(id)")

    c.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            category TEXT NOT NULL,
            monthly_limit REAL NOT NULL,
            currency TEXT NOT NULL DEFAULT 'INR',
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    c.execute("PRAGMA table_info(budgets)")
    bcols = [r[1] for r in c.fetchall()]
    if "user_id" not in bcols:
        c.execute("ALTER TABLE budgets ADD COLUMN user_id INTEGER REFERENCES users(id)")

    c.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            default_currency TEXT DEFAULT 'INR',
            theme TEXT DEFAULT 'dark',
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    admin = c.execute("SELECT * FROM users WHERE username = ?", ("admin",)).fetchone()
    if not admin:
        c.execute(
            "INSERT INTO users (username, hashed_password, role) VALUES (?, ?, ?)",
            ("admin", hash_password("admin123"), "admin")
        )
    conn.commit()
    conn.close()

init_db()

class UserRegister(BaseModel):
    username: str
    password: str

class Expense(BaseModel):
    date: str
    title: str
    amount: float
    currency: Optional[str] = "INR"
    category: Optional[str] = "General"
    payment_method: Optional[str] = "UPI"
    notes: Optional[str] = ""
    tags: Optional[str] = ""

class Budget(BaseModel):
    category: str
    monthly_limit: float
    currency: Optional[str] = "INR"

class SettingsModel(BaseModel):
    default_currency: Optional[str] = "INR"
    theme: Optional[str] = "dark"

class AIQuery(BaseModel):
    message: str
    history: Optional[List[dict]] = []

@app.get("/")
def read_root():
    return {"status": "online", "message": "FinFlow Expense Tracker API is running"}

@app.post("/api/auth/register", status_code=201)
def register(user: UserRegister):
    conn = get_db()
    c = conn.cursor()
    existing = c.execute("SELECT id FROM users WHERE username = ?", (user.username.strip(),)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists")

    c.execute(
        "INSERT INTO users (username, hashed_password, role) VALUES (?, ?, 'user')",
        (user.username.strip(), hash_password(user.password))
    )
    conn.commit()
    conn.close()
    return {"message": "Account created successfully"}

@app.post("/api/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_db()
    c = conn.cursor()
    user = c.execute("SELECT * FROM users WHERE username = ?", (form_data.username.strip(),)).fetchone()
    conn.close()

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Invalid username or password")

    token = create_access_token({"sub": user["username"], "id": user["id"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user["username"],
        "role": user["role"]
    }

@app.get("/api/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.get("/api/admin/users")
def get_all_users(admin: dict = Depends(require_admin)):
    conn = get_db()
    c = conn.cursor()
    users = c.execute("SELECT id, username, role FROM users ORDER BY id ASC").fetchall()
    conn.close()
    return [dict(u) for u in users]

@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: int, admin: dict = Depends(require_admin)):
    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete superuser")
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM expenses WHERE user_id = ?", (user_id,))
    c.execute("DELETE FROM budgets WHERE user_id = ?", (user_id,))
    c.execute("DELETE FROM settings WHERE user_id = ?", (user_id,))
    c.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "User purged"}

@app.get("/api/expenses")
def list_expenses(
    search: Optional[str] = None,
    category: Optional[str] = None,
    order: Optional[str] = "desc",
    current_user: dict = Depends(get_current_user)
):
    conn = get_db()
    c = conn.cursor()
    params = []

    if current_user["role"] == "admin":
        query = "SELECT * FROM expenses WHERE 1=1"
    else:
        query = "SELECT * FROM expenses WHERE (user_id = ? OR user_id IS NULL)"
        params.append(current_user["id"])

    if search:
        query += " AND (title LIKE ? OR notes LIKE ? OR tags LIKE ?)"
        wild = f"%{search}%"
        params.extend([wild, wild, wild])
    if category:
        query += " AND category = ?"
        params.append(category)

    sort_order = "ASC" if order.lower() == "asc" else "DESC"
    query += f" ORDER BY date {sort_order}, id {sort_order}"

    rows = c.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/expenses", status_code=201)
def create_expense(expense: Expense, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        """INSERT INTO expenses (user_id, date, title, amount, currency, category, payment_method, notes, tags)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (current_user["id"], expense.date, expense.title, expense.amount, expense.currency,
         expense.category, expense.payment_method, expense.notes, expense.tags)
    )
    conn.commit()
    row_id = c.lastrowid
    row = c.execute("SELECT * FROM expenses WHERE id = ?", (row_id,)).fetchone()
    conn.close()
    return dict(row)

@app.put("/api/expenses/{expense_id}")
def update_expense(expense_id: int, expense: Expense, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.cursor()
    if current_user["role"] == "admin":
        check = c.execute("SELECT id FROM expenses WHERE id = ?", (expense_id,)).fetchone()
    else:
        check = c.execute("SELECT id FROM expenses WHERE id = ? AND user_id = ?", (expense_id, current_user["id"])).fetchone()

    if not check:
        conn.close()
        raise HTTPException(status_code=404, detail="Expense not found or unauthorized")

    c.execute(
        """UPDATE expenses SET date=?, title=?, amount=?, currency=?, category=?,
           payment_method=?, notes=?, tags=? WHERE id=?""",
        (expense.date, expense.title, expense.amount, expense.currency, expense.category,
         expense.payment_method, expense.notes, expense.tags, expense_id)
    )
    conn.commit()
    row = c.execute("SELECT * FROM expenses WHERE id = ?", (expense_id,)).fetchone()
    conn.close()
    return dict(row)

@app.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.cursor()
    if current_user["role"] == "admin":
        c.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    else:
        c.execute("DELETE FROM expenses WHERE id = ? AND user_id = ?", (expense_id, current_user["id"]))

    if c.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Expense not found or unauthorized")

    conn.commit()
    conn.close()
    return {"message": "Expense deleted"}

@app.get("/api/analytics/summary")
def get_analytics_summary(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.cursor()
    now = datetime.now()
    today = date.today()
    first_day = today.replace(day=1).strftime("%Y-%m-%d")
    today_str = today.strftime("%Y-%m-%d")

    u_filter = "" if current_user["role"] == "admin" else "AND (user_id = ? OR user_id IS NULL)"
    p_u = [] if current_user["role"] == "admin" else [current_user["id"]]

    total_month = c.execute(
        f"SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= ? AND date <= ? {u_filter}",
        [first_day, today_str] + p_u
    ).fetchone()[0]

    last_month_end = (today.replace(day=1) - timedelta(days=1))
    last_month_start = last_month_end.replace(day=1).strftime("%Y-%m-%d")
    last_month_end_str = last_month_end.strftime("%Y-%m-%d")

    total_last_month = c.execute(
        f"SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= ? AND date <= ? {u_filter}",
        [last_month_start, last_month_end_str] + p_u
    ).fetchone()[0]

    week_start = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")
    total_week = c.execute(
        f"SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= ? AND date <= ? {u_filter}",
        [week_start, today_str] + p_u
    ).fetchone()[0]

    last_week_start = (today - timedelta(days=today.weekday() + 7)).strftime("%Y-%m-%d")
    last_week_end = (today - timedelta(days=today.weekday() + 1)).strftime("%Y-%m-%d")
    total_last_week = c.execute(
        f"SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= ? AND date <= ? {u_filter}",
        [last_week_start, last_week_end] + p_u
    ).fetchone()[0]

    category_rows = c.execute(
        f"""SELECT category, SUM(amount) as total, COUNT(*) as count
            FROM expenses WHERE date >= ? AND date <= ? {u_filter}
            GROUP BY category ORDER BY total DESC""",
        [first_day, today_str] + p_u
    ).fetchall()

    monthly_trend = c.execute(
        f"""SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
            FROM expenses WHERE 1=1 {u_filter}
            GROUP BY month ORDER BY month DESC LIMIT 12""",
        p_u
    ).fetchall()

    payment_rows = c.execute(
        f"""SELECT payment_method, SUM(amount) as total
            FROM expenses WHERE date >= ? AND date <= ? {u_filter}
            GROUP BY payment_method""",
        [first_day, today_str] + p_u
    ).fetchall()

    days_elapsed = now.day
    daily_avg = total_month / max(days_elapsed, 1)

    mom_change_pct = 0.0
    if total_last_month > 0:
        mom_change_pct = round(((total_month - total_last_month) / total_last_month) * 100, 1)

    wow_change_pct = 0.0
    if total_last_week > 0:
        wow_change_pct = round(((total_week - total_last_week) / total_last_week) * 100, 1)

    conn.close()

    cat_list = [dict(r) for r in category_rows]
    pay_list = [dict(r) for r in payment_rows]

    return {
        "total_month": round(total_month, 2),
        "total_last_month": round(total_last_month, 2),
        "total_week": round(total_week, 2),
        "total_last_week": round(total_last_week, 2),
        "daily_avg": round(daily_avg, 2),
        "days_elapsed": days_elapsed,
        "mom_change_pct": mom_change_pct,
        "wow_change_pct": wow_change_pct,
        "category_breakdown": cat_list,
        "by_category": cat_list,
        "monthly_trend": [dict(r) for r in reversed(monthly_trend)],
        "payment_breakdown": pay_list,
        "by_payment": pay_list,
    }

@app.get("/api/analytics/budget-vs-actual")
def budget_vs_actual(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.cursor()
    today = date.today()
    first_day = today.replace(day=1).strftime("%Y-%m-%d")
    today_str = today.strftime("%Y-%m-%d")

    if current_user["role"] == "admin":
        budgets = c.execute("SELECT * FROM budgets").fetchall()
    else:
        budgets = c.execute("SELECT * FROM budgets WHERE (user_id = ? OR user_id IS NULL)", (current_user["id"],)).fetchall()

    result = []
    for b in budgets:
        b_dict = dict(b)
        u_clause = "" if current_user["role"] == "admin" else "AND (user_id = ? OR user_id IS NULL)"
        p = [b_dict["category"], first_day, today_str] if current_user["role"] == "admin" else [b_dict["category"], first_day, today_str, current_user["id"]]
        actual = c.execute(
            f"SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE category=? AND date>=? AND date<=? {u_clause}",
            p
        ).fetchone()[0]
        b_dict["actual"] = round(actual, 2)
        b_dict["remaining"] = round(b_dict["monthly_limit"] - actual, 2)
        b_dict["pct_used"] = round((actual / b_dict["monthly_limit"]) * 100, 1) if b_dict["monthly_limit"] > 0 else 0
        result.append(b_dict)

    conn.close()
    return result

@app.get("/api/analytics/daily-spending")
def daily_spending(days: int = 30, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.cursor()
    today = date.today()
    start_day = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    today_str = today.strftime("%Y-%m-%d")

    u_filter = "" if current_user["role"] == "admin" else "AND (user_id = ? OR user_id IS NULL)"
    p = [start_day, today_str] if current_user["role"] == "admin" else [start_day, today_str, current_user["id"]]

    rows = c.execute(
        f"""SELECT date, SUM(amount) as total FROM expenses
            WHERE date >= ? AND date <= ? {u_filter}
            GROUP BY date ORDER BY date""",
        p
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/budgets")
def list_budgets(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.cursor()
    if current_user["role"] == "admin":
        rows = c.execute("SELECT * FROM budgets").fetchall()
    else:
        rows = c.execute("SELECT * FROM budgets WHERE (user_id = ? OR user_id IS NULL)", (current_user["id"],)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/budgets", status_code=201)
def upsert_budget(budget: Budget, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.cursor()
    existing = c.execute(
        "SELECT id FROM budgets WHERE category = ? AND user_id = ?",
        (budget.category, current_user["id"])
    ).fetchone()

    if existing:
        c.execute(
            "UPDATE budgets SET monthly_limit = ?, currency = ? WHERE id = ?",
            (budget.monthly_limit, budget.currency, existing["id"])
        )
        row_id = existing["id"]
    else:
        c.execute(
            "INSERT INTO budgets (user_id, category, monthly_limit, currency) VALUES (?, ?, ?, ?)",
            (current_user["id"], budget.category, budget.monthly_limit, budget.currency)
        )
        row_id = c.lastrowid
    conn.commit()
    row = c.execute("SELECT * FROM budgets WHERE id = ?", (row_id,)).fetchone()
    conn.close()
    return dict(row)

@app.delete("/api/budgets/{budget_id}")
def delete_budget(budget_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.cursor()
    if current_user["role"] == "admin":
        c.execute("DELETE FROM budgets WHERE id = ?", (budget_id,))
    else:
        c.execute("DELETE FROM budgets WHERE id = ? AND user_id = ?", (budget_id, current_user["id"]))

    if c.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Budget not found")
    conn.commit()
    conn.close()
    return {"message": "Budget deleted"}

@app.get("/api/settings")
def get_settings(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.cursor()
    row = c.execute("SELECT * FROM settings WHERE user_id = ?", (current_user["id"],)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return {"default_currency": "INR", "theme": "dark"}

@app.put("/api/settings")
def update_settings(settings: SettingsModel, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.cursor()
    existing = c.execute("SELECT id FROM settings WHERE user_id = ?", (current_user["id"],)).fetchone()
    if existing:
        c.execute(
            "UPDATE settings SET default_currency = ?, theme = ? WHERE user_id = ?",
            (settings.default_currency, settings.theme, current_user["id"])
        )
    else:
        c.execute(
            "INSERT INTO settings (user_id, default_currency, theme) VALUES (?, ?, ?)",
            (current_user["id"], settings.default_currency, settings.theme)
        )
    conn.commit()
    conn.close()
    return {"default_currency": settings.default_currency, "theme": settings.theme}

@app.get("/api/export/csv")
def export_csv(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.cursor()
    if current_user["role"] == "admin":
        rows = c.execute("SELECT date, title, amount, currency, category, payment_method, notes, tags FROM expenses ORDER BY date DESC").fetchall()
    else:
        rows = c.execute("SELECT date, title, amount, currency, category, payment_method, notes, tags FROM expenses WHERE (user_id = ? OR user_id IS NULL) ORDER BY date DESC", (current_user["id"],)).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["date", "title", "amount", "currency", "category", "payment_method", "notes", "tags"])
    for r in rows:
        writer.writerow(list(r))
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=expenses.csv"}
    )

@app.get("/api/export/json")
def export_json(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.cursor()
    if current_user["role"] == "admin":
        rows = c.execute("SELECT * FROM expenses ORDER BY date DESC").fetchall()
    else:
        rows = c.execute("SELECT * FROM expenses WHERE (user_id = ? OR user_id IS NULL) ORDER BY date DESC", (current_user["id"],)).fetchall()
    conn.close()
    data = json.dumps([dict(r) for r in rows], indent=2)
    return StreamingResponse(
        iter([data]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=expenses.json"}
    )

@app.post("/api/import/json")
async def import_json(data: list, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    c = conn.cursor()
    count = 0
    for item in data:
        c.execute(
            """INSERT INTO expenses (user_id, date, title, amount, currency, category, payment_method, notes, tags)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (current_user["id"], item.get("date"), item.get("title", "Imported Item"),
             float(item.get("amount", 0)), item.get("currency", "INR"), item.get("category", "General"),
             item.get("payment_method", "UPI"), item.get("notes", ""), item.get("tags", ""))
        )
        count += 1
    conn.commit()
    conn.close()
    return {"imported": count}

@app.post("/api/ai/chat")
async def ai_chat(query: AIQuery, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    today = date.today()
    first_day = today.replace(day=1).strftime("%Y-%m-%d")
    today_str = today.strftime("%Y-%m-%d")

    u_filter = "" if current_user["role"] == "admin" else "AND (user_id = ? OR user_id IS NULL)"
    p = [first_day, today_str] if current_user["role"] == "admin" else [first_day, today_str, current_user["id"]]

    monthly_total = conn.execute(
        f"SELECT COALESCE(SUM(amount),0) FROM expenses WHERE date>=? AND date<=? {u_filter}",
        p
    ).fetchone()[0]

    category_summary = conn.execute(
        f"""SELECT category, SUM(amount) as total, COUNT(*) as count
            FROM expenses WHERE date>=? AND date<=? {u_filter}
            GROUP BY category ORDER BY total DESC""",
        p
    ).fetchall()

    recent = conn.execute(
        f"SELECT date, title, amount, category FROM expenses WHERE 1=1 {u_filter} ORDER BY date DESC LIMIT 20",
        [] if current_user["role"] == "admin" else [current_user["id"]]
    ).fetchall()

    conn.close()

    context = f"""User context:
Current user: {current_user['username']} ({current_user['role']})
Total spent this month: ₹{monthly_total:.2f}
Top spending categories: {', '.join([f"{r['category']}: ₹{r['total']:.2f}" for r in category_summary[:5]])}
Recent transactions: {', '.join([f"{r['title']} (₹{r['amount']})" for r in recent[:10]])}
"""
    system_prompt = f"You are FinFlow AI, a savvy, encouraging, and witty personal financial advisor. {context} Keep advice punchy, actionable, and friendly."

    messages = [{"role": "system", "content": system_prompt}]
    for h in query.history[-6:]:
        messages.append(h)
    messages.append({"role": "user", "content": query.message})

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{CLOUD_AI_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {CLOUD_AI_KEY}", "Content-Type": "application/json"},
                json={"model": CLOUD_AI_MODEL, "messages": messages, "max_tokens": 500, "temperature": 0.7}
            )
            if resp.status_code == 200:
                data = resp.json()
                return {"reply": data["choices"][0]["message"]["content"]}
    except Exception:
        pass

    return {
        "reply": f"Hello {current_user['username']}! You have spent ₹{monthly_total:.2f} this month. Keep tracking your expenses and watching your category budgets!"
    }

@app.get("/api/ai/insights")
async def ai_insights(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    today = date.today()
    first_day = today.replace(day=1).strftime("%Y-%m-%d")
    today_str = today.strftime("%Y-%m-%d")

    u_filter = "" if current_user["role"] == "admin" else "AND (user_id = ? OR user_id IS NULL)"
    p = [first_day, today_str] if current_user["role"] == "admin" else [first_day, today_str, current_user["id"]]

    total = conn.execute(
        f"SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= ? AND date <= ? {u_filter}",
        p
    ).fetchone()[0]
    conn.close()

    return {
        "insights": [
            f"You have tracked a total of ₹{total:.2f} this month.",
            "Consistently categorizing UPI transactions helps trim impulse spends.",
            "Set category budget limits to alert you before thresholds are breached."
        ]
    }
