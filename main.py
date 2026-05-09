"""
Optimal Investment Portfolio Planner — FastAPI Backend
Run: uvicorn main:app --reload

Scalability hooks:
- /api/v1/ prefix for versioning
- CORS open for dev; restrict origins in production
- Add auth middleware, DB layer, or background tasks without touching routes
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import os

from knapsack import Investment, solve

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
    cost: int = Field(..., gt=0, description="Amount required (₹ thousands)")
    expected_return: int = Field(..., gt=0, description="Expected return (₹ thousands)")
    risk_level: str = Field("medium", pattern="^(low|medium|high)$")
    sector: str = Field("general", max_length=40)
    description: str = Field("", max_length=200)


class SolveRequest(BaseModel):
    budget: int = Field(..., gt=0, description="Total budget (₹ thousands)")
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


class SolveResponse(BaseModel):
    selected_names: List[str]
    total_return: int
    total_cost: int
    budget: int
    remaining_budget: int
    roi_percent: float
    investments: List[InvestmentOut]
    dp_table: List[List[int]]


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

    return SolveResponse(
        selected_names=[inv.name for inv in result.selected],
        total_return=result.total_return,
        total_cost=result.total_cost,
        budget=result.budget,
        remaining_budget=result.remaining_budget,
        roi_percent=result.roi_percent,
        investments=investments_out,
        dp_table=result.dp_table,
    )


@app.get("/api/v1/presets")
def get_presets():
    """Sample datasets for demo / testing."""
    return {
        "presets": [
            {
                "label": "Balanced Mix",
                "budget": 100,
                "investments": [
                    {"name": "Tech Stocks", "cost": 30, "expected_return": 45, "risk_level": "high", "sector": "Technology"},
                    {"name": "Govt Bonds", "cost": 20, "expected_return": 22, "risk_level": "low", "sector": "Bonds"},
                    {"name": "Mutual Fund A", "cost": 25, "expected_return": 30, "risk_level": "medium", "sector": "Equity"},
                    {"name": "Fixed Deposit", "cost": 15, "expected_return": 17, "risk_level": "low", "sector": "Banking"},
                    {"name": "Real Estate", "cost": 50, "expected_return": 70, "risk_level": "medium", "sector": "Property"},
                    {"name": "Gold ETF", "cost": 20, "expected_return": 25, "risk_level": "low", "sector": "Commodities"},
                    {"name": "Startup Fund", "cost": 35, "expected_return": 60, "risk_level": "high", "sector": "Venture"},
                ],
            },
            {
                "label": "Conservative",
                "budget": 80,
                "investments": [
                    {"name": "PPF", "cost": 15, "expected_return": 17, "risk_level": "low", "sector": "Banking"},
                    {"name": "NSC", "cost": 10, "expected_return": 11, "risk_level": "low", "sector": "Banking"},
                    {"name": "Blue-chip Stocks", "cost": 30, "expected_return": 38, "risk_level": "medium", "sector": "Equity"},
                    {"name": "Debt Fund", "cost": 20, "expected_return": 23, "risk_level": "low", "sector": "Bonds"},
                    {"name": "Index Fund", "cost": 25, "expected_return": 32, "risk_level": "medium", "sector": "Equity"},
                ],
            },
        ]
    }
