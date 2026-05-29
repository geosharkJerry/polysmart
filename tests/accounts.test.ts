import { describe, expect, it } from "vitest";
import { bindAccount, inspectCredential } from "@/lib/services/accounts";

describe("account vault", () => {
  it("stores encrypted credentials and can inspect decrypted payload", () => {
    const bind = bindAccount({
      userId: "user-alpha",
      platform: "kalshi",
      label: "kalshi test",
      proxyUrl: "socks5://proxy.example",
      credentials: { apiKey: "secret-key" }
    });

    const detail = inspectCredential(bind.account.accountId);
    expect(detail?.payload.apiKey).toBe("secret-key");
  });
});
