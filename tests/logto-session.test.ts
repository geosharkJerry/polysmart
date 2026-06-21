import { beforeEach, describe, expect, it, vi } from "vitest";

const d1First = vi.fn();
const d1Batch = vi.fn();
const getOptionalD1 = vi.fn();

vi.mock("@/lib/db/d1", () => ({
  d1First,
  d1Batch,
  getOptionalD1
}));

describe("createLocalLogtoSession", () => {
  beforeEach(() => {
    vi.resetModules();
    d1First.mockReset();
    d1Batch.mockReset();
    getOptionalD1.mockReset();
  });

  it("does not mark a Logto member as verified unless Logto confirms email verification", async () => {
    const statements: Array<{ sql: string; bindings: unknown[] }> = [];
    const db = {
      prepare(sql: string) {
        return {
          bind(...bindings: unknown[]) {
            statements.push({ sql, bindings });
            return { sql, bindings } as unknown as D1PreparedStatement;
          }
        };
      }
    };

    getOptionalD1.mockResolvedValue(db);
    d1First.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM subscription_plans")) {
        return {
          plan_id: "agent-pro",
          service_type: "SELF_SERVICE",
          billing_mode: "SUBSCRIPTION",
          included_points: 2000
        };
      }

      if (sql.includes("FROM users")) {
        return null;
      }

      return null;
    });
    d1Batch.mockResolvedValue(null);

    const { createLocalLogtoSession } = await import("@/lib/services/logto-session");
    await createLocalLogtoSession({
      surface: "member",
      subject: "logto-member-2",
      provider: "LOGTO",
      email: "member@example.com",
      emailVerified: false,
      planId: "agent-pro",
      billingCycle: "MONTHLY"
    });

    const userInsert = statements.find((statement) => statement.sql.includes("INSERT INTO users"));
    expect(userInsert).toBeDefined();
    expect(userInsert?.bindings[4]).toBeNull();
  });

  it("stores a verified timestamp when Logto confirms the member email is verified", async () => {
    const statements: Array<{ sql: string; bindings: unknown[] }> = [];
    const db = {
      prepare(sql: string) {
        return {
          bind(...bindings: unknown[]) {
            statements.push({ sql, bindings });
            return { sql, bindings } as unknown as D1PreparedStatement;
          }
        };
      }
    };

    getOptionalD1.mockResolvedValue(db);
    d1First.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM subscription_plans")) {
        return {
          plan_id: "agent-pro",
          service_type: "SELF_SERVICE",
          billing_mode: "SUBSCRIPTION",
          included_points: 2000
        };
      }

      if (sql.includes("FROM users")) {
        return null;
      }

      return null;
    });
    d1Batch.mockResolvedValue(null);

    const { createLocalLogtoSession } = await import("@/lib/services/logto-session");
    await createLocalLogtoSession({
      surface: "member",
      subject: "logto-member-3",
      provider: "LOGTO",
      email: "member@example.com",
      emailVerified: true,
      planId: "agent-pro",
      billingCycle: "MONTHLY"
    });

    const userInsert = statements.find((statement) => statement.sql.includes("INSERT INTO users"));
    expect(userInsert).toBeDefined();
    expect(typeof userInsert?.bindings[4]).toBe("string");
    expect(String(userInsert?.bindings[4])).toContain("T");
  });
});
