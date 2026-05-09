# NexVest - Optimal Investment Portfolio Planner

**Course:** Design and Analysis of Algorithms
**Algorithm:** 0/1 Knapsack via Dynamic Programming
**Stack:** Python, FastAPI, HTML, CSS, Vanilla JS, Chart.js, GSAP, Tufte CSS

## Overview

NexVest is a web-based investment portfolio optimisation tool built around the classic 0/1 Knapsack algorithm. Given a set of investment options and a total budget, it computes the combination of investments that maximises expected returns using bottom-up dynamic programming.

The application supports live market data ingestion from Yahoo Finance for stocks and ETFs, and MFAPI.in for Indian mutual funds. This enables users to run the optimiser on real-world financial instruments using live market analyst target prices.

## Project Structure

```text
DAAMiniproject/
├── backend/
│   ├── __init__.py
│   └── data_fetcher.py         # Live data ingestion (yfinance, mfapi.in)
├── cache/
│   └── investments_cache.json  # Auto-generated cache, 1-hour TTL
├── knapsack.py                 # Core DP algorithm (0/1 Knapsack)
├── main.py                     # FastAPI application and API routes
├── requirements.txt
├── index.html                  # Frontend layout
├── style.css                   # Custom styling and Tufte overrides
├── script.js                   # Application logic, Canvas animations, and GSAP
└── README.md
```

## Setup and Usage

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the Server

```bash
uvicorn main:app --reload
```

### 3. Open the Application

Navigate to **http://127.0.0.1:8000** in any modern web browser.

## API Reference

All endpoints follow the `/api/v1/` versioning pattern.

| Method | Route                        | Description                                      |
|--------|------------------------------|--------------------------------------------------|
| GET    | `/`                          | Serves the frontend                              |
| GET    | `/api/v1/health`             | API health check                                 |
| POST   | `/api/v1/solve`              | Run the DP algorithm on submitted investments    |
| GET    | `/api/v1/presets`            | Load sample investment datasets                  |
| GET    | `/api/v1/categories`         | List predefined ticker/scheme categories         |
| GET    | `/api/v1/fetch-investments`  | Fetch live stock/ETF data from Yahoo Finance     |
| GET    | `/api/v1/fetch-mf`           | Fetch live mutual fund NAV data from MFAPI.in    |
| GET    | `/docs`                      | Auto-generated Swagger UI                        |

### Query Parameters

- `/api/v1/fetch-investments?tickers=RELIANCE.NS,TCS.NS,INFY.NS`
  Accepts comma-separated Yahoo Finance ticker symbols. Maximum 20 per request.

- `/api/v1/fetch-mf?scheme_codes=100033,119551`
  Accepts comma-separated MFAPI scheme codes. Maximum 20 per request.

## Algorithm Details

### 1. The 0/1 Knapsack DP Engine

The core of NexVest relies on the 0/1 Knapsack algorithm. Given a strict budget and a list of discrete investment options, the goal is to find the subset of investments that yields the maximum possible expected return.

**Mathematical Formulation:**
Let `W` be the total budget constraint.
Let `n` be the total number of available investments.
Let `cost[i]` and `return[i]` represent the cost and expected return of the `i`-th investment.

We construct a 2D dynamic programming matrix `dp` of size `(n + 1) x (W + 1)`, where `dp[i][w]` represents the maximum return achievable using a subset of the first `i` investments with a budget limit of `w`.

**Recurrence Relation:**
For each investment `i` and each capacity `w`, the algorithm evaluates two choices:
1. **Exclude the investment:** The maximum return remains `dp[i-1][w]`.
2. **Include the investment:** If the cost of the investment is less than or equal to `w`, the return is `return[i] + dp[i-1][w - cost[i]]`.

The state transition is defined as:
```text
if cost[i] <= w:
    dp[i][w] = max(dp[i-1][w], return[i] + dp[i-1][w - cost[i]])
else:
    dp[i][w] = dp[i-1][w]
```

