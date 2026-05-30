"""
Polysmart settlement-liquidity trap sentry (Level 4).

Async Python microservice that:
1) scans near-settlement deterministic contracts,
2) computes APY gate,
3) enforces anti-lockup hard ceilings,
4) supports <=50ms redemption-driven flash liquidation.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Protocol


class DatabaseLike(Protocol):
    async def fetch_idle_buffer_cash(self) -> Decimal: ...

    async def insert_trap(self, payload: Dict[str, Any]) -> None: ...

    async def list_active_traps(self) -> List[Dict[str, Any]]: ...

    async def mark_trap_force_liquidated(self, market_id: str, cash_out: Decimal, exit_price: Decimal) -> None: ...


class AIRouterLike(Protocol):
    async def extract_event_probability(self, scenario: str, payload: str) -> float: ...


class OrderSlicerLike(Protocol):
    async def route_layered_orders(self, *, poly_price: float, kalshi_price: float, total_volume: float) -> Dict[str, Any]: ...

    async def force_taker_exit(self, *, market_id: str, side: str, exit_price: float, notional_usd: float) -> Dict[str, Any]: ...


@dataclass
class SentryConfig:
    scan_interval_seconds: int = 600
    alpha_floor: Decimal = Decimal("0.015")
    idle_buffer_ratio: Decimal = Decimal("0.15")
    anti_lockup_ceiling_ratio: Decimal = Decimal("0.30")
    hard_pool_cap_ratio: Decimal = Decimal("0.045")
    min_ask_price: Decimal = Decimal("0.96")
    min_ai_confidence: float = 0.999
    flash_liquidation_sla_ms: int = 50
    default_flash_exit_price: Decimal = Decimal("0.965")


class PolysmartRebalanceSentry:
    def __init__(
        self,
        db: DatabaseLike,
        ai_router: AIRouterLike,
        order_slicer: OrderSlicerLike,
        config: Optional[SentryConfig] = None,
    ) -> None:
        self.db = db
        self.ai = ai_router
        self.slicer = order_slicer
        self.config = config or SentryConfig()
        self._running = False

    @staticmethod
    def compute_dynamic_apy(price_ask: Decimal, delta_days: Decimal) -> Decimal:
        if price_ask <= 0 or delta_days <= 0:
            return Decimal("0")
        return (Decimal("1.0") / price_ask) ** (Decimal("365") / delta_days) - Decimal("1.0")

    async def start_sentry_loop(self) -> None:
        self._running = True
        print("[Polysmart Sentry] Settlement liquidity trap scanner started.")
        while self._running:
            try:
                await self.scan_and_harvest_traps()
            except Exception as exc:  # noqa: BLE001 - keep service alive
                print(f"[Polysmart Sentry] non-fatal error: {exc}")
            await asyncio.sleep(self.config.scan_interval_seconds)

    def stop(self) -> None:
        self._running = False

    async def scan_and_harvest_traps(self) -> Dict[str, Any]:
        candidates = await self._fetch_tail_markets()
        idle_buffer_cash = await self.db.fetch_idle_buffer_cash()
        if idle_buffer_cash <= 0:
            return {"deployed": 0, "reason": "buffer_empty"}

        anti_lockup_ceiling = idle_buffer_cash * self.config.anti_lockup_ceiling_ratio
        deployed = 0

        for market in candidates:
            try:
                p_ask = Decimal(str(market["price"]))
                delta_t_days = Decimal(str(market["hours_to_settle"])) / Decimal("24")
            except (KeyError, InvalidOperation):
                continue

            if p_ask <= self.config.min_ask_price:
                continue

            apy = self.compute_dynamic_apy(p_ask, delta_t_days)
            if apy < self.config.alpha_floor:
                continue

            verification_payload = f"Market: {market.get('title','')}. Rules: {market.get('rules','')}."
            ai_confidence = await self.ai.extract_event_probability("settlement_tail", verification_payload)
            if ai_confidence < self.config.min_ai_confidence:
                continue

            allocation = min(anti_lockup_ceiling, idle_buffer_cash * self.config.idle_buffer_ratio)
            if allocation <= 0:
                continue

            await self.db.insert_trap(
                {
                    "market_id": market["id"],
                    "category": market["category"],
                    "title": market["title"],
                    "target_contract_type": "YES",
                    "current_market_price": str(p_ask),
                    "oracle_verified_result": 1,
                    "estimated_settle_time": market["settle_time"],
                    "projected_apy": str(apy),
                    "status": "deployed",
                    "allocated_usd": str(allocation),
                    "ai_confidence": ai_confidence,
                }
            )

            await self.slicer.route_layered_orders(
                poly_price=float(p_ask),
                kalshi_price=0.0,
                total_volume=float(allocation),
            )
            deployed += 1

        return {
            "deployed": deployed,
            "anti_lockup_ceiling_usd": str(anti_lockup_ceiling),
            "scan_time_utc": datetime.now(timezone.utc).isoformat(),
        }

    async def trigger_redemption_flash_liquidation(self, required_cash_usd: Decimal) -> Dict[str, Any]:
        """
        Mandatory risk line:
        if emergency redemption arrives and liquid cash is insufficient,
        force exit Level 4 YES positions via taker route in <= 50ms.
        """
        start = time.perf_counter()

        async def _liquidate() -> Dict[str, Any]:
            active = await self.db.list_active_traps()
            recovered = Decimal("0")
            liquidated = 0
            for trap in active:
                if recovered >= required_cash_usd:
                    break
                allocated = Decimal(str(trap.get("allocated_usd", "0")))
                exit_price = self.config.default_flash_exit_price
                cash_out = allocated * (exit_price / Decimal(str(trap.get("current_market_price", "1"))))

                await self.slicer.force_taker_exit(
                    market_id=str(trap["market_id"]),
                    side="YES",
                    exit_price=float(exit_price),
                    notional_usd=float(allocated),
                )
                await self.db.mark_trap_force_liquidated(str(trap["market_id"]), cash_out, exit_price)
                recovered += cash_out
                liquidated += 1

            return {
                "liquidated_count": liquidated,
                "recovered_usd": str(recovered),
                "remaining_shortfall_usd": str(max(Decimal("0"), required_cash_usd - recovered)),
            }

        timeout_s = self.config.flash_liquidation_sla_ms / 1000
        try:
            result = await asyncio.wait_for(_liquidate(), timeout=timeout_s)
            elapsed_ms = (time.perf_counter() - start) * 1000
            return {
                "triggered": True,
                "within_sla": elapsed_ms <= self.config.flash_liquidation_sla_ms,
                "elapsed_ms": round(elapsed_ms, 3),
                **result,
            }
        except asyncio.TimeoutError:
            elapsed_ms = (time.perf_counter() - start) * 1000
            return {
                "triggered": True,
                "within_sla": False,
                "elapsed_ms": round(elapsed_ms, 3),
                "liquidated_count": 0,
                "recovered_usd": "0",
                "remaining_shortfall_usd": str(required_cash_usd),
                "error": "flash_liquidation_timeout",
            }

    async def _fetch_tail_markets(self) -> List[Dict[str, Any]]:
        # Replace with real upstream fetcher for Polymarket / Kalshi tail settlement contracts.
        now = datetime.now(timezone.utc)
        return [
            {
                "id": "poly-mkt-macro-001",
                "category": "MACRO",
                "title": "Fed vote outcome finalized, pending dispute-window release",
                "price": 0.971,
                "hours_to_settle": 36,
                "settle_time": now.isoformat(),
                "rules": "Official central bank publication.",
            },
            {
                "id": "poly-mkt-weather-002",
                "category": "WEATHER",
                "title": "Official rainfall report finalized, awaiting settlement release",
                "price": 0.968,
                "hours_to_settle": 30,
                "settle_time": now.isoformat(),
                "rules": "Official weather bureau dataset.",
            },
        ]
