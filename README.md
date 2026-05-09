# PortfolioAI — Optimal Investment Portfolio Planner

**Course**: Design and Analysis of Algorithms (BIS404T)  
**Algorithm**: 0/1 Knapsack via Dynamic Programming  
**Stack**: Python + FastAPI (backend) · HTML + CSS + Vanilla JS + Chart.js (frontend)

---

## Project Structure

```
portfolio-planner/
├── backend/
│   ├── knapsack.py       ← Core DP algorithm
│   ├── main.py           ← FastAPI app + routes
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

---

## Setup & Run

### 1. Install dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Start the server
```bash
uvicorn main:app --reload
```

### 3. Open the app
Visit: **http://127.0.0.1:8000**

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET    | `/`              | Serves the frontend |
| GET    | `/api/v1/health` | Health check |
| POST   | `/api/v1/solve`  | Run DP algorithm |
| GET    | `/api/v1/presets`| Load sample datasets |
| GET    | `/docs`          | Auto-generated Swagger UI |

---

## Algorithm Details

### Time Complexity:  O(n × W)
### Space Complexity: O(n × W)

Where `n` = number of investments, `W` = total budget.

### Recurrence:
```
if cost[i] ≤ w:
    dp[i][w] = max(dp[i-1][w],  return[i] + dp[i-1][w - cost[i]])
else:
    dp[i][w] = dp[i-1][w]
```

Backtracking from `dp[n][W]` identifies the selected investments.

---

## Scalability Notes
- `/api/v1/` prefix allows future versioning
- `knapsack.py` is isolated — swap algorithm without touching routes
- Add auth middleware, database (SQLAlchemy), or background tasks in `main.py`
- Risk-cap and sector-limit constraints can be added via `add_constraint()` hooks
