import asyncio
import aiohttp
from datetime import datetime, timedelta, timezone
from typing import Any


class T0TopicAggregator:
    def __init__(self, db_pool, refresh_minutes: int = 15):
        self.db = db_pool
        self.refresh_interval = refresh_minutes * 60
        self.targets = {
            "polymarket": "https://clob.polymarket.com/markets",
            "kalshi": "https://api.kalshi.com/v2/markets"
        }

    async def start_scraping_loop(self):
        while True:
            print(f"[Market Hub] Refreshing T+0 pool every {self.refresh_interval / 60:.0f} minutes")
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=20)) as session:
                await asyncio.gather(
                    self._fetch_and_filter_polymarket(session),
                    self._fetch_and_filter_kalshi(session)
                )
            await asyncio.sleep(self.refresh_interval)

    async def _fetch_and_filter_polymarket(self, session: aiohttp.ClientSession):
        async with session.get(self.targets["polymarket"]) as resp:
            if resp.status != 200:
                return
            payload = await resp.json()

        now = datetime.now(timezone.utc)
        today_end = now.replace(hour=23, minute=59, second=59, microsecond=0)
        window_end = min(now + timedelta(hours=24), today_end)

        t0_markets: list[dict[str, Any]] = []
        for market in payload:
            raw = market.get("game_start_time")
            if not raw:
                continue
            end_date = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if now <= end_date <= window_end:
                t0_markets.append(market)

        await self._sync_to_active_pool("polymarket", t0_markets)

    async def _fetch_and_filter_kalshi(self, session: aiohttp.ClientSession):
        async with session.get(self.targets["kalshi"]) as resp:
            if resp.status != 200:
                return
            payload = await resp.json()

        now = datetime.now(timezone.utc)
        today_end = now.replace(hour=23, minute=59, second=59, microsecond=0)
        markets = payload.get("markets", [])

        t0_markets = []
        for market in markets:
            close_time = market.get("close_time")
            if not close_time:
                continue
            end_date = datetime.fromisoformat(close_time.replace("Z", "+00:00"))
            if now <= end_date <= today_end:
                t0_markets.append(market)

        await self._sync_to_active_pool("kalshi", t0_markets)

    async def _sync_to_active_pool(self, platform: str, rows: list[dict[str, Any]]):
        async with self.db.acquire() as conn:
            async with conn.transaction():
                for row in rows:
                    await conn.execute(
                        """
                        INSERT INTO polysmart_t0_event_pool(event_id, source_platform, title, end_time_utc)
                        VALUES($1, $2, $3, $4)
                        ON CONFLICT (event_id) DO UPDATE
                        SET source_platform = EXCLUDED.source_platform,
                            title = EXCLUDED.title,
                            end_time_utc = EXCLUDED.end_time_utc,
                            inserted_at = NOW()
                        """,
                        str(row.get("id") or row.get("ticker")),
                        platform,
                        str(row.get("question") or row.get("title") or "Unknown event"),
                        datetime.now(timezone.utc)
                    )
