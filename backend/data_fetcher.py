"""
Live Data Fetcher — Stock / ETF / Mutual Fund data ingestion layer.

Uses:
  - yfinance (Yahoo Finance, no API key)
  - mfapi.in (free REST API for Indian MF NAVs)

Returns dicts matching the InvestmentIn schema used by the /api/v1/solve endpoint.
All results are cached to cache/investments_cache.json with a 1-hour TTL.
"""

import json
import os
import time
import math
import logging
from typing import List, Dict, Optional
from datetime import datetime

import yfinance as yf
import requests

logger = logging.getLogger(__name__)

# ── Cache config ──────────────────────────────────────────────────────────────

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache")
CACHE_FILE = os.path.join(CACHE_DIR, "investments_cache.json")
CACHE_TTL = 3600  # 1 hour in seconds


def _read_cache() -> dict:
    """Read the full cache file. Returns {} if missing or corrupt."""
    if not os.path.exists(CACHE_FILE):
        return {}
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def _write_cache(cache: dict) -> None:
    """Write the full cache dict to disk."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)


def _cache_get(key: str) -> Optional[dict]:
    """Return cached entry if it exists and is within TTL, else None."""
    cache = _read_cache()
    entry = cache.get(key)
    if entry and (time.time() - entry.get("timestamp", 0)) < CACHE_TTL:
        return entry["data"]
    return None


def _cache_set(key: str, data: dict) -> None:
    """Write a single entry into the cache."""
    cache = _read_cache()
    cache[key] = {"data": data, "timestamp": time.time()}
    _write_cache(cache)


# ── Risk classification ──────────────────────────────────────────────────────

def _classify_risk(annualised_vol: float) -> str:
    """Classify risk based on annualised volatility percentage."""
    if annualised_vol < 15:
        return "low"
    elif annualised_vol <= 30:
        return "medium"
    else:
        return "high"


# ── Stock / ETF fetching via yfinance ────────────────────────────────────────

def fetch_stock_data(tickers: List[str]) -> List[dict]:
    """
    Fetch stock/ETF data for the given Yahoo Finance ticker symbols.
    Returns a list of dicts compatible with InvestmentIn schema.
    """
    results = []

    for ticker_str in tickers:
        ticker_str = ticker_str.strip().upper()
        if not ticker_str:
            continue

        # Check cache first
        cache_key = f"stock:{ticker_str}"
        cached = _cache_get(cache_key)
        if cached:
            results.append(cached)
            continue

        try:
            ticker = yf.Ticker(ticker_str)

            # Get 1-year historical data
            hist = ticker.history(period="1y")
            if hist.empty or len(hist) < 10:
                logger.warning(f"Insufficient data for {ticker_str}, skipping.")
                continue

            # Current price (last close)
            current_price = float(hist["Close"].iloc[-1])

            # Calculate daily returns and annualised metrics
            daily_returns = hist["Close"].pct_change().dropna()

            # Average annual return (compounded from daily mean)
            avg_daily_return = float(daily_returns.mean())
            trading_days = 252
            avg_annual_return = (1 + avg_daily_return) ** trading_days - 1

            # Annualised volatility
            daily_vol = float(daily_returns.std())
            annual_vol = daily_vol * math.sqrt(trading_days) * 100  # as percentage

            # Cost = current price in ₹ (rounded to nearest integer)
            cost = max(1, round(current_price))

            # Sector from info
            info = ticker.info or {}
            sector = info.get("sector", info.get("category", "General"))
            if not sector:
                sector = "General"

            # Expected return: prefer analyst target price (forward-looking)
            target_price = info.get("targetMeanPrice", None)
            if target_price and target_price > current_price:
                expected_return = round(target_price)
            else:
                # Fall back to historical return, with 5% minimum margin
                historical_return = round(cost * (1 + avg_annual_return))
                expected_return = max(round(cost * 1.05), historical_return)

            # Risk level
            risk_level = _classify_risk(annual_vol)

            # Company name
            name = info.get("shortName", info.get("longName", ticker_str))
            if not name:
                name = ticker_str

            investment = {
                "name": name[:60],
                "cost": cost,
                "expected_return": expected_return,
                "risk_level": risk_level,
                "sector": sector[:40],
                "description": f"Live: {ticker_str} | Price: ₹{current_price:.2f} | Vol: {annual_vol:.1f}%",
            }

            _cache_set(cache_key, investment)
            results.append(investment)

        except Exception as e:
            logger.error(f"Failed to fetch {ticker_str}: {e}")
            continue

    return results


# ── Mutual Fund fetching via mfapi.in ────────────────────────────────────────

MFAPI_BASE = "https://api.mfapi.in/mf"


def fetch_mf_data(scheme_codes: List[str]) -> List[dict]:
    """
    Fetch mutual fund NAV data from mfapi.in.
    Returns a list of dicts compatible with InvestmentIn schema.
    """
    results = []

    for code in scheme_codes:
        code = code.strip()
        if not code:
            continue

        # Check cache first
        cache_key = f"mf:{code}"
        cached = _cache_get(cache_key)
        if cached:
            results.append(cached)
            continue

        try:
            resp = requests.get(f"{MFAPI_BASE}/{code}", timeout=10)
            resp.raise_for_status()
            data = resp.json()

            meta = data.get("meta", {})
            navs = data.get("data", [])

            if not navs or len(navs) < 10:
                logger.warning(f"Insufficient NAV data for scheme {code}, skipping.")
                continue

            # Fund name
            name = meta.get("scheme_name", f"MF Scheme {code}")

            # Current NAV
            current_nav = float(navs[0]["nav"])

            # Find NAV from ~1 year ago
            # NAVs are sorted newest first, try to find entry ~365 days back
            latest_date = datetime.strptime(navs[0]["date"], "%d-%m-%Y")
            old_nav = None
            for entry in navs:
                entry_date = datetime.strptime(entry["date"], "%d-%m-%Y")
                diff = (latest_date - entry_date).days
                if diff >= 350:
                    old_nav = float(entry["nav"])
                    break

            if old_nav is None:
                # Use the oldest available
                old_nav = float(navs[-1]["nav"])

            # Annual return
            if old_nav > 0:
                annual_return = (current_nav - old_nav) / old_nav
            else:
                annual_return = 0

            # Volatility — compute from daily NAV changes (approximate)
            nav_values = []
            for entry in navs[:min(252, len(navs))]:
                try:
                    nav_values.append(float(entry["nav"]))
                except (ValueError, KeyError):
                    continue

            if len(nav_values) >= 10:
                nav_values.reverse()  # oldest first
                daily_returns = []
                for i in range(1, len(nav_values)):
                    if nav_values[i - 1] > 0:
                        daily_returns.append(
                            (nav_values[i] - nav_values[i - 1]) / nav_values[i - 1]
                        )
                if daily_returns:
                    mean_ret = sum(daily_returns) / len(daily_returns)
                    variance = sum((r - mean_ret) ** 2 for r in daily_returns) / len(daily_returns)
                    daily_vol = math.sqrt(variance)
                    annual_vol = daily_vol * math.sqrt(252) * 100
                else:
                    annual_vol = 15  # default medium
            else:
                annual_vol = 15

            # Cost = NAV in ₹ (rounded to nearest integer), minimum 1
            cost = max(1, round(current_nav))

            # Expected return, floored at 5% above cost
            historical_return = round(cost * (1 + annual_return))
            expected_return = max(round(cost * 1.05), historical_return)

            # Risk
            risk_level = _classify_risk(annual_vol)

            # Sector / category
            category = meta.get("scheme_category", "Mutual Fund")
            fund_house = meta.get("fund_house", "")

            investment = {
                "name": name[:60],
                "cost": cost,
                "expected_return": expected_return,
                "risk_level": risk_level,
                "sector": category[:40] if category else "Mutual Fund",
                "description": f"Live MF: {code} | NAV: ₹{current_nav:.2f} | {fund_house[:30]}",
            }

            _cache_set(cache_key, investment)
            results.append(investment)

        except Exception as e:
            logger.error(f"Failed to fetch MF scheme {code}: {e}")
            continue

    return results


# ── Predefined categories ────────────────────────────────────────────────────

CATEGORIES = {
    "Top IT Stocks": {
        "type": "stocks",
        "tickers": ["INFY.NS", "TCS.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS"],
    },
    "Banking Stocks": {
        "type": "stocks",
        "tickers": ["HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS", "AXISBANK.NS"],
    },
    "Gold & Commodities": {
        "type": "stocks",
        "tickers": ["GLD", "SLV", "GOLDBEES.NS"],
    },
    "Top Mutual Funds": {
        "type": "mf",
        "scheme_codes": ["100033", "119551", "120503", "118989"],
    },
}


def get_categories() -> dict:
    """Return the predefined category definitions."""
    return CATEGORIES