**Backtracking for Selection:**
Once the matrix is fully populated, the maximum possible return is found at `dp[n][W]`. To determine the exact assets comprising this optimal portfolio, the algorithm backtracks from `dp[n][W]`. If `dp[i][w] != dp[i-1][w]`, it indicates that the `i`-th investment was included in the optimal set. The algorithm then subtracts `cost[i]` from the current budget `w` and continues tracing upwards until it reaches the base case.

**Complexity Analysis:**
- **Time Complexity:** O(n * W)
- **Space Complexity:** O(n * W). While space could be optimized to O(W) by only keeping the previous row in memory, NexVest intentionally preserves the entire `(n + 1) x (W + 1)` matrix to transmit to the frontend. This enables the visual "DP Tracing" feature in the UI.

### 2. Enhanced Portfolio Allocation (Round-Robin Diversification)

A known limitation of the strict 0/1 Knapsack algorithm in finance is that it outputs a binary selection (exactly one unit of an asset, or none). If an optimal selection leaves a large portion of the budget unused, simply running an unbounded knapsack (or greedy fractional fill) might heavily concentrate the remaining capital into a single high-ROI asset, increasing risk.

To solve this and mimic a realistic, diversified portfolio strategy, NexVest employs a **Round-Robin Quantity Fill** post-processing algorithm:

1. **Base Selection:** Start with the exact subset of assets selected by the 0/1 Knapsack algorithm (which mathematically guarantees the best structural combination of assets).
2. **Sort by ROI:** Rank these selected assets in descending order based on their Return on Investment (ROI).
3. **Iterative Distribution:** Loop continuously through the sorted list of selected assets (a round-robin queue).
4. **Unit Addition:** For each asset in the queue, check if the `remaining_budget` is greater than or equal to its unit cost. If so, purchase exactly one additional unit and subtract the cost from the remaining budget.
5. **Termination:** If a full pass through the queue results in zero additional units being purchased (because all remaining assets are too expensive), the loop terminates.

This deterministic approach ensures that excess capital is distributed as evenly as possible across the top-tier mathematical selections, maximizing expected returns while inherently enforcing diversification.

## Live Data Ingestion

### Data Sources and Logic

- **Yahoo Finance:** Used for stocks, ETFs, and index funds. The data fetcher extracts the `targetMeanPrice` (Analyst Target Price) to calculate the expected return. If target prices are unavailable, the system enforces a minimum 5% margin to guarantee a positive expected return.
- **MFAPI.in:** Used for Indian mutual fund NAV data. It leverages historical 1-year NAV comparisons to calculate average returns, again enforcing a 5% baseline.

### Caching

Results are cached locally with a one-hour time-to-live per ticker or scheme code. This prevents redundant external API calls, significantly speeds up user interactions, and avoids rate limiting.

## Frontend Architecture

The interface is built to resemble a high-end financial dashboard or research paper.

- **Design System:** Tufte CSS provides a typographically precise layout with margin notes explaining the algorithms in real-time. The results panel transitions into a dark theme for visual contrast.
- **Motion Design:** Powered by GSAP and ScrollTrigger. Features include a dynamic scrolling marquee, table row stagger animations, and chart scaling effects based on scroll position.
- **Ambient Canvas:** A custom HTML5 Canvas element renders a "DP Matrix Flow" background animation on the left side of the screen. This generative animation features scrolling binary data and organic sine waves, visually representing the dynamic programming computations.
- **Data Visualization:** Chart.js generates responsive bar and doughnut charts to analyze return-versus-cost and final budget allocations.
- **Modals:** A blurred-backdrop modal provides an immediate executive summary of the enhanced portfolio results before revealing the detailed mathematical trace.

## Scalability and Future Enhancements

- The `/api/v1/` prefix supports future API versioning.
- The core algorithm module (`knapsack.py`) is isolated from routing logic and can be updated independently.
- Risk-cap and sector-limit constraints can be introduced via existing hooks in the algorithm module.
- Authentication middleware and database integration can be seamlessly added to the FastAPI application layer.
