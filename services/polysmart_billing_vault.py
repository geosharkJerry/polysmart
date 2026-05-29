from decimal import Decimal


class PolysmartBillingVault:
    def __init__(self, db_pool):
        self.db = db_pool

    async def process_trade_volume_charge(self, user_id: str, executed_volume_usd: Decimal):
        async with self.db.acquire() as conn:
            async with conn.transaction():
                profile = await conn.fetchrow(
                    """
                    SELECT p.billing_mode, p.volume_fee_rate, b.psc_balance
                    FROM polysmart_user_balance b
                    JOIN polysmart_billing_profile p ON b.user_id = p.user_id
                    WHERE b.user_id = $1
                    FOR UPDATE
                    """,
                    user_id
                )

                if not profile or profile["billing_mode"] != "SUBSCRIPTION":
                    return "BYPASS_VOLUME_CHARGE"

                fee_rate = Decimal(str(profile["volume_fee_rate"]))
                service_fee_psc = executed_volume_usd * fee_rate

                if profile["psc_balance"] < service_fee_psc:
                    await conn.execute(
                        "UPDATE polysmart_account_matrix SET status = 'quota_exhausted' WHERE user_id = $1",
                        user_id
                    )
                    return "INSUFFICIENT_TOKEN_HALT"

                await conn.execute(
                    "UPDATE polysmart_user_balance SET psc_balance = psc_balance - $1, updated_at = NOW() WHERE user_id = $2",
                    service_fee_psc,
                    user_id
                )
                await conn.execute(
                    "UPDATE polysmart_billing_profile SET total_traded_volume_usd = total_traded_volume_usd + $1 WHERE user_id = $2",
                    executed_volume_usd,
                    user_id
                )
                await conn.execute(
                    """
                    INSERT INTO polysmart_settlement_ledger(
                        settlement_id, user_id, event_id, billing_mode, traded_volume_usd, platform_revenue_usd
                    ) VALUES ($1, $2, $3, 'SUBSCRIPTION', $4, $5)
                    """,
                    f"SET-{user_id}",
                    user_id,
                    "REALTIME_FILL",
                    executed_volume_usd,
                    service_fee_psc
                )

                return "VOLUME_FEE_SUCCESS"
