"""
Optimal Investment Portfolio Planner — Core DP Engine
Uses 0/1 Knapsack via Dynamic Programming.

Scalability notes:
- add_constraint() hooks allow future risk-cap, sector-limit extensions
- solve() returns a rich result dict — extend without breaking the API contract
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Investment:
    id: int
    name: str
    cost: int          # amount required (treat as integer units, e.g. thousands)
    expected_return: int  # expected return value
    risk_level: str    # "low" | "medium" | "high"
    sector: str = "general"
    description: str = ""


@dataclass
class PortfolioResult:
    selected: List[Investment]
    total_return: int
    total_cost: int
    budget: int
    remaining_budget: int
    dp_table: List[List[int]]          # full table for visualization
    roi_percent: float
    all_investments: List[Investment]  # for comparison chart


def solve(investments: List[Investment], budget: int) -> PortfolioResult:
    """
    0/1 Knapsack DP.
    Time:  O(n * W)
    Space: O(n * W)  — kept full for dp_table visualization; can be O(W) if needed
    """
    n = len(investments)
    W = budget

    # Build DP table: dp[i][w] = max return using first i items with budget w
    dp = [[0] * (W + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        inv = investments[i - 1]
        for w in range(W + 1):
            # Option 1: skip this investment
            dp[i][w] = dp[i - 1][w]
            # Option 2: include if it fits and improves return
            if inv.cost <= w:
                include = inv.expected_return + dp[i - 1][w - inv.cost]
                if include > dp[i][w]:
                    dp[i][w] = include

    # Backtrack to find selected investments
    selected = []
    w = W
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i - 1][w]:
            selected.append(investments[i - 1])
            w -= investments[i - 1].cost

    total_cost = sum(inv.cost for inv in selected)
    total_return = dp[n][W]
    roi = (total_return / total_cost * 100) if total_cost > 0 else 0.0

    return PortfolioResult(
        selected=selected,
        total_return=total_return,
        total_cost=total_cost,
        budget=budget,
        remaining_budget=budget - total_cost,
        dp_table=dp,
        roi_percent=round(roi, 2),
        all_investments=investments,
    )
