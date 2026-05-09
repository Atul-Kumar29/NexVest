"""
Optimal Investment Portfolio Planner — FastAPI Backend
Run: uvicorn main:app --reload

Scalability hooks:
- /api/v1/ prefix for versioning
- CORS open for dev; restrict origins in production
- Add auth middleware, DB layer, or background tasks without touching routes
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import os
import logging
import math

from knapsack import Investment, solve
from backend.data_fetcher import fetch_stock_data, fetch_mf_data, get_categories

logger = logging.getLogger(__name__)

# ── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Investment Portfolio Planner API",
    description="Optimal portfolio selection using 0/1 Knapsack DP",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files
frontend_path = os.path.dirname(__file__)
app.mount("/static", StaticFiles(directory=frontend_path), name="static")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class InvestmentIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    cost: int = Field(..., gt=0, description="Amount required (₹)")
    expected_return: int = Field(..., gt=0, description="Expected return (₹)")
    risk_level: str = Field("medium", pattern="^(low|medium|high)$")
    sector: str = Field("general", max_length=40)
    description: str = Field("", max_length=200)


class SolveRequest(BaseModel):
    budget: int = Field(..., gt=0, description="Total budget (₹)")
    investments: List[InvestmentIn] = Field(..., min_items=1, max_items=50)


class InvestmentOut(BaseModel):
    id: int
    name: str
    cost: int
    expected_return: int
    risk_level: str
    sector: str
    description: str
    selected: bool


class EnhancedItem(BaseModel):
    name: str
    unit_cost: int
    unit_return: int
    units: int
    total_cost: int
    total_return: int


class SolveResponse(BaseModel):
    selected_names: List[str]
    total_return: int
    total_cost: int
    budget: int
    remaining_budget: int
    roi_percent: float
    investments: List[InvestmentOut]
    dp_table: List[List[int]]
    dp_labels: List[int]
    enhanced_allocation: List[EnhancedItem]
    enhanced_total_cost: int
    enhanced_total_return: int
    enhanced_remaining: int


# ── Post-processing: greedy quantity fill ─────────────────────────────────────

def greedy_fill(selected_investments, budget):
    """
    After 0/1 knapsack picks WHICH investments, buy additional units
    of selected investments to use up remaining budget.
    Round-robin: cycle through all selected investments (sorted by ROI),
    buying 1 unit each per round to ensure diversification.
    """
    if not selected_investments:
        return [], 0, 0, budget

    # Sort by ROI descending
    sorted_inv = sorted(
        selected_investments,
        key=lambda inv: inv.expected_return / inv.cost if inv.cost > 0 else 0,
        reverse=True,
    )

    remaining = budget
    units_map = {inv.name: 0 for inv in sorted_inv}

    # Round-robin: keep cycling, buying 1 unit of each per pass
    made_purchase = True
    while made_purchase and remaining > 0:
        made_purchase = False
        for inv in sorted_inv:
            if remaining >= inv.cost:
                units_map[inv.name] += 1
                remaining -= inv.cost
                made_purchase = True

    allocation = []
    for inv in sorted_inv:
        units = units_map[inv.name]
        if units == 0:
            continue
        allocation.append(EnhancedItem(
            name=inv.name,
            unit_cost=inv.cost,
            unit_return=inv.expected_return,
            units=units,
            total_cost=units * inv.cost,
            total_return=units * inv.expected_return,
        ))

    enh_total_cost = sum(a.total_cost for a in allocation)
    enh_total_return = sum(a.total_return for a in allocation)
    return allocation, enh_total_cost, enh_total_return, budget - enh_total_cost


# ── DP table sampling ────────────────────────────────────────────────────────

def sample_dp_table(dp_table, max_cols=150):
    """
    When W is large, sample columns to keep response size manageable.
    Returns (sampled_table, column_labels).
    """
    if not dp_table:
        return dp_table, []

    total_cols = len(dp_table[0])

    if total_cols <= max_cols:
        return dp_table, list(range(total_cols))

    # Sample evenly, always include first and last column
    step = math.ceil(total_cols / max_cols)
    indices = list(range(0, total_cols, step))
    if indices[-1] != total_cols - 1:
        indices.append(total_cols - 1)

    sampled = []
    for row in dp_table:
        sampled.append([row[i] for i in indices])

    return sampled, indices


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
def serve_frontend():
    return FileResponse(os.path.join(frontend_path, "index.html"))


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/api/v1/solve", response_model=SolveResponse)
def solve_portfolio(req: SolveRequest):
    investments = [
        Investment(
            id=i,
            name=inv.name,
            cost=inv.cost,
            expected_return=inv.expected_return,
            risk_level=inv.risk_level,
            sector=inv.sector,
            description=inv.description,
        )
        for i, inv in enumerate(req.investments)
    ]

    result = solve(investments, req.budget)
    selected_ids = {inv.id for inv in result.selected}

    investments_out = [
        InvestmentOut(
            id=inv.id,
            name=inv.name,
            cost=inv.cost,
            expected_return=inv.expected_return,
            risk_level=inv.risk_level,
            sector=inv.sector,
            description=inv.description,
            selected=inv.id in selected_ids,
        )
        for inv in investments
    ]

    # Sample DP table if budget is large
    sampled_dp, dp_labels = sample_dp_table(result.dp_table)

    # Post-processing: greedy fill with selected investments
    enhanced, enh_cost, enh_return, enh_remaining = greedy_fill(
        result.selected, req.budget
    )

    return SolveResponse(
        selected_names=[inv.name for inv in result.selected],
        total_return=result.total_return,
        total_cost=result.total_cost,
        budget=result.budget,
        remaining_budget=result.remaining_budget,
        roi_percent=result.roi_percent,
        investments=investments_out,
        dp_table=sampled_dp,
        dp_labels=dp_labels,
        enhanced_allocation=enhanced,
        enhanced_total_cost=enh_cost,
        enhanced_total_return=enh_return,
        enhanced_remaining=enh_remaining,
    )


# ── Live Data Routes ──────────────────────────────────────────────────────────

@app.get("/api/v1/fetch-investments")
def fetch_investments(tickers: str = Query(..., description="Comma-separated Yahoo Finance tickers")):
    """Fetch live stock/ETF data from Yahoo Finance."""
    ticker_list = [t.strip() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        raise HTTPException(status_code=400, detail="No tickers provided.")
    if len(ticker_list) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 tickers per request.")
    try:
        data = fetch_stock_data(ticker_list)
        if not data:
            raise HTTPException(status_code=404, detail="No data found for the given tickers.")
        return {"investments": data, "source": "Yahoo Finance", "count": len(data)}
    except Exception as e:
        logger.error(f"fetch-investments error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/fetch-mf")
def fetch_mf(scheme_codes: str = Query(..., description="Comma-separated MFAPI scheme codes")):
    """Fetch live mutual fund NAV data from mfapi.in."""
    code_list = [c.strip() for c in scheme_codes.split(",") if c.strip()]
    if not code_list:
        raise HTTPException(status_code=400, detail="No scheme codes provided.")
    if len(code_list) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 schemes per request.")
    try:
        data = fetch_mf_data(code_list)
        if not data:
            raise HTTPException(status_code=404, detail="No data found for the given scheme codes.")
        return {"investments": data, "source": "MFAPI.in", "count": len(data)}
    except Exception as e:
        logger.error(f"fetch-mf error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/categories")
def list_categories():
    """Return predefined ticker/scheme categories for quick selection."""
    categories = get_categories()
    return {"categories": categories}


@app.get("/api/v1/presets")
def get_presets():
    """Sample datasets for demo / testing."""
    return {
        "presets": [
            {
                "label": "Balanced Mix",
                "budget": 100000,
                "investments": [
                    {"name": "Tech Stocks", "cost": 30000, "expected_return": 45000, "risk_level": "high", "sector": "Technology"},
                    {"name": "Govt Bonds", "cost": 20000, "expected_return": 22000, "risk_level": "low", "sector": "Bonds"},
                    {"name": "Mutual Fund A", "cost": 25000, "expected_return": 30000, "risk_level": "medium", "sector": "Equity"},
                    {"name": "Fixed Deposit", "cost": 15000, "expected_return": 17000, "risk_level": "low", "sector": "Banking"},
                    {"name": "Real Estate", "cost": 50000, "expected_return": 70000, "risk_level": "medium", "sector": "Property"},
                    {"name": "Gold ETF", "cost": 20000, "expected_return": 25000, "risk_level": "low", "sector": "Commodities"},
                    {"name": "Startup Fund", "cost": 35000, "expected_return": 60000, "risk_level": "high", "sector": "Venture"},
                ],
            },
            {
                "label": "Conservative",
                "budget": 80000,
                "investments": [
                    {"name": "PPF", "cost": 15000, "expected_return": 17000, "risk_level": "low", "sector": "Banking"},
                    {"name": "NSC", "cost": 10000, "expected_return": 11000, "risk_level": "low", "sector": "Banking"},
                    {"name": "Blue-chip Stocks", "cost": 30000, "expected_return": 38000, "risk_level": "medium", "sector": "Equity"},
                    {"name": "Debt Fund", "cost": 20000, "expected_return": 23000, "risk_level": "low", "sector": "Bonds"},
                    {"name": "Index Fund", "cost": 25000, "expected_return": 32000, "risk_level": "medium", "sector": "Equity"},
                ],
            },
        ]
    }
